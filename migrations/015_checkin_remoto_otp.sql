-- 015_checkin_remoto_otp.sql — Check-in remoto del peregrino con OTP por email
-- Ejecutar en SQL Editor de Supabase (proyecto fyhehiqvygbabwwllpvb)
-- Idempotente. Requiere 007 (app_secrets, pgcrypto, generate_peregrino_token) y 014 (patrón email).
-- Diseño: tarea-kimi-peregrino-checkin-remoto-otp.md v3 (decisiones (a)-(d) de Pablo/socia).
--
-- Regla legal fijada en el diseño: el OTP completa la RECOGIDA Y VERIFICACIÓN de datos
-- (válido por AEPD 17/06/2025), pero NO la entrada. La entrada (entrada_at, que dispara
-- el plazo de 24h del parte de viajeros hacia SES) la marca registrar_entrada_peregrino
-- (Fase C), no esta migración. Aquí solo: verificado_otp_at.

-- 1. Estado del check-in remoto en huespedes (némesis H2: bastan 3 columnas, no dos filas)
alter table public.huespedes add column if not exists reservation_id uuid references public.reservations(id);
alter table public.huespedes add column if not exists verificado_otp_at timestamptz;
alter table public.huespedes add column if not exists entrada_at timestamptz;
-- Estado "pre-verificado, entrada pendiente" = verificado_otp_at not null and entrada_at is null

-- 2. Códigos OTP pendientes. RLS total como app_secrets: solo funciones security definer.
create table if not exists public.checkin_otp (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  codigo_hash    text not null,          -- hmac(codigo || ':' || reservation_id, peregrino_hmac_secret)
  expira         timestamptz not null,   -- 10 minutos
  usado          boolean not null default false,
  intentos       int not null default 0, -- fallos de verificación; a los 5 el código muere
  created_at     timestamptz not null default now()
);

alter table public.checkin_otp enable row level security;
-- Sin policies a propósito: denegación total vía API (mismo patrón que app_secrets).

create index if not exists checkin_otp_reservation_idx
  on public.checkin_otp (reservation_id, created_at desc);

-- 3. request_checkin_otp: pide un código OTP para la reserva. Callable por anon (el peregrino
--    no tiene cuenta). Throttle (némesis H5): 1 código/minuto y máx. 5/día por reserva,
--    para que un reservation_id filtrado no sea un vector de email-bombing al huésped.
create or replace function public.request_checkin_otp(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  v_codigo text;
  v_secret text;
  v_service_key text;
  v_email_mask text;
begin
  select res.id, res.hostal_id, res.guest_name, res.guest_email, res.checkin, res.checkout,
         res.status, h.name as hostal_name
    into r
    from public.reservations res
    join public.hostales h on h.id = res.hostal_id
   where res.id = p_reservation_id;

  -- Mensaje genérico (anti-enumeración): inexistente, cancelada o sin email devuelven lo mismo
  if not found or r.status = 'cancelada' or r.guest_email is null then
    return jsonb_build_object('exito', false, 'error', 'no se pudo enviar el código');
  end if;

  -- Ya completado en alguna fase: mensajes claros (el reservation_id es un UUIDv4 no
  -- adivinable; el poseedor del enlace es el legítimo en la práctica — riesgo aceptado v3)
  if exists (select 1 from public.huespedes
              where reservation_id = p_reservation_id and entrada_at is not null) then
    return jsonb_build_object('exito', false, 'error', 'la entrada de esta reserva ya está registrada');
  end if;
  if exists (select 1 from public.huespedes
              where reservation_id = p_reservation_id and verificado_otp_at is not null) then
    return jsonb_build_object('exito', false, 'error', 'el check-in online de esta reserva ya está verificado');
  end if;

  -- Ventana horaria (decisión (b) v3): desde las 12:00 del día anterior a checkin,
  -- hasta que llegue checkout (la entrada ya se cubre arriba)
  if now() < (r.checkin::timestamp - interval '12 hours') then
    return jsonb_build_object('exito', false, 'error',
      'el check-in online se activa a las 12:00 del día anterior a tu llegada');
  end if;
  if current_date > r.checkout then
    return jsonb_build_object('exito', false, 'error', 'el plazo de check-in online de esta reserva ha terminado');
  end if;

  -- Throttle H5
  if exists (select 1 from public.checkin_otp
              where reservation_id = p_reservation_id
                and created_at > now() - interval '1 minute') then
    return jsonb_build_object('exito', false, 'error', 'espera un minuto antes de pedir otro código');
  end if;
  if (select count(*) from public.checkin_otp
       where reservation_id = p_reservation_id
         and created_at > now() - interval '24 hours') >= 5 then
    return jsonb_build_object('exito', false, 'error', 'has superado el máximo de códigos por hoy');
  end if;

  -- Invalida códigos anteriores y genera uno nuevo (6 dígitos, expira en 10 min)
  update public.checkin_otp set usado = true
   where reservation_id = p_reservation_id and not usado;

  v_codigo := lpad((floor(random() * 1000000))::int::text, 6, '0');
  select value into v_secret from public.app_secrets where key = 'peregrino_hmac_secret';

  insert into public.checkin_otp (reservation_id, codigo_hash, expira)
  values (p_reservation_id,
          encode(hmac(v_codigo || ':' || p_reservation_id::text, v_secret, 'sha256'), 'hex'),
          now() + interval '10 minutes');

  -- Envío por la vía ya probada en producción (patrón exacto de la migración 014):
  -- pg_net -> send-email (template 'checkin_otp'). Best-effort: si el envío falla,
  -- el peregrino puede pedir otro código pasado 1 minuto.
  begin
    select value into v_service_key from public.app_secrets where key = 'service_role_key';
    if v_service_key is not null then
      perform net.http_post(
        url := 'https://fyhehiqvygbabwwllpvb.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key,
          'apikey', v_service_key
        ),
        body := jsonb_build_object(
          'to', r.guest_email,
          'template', 'checkin_otp',
          'variables', jsonb_build_object(
            'guestName', r.guest_name,
            'hostalName', r.hostal_name,
            'codigo', v_codigo
          ),
          'hostal_id', r.hostal_id
        ),
        timeout_milliseconds := 5000
      );
    end if;
  exception when others then
    null;
  end;

  v_email_mask := coalesce(substring(r.guest_email from 1 for 2), '')
                  || '***@' || split_part(r.guest_email, '@', 2);

  -- Datos mínimos para pre-rellenar el formulario (Fase B). Nada que el propio
  -- huésped no sepa ya; el reservation_id UUIDv4 actúa como capacidad (riesgo aceptado).
  return jsonb_build_object(
    'exito', true,
    'email_mask', v_email_mask,
    'guest_name', r.guest_name,
    'hostal_name', r.hostal_name,
    'checkin', r.checkin,
    'checkout', r.checkout
  );
exception when others then
  return jsonb_build_object('exito', false, 'error', 'no se pudo enviar el código');
end;
$$;

revoke all on function public.request_checkin_otp(uuid) from public;
grant execute on function public.request_checkin_otp(uuid) to anon, authenticated;

-- 4. confirm_checkin_otp: valida el código y, si es correcto, hace upsert en huespedes
--    (datos legales Anexo I + verificado_otp_at; entrada_at queda NULL — la entrada la
--    marca Fase C) y devuelve el token del QR (mismo mecanismo HMAC de la 007).
create or replace function public.confirm_checkin_otp(
  p_reservation_id uuid,
  p_codigo text,
  p_datos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  o record;
  v_secret text;
  v_esperado text;
begin
  -- Código activo más reciente de la reserva
  select * into o
    from public.checkin_otp
   where reservation_id = p_reservation_id
     and not usado
   order by created_at desc
   limit 1;

  -- Un único mensaje genérico para: sin código, caducado, incorrecto (test de aceptación 3)
  if not found or o.expira < now() then
    return jsonb_build_object('exito', false, 'error', 'código incorrecto o caducado');
  end if;

  -- Anti fuerza bruta: a los 5 intentos fallidos el código muere
  if o.intentos >= 5 then
    update public.checkin_otp set usado = true where id = o.id;
    return jsonb_build_object('exito', false, 'error', 'código incorrecto o caducado');
  end if;

  select value into v_secret from public.app_secrets where key = 'peregrino_hmac_secret';
  v_esperado := encode(hmac(p_codigo || ':' || p_reservation_id::text, v_secret, 'sha256'), 'hex');

  -- Mismo riesgo aceptado que en verify_peregrino_session (007): comparación no constante
  -- en tiempo, inviable de explotar tras el jitter de red de HTTPS/REST
  if p_codigo is null or v_esperado <> o.codigo_hash then
    update public.checkin_otp set intentos = intentos + 1 where id = o.id;
    return jsonb_build_object('exito', false, 'error', 'código incorrecto o caducado');
  end if;

  -- Datos mínimos obligatorios del Anexo I
  if p_datos is null
     or coalesce(p_datos->>'nombre', '') = ''
     or coalesce(p_datos->>'apellidos', '') = ''
     or coalesce(p_datos->>'tipo_documento', '') not in ('D', 'N', 'P', 'I', 'X')
     or coalesce(p_datos->>'num_documento', '') = ''
     or coalesce(p_datos->>'fecha_nacimiento', '') = ''
     or coalesce(p_datos->>'pais_nacionalidad', '') = '' then
    return jsonb_build_object('exito', false, 'error', 'faltan datos obligatorios del formulario');
  end if;

  select id, hostal_id, guest_email, checkout, payment_method
    into r
    from public.reservations
   where id = p_reservation_id;
  if not found then
    return jsonb_build_object('exito', false, 'error', 'código incorrecto o caducado');
  end if;

  begin
    -- Upsert por (hostal_id, num_documento) — decisión (d) v3, mismo patrón que skill-policia:
    -- huésped que repite albergue actualiza su fila y resetea entrada_at para la nueva estancia
    insert into public.huespedes (
      hostal_id, reservation_id, nombre, apellidos, tipo_documento, num_documento,
      fecha_nacimiento, pais_nacionalidad, sexo, direccion, localidad, pais_residencia,
      telefono, email, fecha_caducidad_doc, num_soporte_doc,
      referencia_contrato, tipo_pago, num_viajeros, verificado_otp_at, entrada_at
    ) values (
      r.hostal_id, p_reservation_id,
      p_datos->>'nombre', p_datos->>'apellidos', p_datos->>'tipo_documento', p_datos->>'num_documento',
      (p_datos->>'fecha_nacimiento')::date, p_datos->>'pais_nacionalidad',
      nullif(p_datos->>'sexo', ''), nullif(p_datos->>'direccion', ''),
      nullif(p_datos->>'localidad', ''), nullif(p_datos->>'pais_residencia', ''),
      nullif(p_datos->>'telefono', ''), coalesce(nullif(p_datos->>'email', ''), r.guest_email),
      nullif(p_datos->>'fecha_caducidad_doc', '')::date, nullif(p_datos->>'num_soporte_doc', ''),
      p_reservation_id::text, r.payment_method, 1, now(), null
    )
    on conflict (hostal_id, num_documento) do update set
      reservation_id       = excluded.reservation_id,
      nombre               = excluded.nombre,
      apellidos            = excluded.apellidos,
      tipo_documento       = excluded.tipo_documento,
      fecha_nacimiento     = excluded.fecha_nacimiento,
      pais_nacionalidad    = excluded.pais_nacionalidad,
      sexo                 = excluded.sexo,
      direccion            = excluded.direccion,
      localidad            = excluded.localidad,
      pais_residencia      = excluded.pais_residencia,
      telefono             = excluded.telefono,
      email                = excluded.email,
      fecha_caducidad_doc  = excluded.fecha_caducidad_doc,
      num_soporte_doc      = excluded.num_soporte_doc,
      referencia_contrato  = excluded.referencia_contrato,
      tipo_pago            = excluded.tipo_pago,
      verificado_otp_at    = excluded.verificado_otp_at,
      entrada_at           = null;
  exception when others then
    return jsonb_build_object('exito', false, 'error', 'datos inválidos, revisa el formulario');
  end;

  -- Consumir el código solo tras un upsert correcto
  update public.checkin_otp set usado = true where id = o.id;

  -- Token del QR: MISMA fórmula que generate_peregrino_token (007). No se llama a la RPC
  -- directamente porque exige authenticated/service_role y aquí el caller es anon; se
  -- reutiliza el mecanismo y el secreto, sin tocar el diseño de la 007.
  return jsonb_build_object(
    'exito', true,
    'reservation_id', p_reservation_id,
    'token', encode(hmac(p_reservation_id::text || ':' || r.checkout::text, v_secret, 'sha256'), 'hex'),
    'expira', (r.checkout + 1)::text
  );
exception when others then
  return jsonb_build_object('exito', false, 'error', 'código incorrecto o caducado');
end;
$$;

revoke all on function public.confirm_checkin_otp(uuid, text, jsonb) from public;
grant execute on function public.confirm_checkin_otp(uuid, text, jsonb) to anon, authenticated;

-- Verificación tras aplicar (anon key):
-- select public.request_checkin_otp('<uuid-reserva>');                 -- exito + email_mask
-- select public.confirm_checkin_otp('<uuid-reserva>', '000000', '{}'); -- error genérico

-- ============================================================
-- 027_mensajes_genericos_anti_enumeracion.sql
-- Auditoría seguridad 2026-09-10 — B-1 (shared/auditoria-seguridad-hosteleria.md)
--
-- Oráculo de enumeración: con un reservation_id se distinguía "inexistente"
-- de "existente en estado X" por el mensaje. Ahora TODAS las ramas de error
-- de negocio de cada RPC devuelven UN único mensaje genérico (patrón de
-- verify_peregrino_session). Excepciones deliberadas (no son oráculo):
--   * throttles de OTP ("espera un minuto", "máximo de códigos"): solo se
--     alcanzan con reserva existente en ventana — la misma clase de estado
--     que un exito:true ya revela — y son necesarios para la UX legítima.
--   * "faltan datos obligatorios" / "datos inválidos" en guardar_datos_checkin:
--     validan el payload del formulario, no el estado de la reserva.
--   * "firma no configurada" en firma_remota_estado: error de configuración
--     del sistema, deliberadamente distinto (018).
-- Cuerpos idénticos a 015/018/020 salvo los mensajes unificados.
-- Mismo patrón: security definer + revoke all from public + grant explícito.
-- ============================================================

-- 1. request_checkin_otp (base 015): un solo mensaje para inexistente,
--    cancelada, sin email, entrada registrada, ya verificado y fuera de ventana.
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

  -- Mensaje genérico ÚNICO (B-1): inexistente, cancelada, sin email, entrada
  -- ya registrada, check-in ya verificado o fuera de ventana devuelven lo mismo
  if not found or r.status = 'cancelada' or r.guest_email is null
     or exists (select 1 from public.huespedes
                 where reservation_id = p_reservation_id and entrada_at is not null)
     or exists (select 1 from public.huespedes
                 where reservation_id = p_reservation_id and verificado_otp_at is not null)
     or now() < (r.checkin::timestamp - interval '12 hours')
     or current_date > r.checkout then
    return jsonb_build_object('exito', false, 'error', 'no se pudo enviar el código');
  end if;

  -- Throttles: solo alcanzables con reserva existente en ventana (ver cabecera)
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

  -- Datos mínimos para pre-rellenar el formulario. Nada que el propio
  -- huésped no sepa ya; el reservation_id UUIDv4 actúa como capacidad.
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

-- 2. guardar_datos_checkin (base 020): un solo mensaje para inexistente,
--    cancelada, fuera de ventana, OTP no verificado y entrada registrada.
create or replace function public.guardar_datos_checkin(
  p_reservation_id uuid,
  p_datos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  v_verificado_at timestamptz;
  v_secret text;
begin
  select id, hostal_id, guest_email, checkin, checkout, status, payment_method
    into r
    from public.reservations
   where id = p_reservation_id;

  select verificado_at into v_verificado_at
    from public.checkin_otp
   where reservation_id = p_reservation_id
     and verificado_at is not null
   order by verificado_at desc
   limit 1;

  -- Mensaje genérico ÚNICO (B-1): inexistente, cancelada, fuera de la ventana
  -- del check-in online, OTP sin verificar o entrada ya registrada
  if not found or r.status = 'cancelada'
     or now() < (r.checkin::timestamp - interval '12 hours')
     or current_date > r.checkout
     or v_verificado_at is null
     or exists (select 1 from public.huespedes
                 where reservation_id = p_reservation_id and entrada_at is not null) then
    return jsonb_build_object('exito', false, 'error', 'no se puede guardar el check-in de esta reserva');
  end if;

  -- Datos mínimos obligatorios del Anexo I (valida el payload, no la reserva)
  if p_datos is null
     or coalesce(p_datos->>'nombre', '') = ''
     or coalesce(p_datos->>'apellidos', '') = ''
     or coalesce(p_datos->>'tipo_documento', '') not in ('D', 'N', 'P', 'I', 'X')
     or coalesce(p_datos->>'num_documento', '') = ''
     or coalesce(p_datos->>'fecha_nacimiento', '') = ''
     or coalesce(p_datos->>'pais_nacionalidad', '') = '' then
    return jsonb_build_object('exito', false, 'error', 'faltan datos obligatorios del formulario');
  end if;

  begin
    -- Upsert por (hostal_id, num_documento): huésped que repite albergue
    -- actualiza su fila y resetea entrada_at para la nueva estancia.
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
      p_reservation_id::text, r.payment_method, 1, v_verificado_at, null
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

  -- El token del QR se devuelve AQUÍ: hasta que no hay datos guardados no hay
  -- ficha que enseñar. Misma fórmula HMAC de la 007/015/020.
  select value into v_secret from public.app_secrets where key = 'peregrino_hmac_secret';
  return jsonb_build_object(
    'exito', true,
    'reservation_id', p_reservation_id,
    'token', encode(hmac(p_reservation_id::text || ':' || r.checkout::text, v_secret, 'sha256'), 'hex'),
    'expira', (r.checkout + 1)::text
  );
exception when others then
  return jsonb_build_object('exito', false, 'error', 'error interno, inténtalo de nuevo');
end;
$$;

revoke all on function public.guardar_datos_checkin(uuid, jsonb) from public;
grant execute on function public.guardar_datos_checkin(uuid, jsonb) to anon, authenticated;

-- 3. firma_remota_estado (base 018): la rama "entrada ya registrada" se funde
--    en el mensaje genérico.
create or replace function public.firma_remota_estado(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h record;
  v_secret text;
  v_base text;
  v_payload text;
  v_b64 text;
  v_token text;
begin
  select id, hostal_id, firma_digital_url, entrada_at
    into h
    from public.huespedes
   where reservation_id = p_reservation_id
     and verificado_otp_at is not null;

  -- Mensaje genérico ÚNICO (B-1): sin check-in online verificado para esa
  -- reserva O entrada ya registrada
  if not found or h.entrada_at is not null then
    return jsonb_build_object('exito', false, 'error', 'no hay un check-in online pendiente de firma');
  end if;

  select value into v_secret from public.app_secrets where key = 'firma_secret';
  select value into v_base from public.app_secrets where key = 'firma_base_url';
  if v_secret is null or v_base is null then
    -- Error de configuración del sistema, no del usuario: mensaje distinto a propósito
    return jsonb_build_object('exito', false, 'error', 'firma no configurada');
  end if;

  -- Payload como string literal EXACTO (ver 018). TTL 24h como token_firma.py.
  v_payload := '{"hid":"' || h.id::text || '","hos":"' || h.hostal_id::text
               || '","exp":' || (extract(epoch from now())::bigint + 86400)::text || '}';

  -- base64url sin padding (ver 018)
  v_b64 := rtrim(translate(replace(encode(convert_to(v_payload, 'UTF8'), 'base64'), E'\n', ''), '+/', '-_'), '=');

  v_token := v_b64 || '.' || left(encode(hmac(v_b64, v_secret, 'sha256'), 'hex'), 16);

  return jsonb_build_object(
    'exito', true,
    'firmado', h.firma_digital_url is not null,
    'url', rtrim(v_base, '/') || '/firma?token=' || v_token
  );
end;
$$;

revoke all on function public.firma_remota_estado(uuid) from public;
grant execute on function public.firma_remota_estado(uuid) to anon, authenticated;

-- Verificación manual (SQL Editor) tras aplicar:
--   select public.request_checkin_otp('00000000-0000-0000-0000-000000000000');
--   -- {"exito": false, "error": "no se pudo enviar el código"}
--   -- y el MISMO mensaje para una reserva real fuera de ventana
--   select public.guardar_datos_checkin('00000000-0000-0000-0000-000000000000', '{}');
--   -- {"exito": false, "error": "no se puede guardar el check-in de esta reserva"}
--   select public.firma_remota_estado('00000000-0000-0000-0000-000000000000');
--   -- {"exito": false, "error": "no hay un check-in online pendiente de firma"}

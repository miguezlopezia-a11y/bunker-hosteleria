-- 020_split_confirm_otp.sql — Separar verificación del código y guardado de datos (Fase B, v4)
--
-- Sustituye a confirm_checkin_otp (015), que hacía las dos cosas a la vez: validar
-- el código Y exigir el Anexo I completo antes de que el código caducara (10 min).
-- Problema: el peregrino rellena el parte largo con el cronómetro del código encima.
-- Diseño aprobado por Pablo (2026-09-08): dos RPCs separadas.
--
-- Dónde vive "verificado" entre ambos pasos — decisión de diseño documentada:
-- NO puede ser una fila parcial de huespedes (la 003 exige not null en nombre,
-- apellidos, tipo_documento y num_documento, y unique(hostal_id, num_documento));
-- crearla dejaría filas huérfanas al abandonar y rompería el upsert por documento
-- (huésped repetidor, decisión (d) v3). Por eso el estado vive en la propia
-- checkin_otp: columna nueva verificado_at, que guardar_datos_checkin exige no
-- nula para la reserva — mismo modelo de riesgo aceptado (reservation_id UUIDv4
-- como capacidad) y misma semántica que "verificado_otp_at no nulo".
--
-- (Aplicada en producción el 2026-09-08 tal cual, sin begin/commit.)

alter table public.checkin_otp
  add column if not exists verificado_at timestamptz;

-- 1. verificar_codigo_otp: valida el código y solo eso. Misma validación que la
--    confirm antigua (anti-enumeración, caducidad 10 min, muere a 5 intentos,
--    comparación HMAC, mensaje genérico). Éxito: usado=true + verificado_at=now().
--    NO devuelve el token del QR: sin datos no hay ficha que construir.
create or replace function public.verificar_codigo_otp(
  p_reservation_id uuid,
  p_codigo text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
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

  -- Un único mensaje genérico para: sin código, caducado, incorrecto
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

  -- Mismo riesgo aceptado que en la 015: comparación no constante en tiempo,
  -- inviable de explotar tras el jitter de red de HTTPS/REST
  if p_codigo is null or v_esperado <> o.codigo_hash then
    update public.checkin_otp set intentos = intentos + 1 where id = o.id;
    return jsonb_build_object('exito', false, 'error', 'código incorrecto o caducado');
  end if;

  -- Consumir el código y dejar constancia de la verificación (la prueba que
  -- guardar_datos_checkin exigirá)
  update public.checkin_otp set usado = true, verificado_at = now() where id = o.id;

  return jsonb_build_object('exito', true);
end;
$$;

revoke all on function public.verificar_codigo_otp(uuid, text) from public;
grant execute on function public.verificar_codigo_otp(uuid, text) to anon, authenticated;

-- 2. guardar_datos_checkin: guarda el Anexo I (upsert huespedes por documento,
--    idéntico al de la 015) y devuelve el token del QR. Sin código: exige que la
--    reserva tenga un OTP con verificado_at no nulo. Límite de tiempo: solo la
--    ventana general del check-in online (desde 12:00 del día anterior a checkin
--    hasta checkout), como en request_checkin_otp. Re-guardar antes de la entrada
--    = corrección permitida (upsert).
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

  if not found or r.status = 'cancelada' then
    return jsonb_build_object('exito', false, 'error', 'no se puede guardar el check-in de esta reserva');
  end if;

  -- Ventana general del check-in online (misma que request_checkin_otp, 015)
  if now() < (r.checkin::timestamp - interval '12 hours') then
    return jsonb_build_object('exito', false, 'error',
      'el check-in online se activa a las 12:00 del día anterior a tu llegada');
  end if;
  if current_date > r.checkout then
    return jsonb_build_object('exito', false, 'error', 'el plazo de check-in online de esta reserva ha terminado');
  end if;

  -- La prueba de posesión del email: OTP verificado para esta reserva
  select verificado_at into v_verificado_at
    from public.checkin_otp
   where reservation_id = p_reservation_id
     and verificado_at is not null
   order by verificado_at desc
   limit 1;

  if not found then
    return jsonb_build_object('exito', false, 'error', 'el código de esta reserva no está verificado');
  end if;

  -- Entrada ya registrada (panel, 019): el check-in está cerrado
  if exists (select 1 from public.huespedes
              where reservation_id = p_reservation_id and entrada_at is not null) then
    return jsonb_build_object('exito', false, 'error', 'la entrada de esta reserva ya está registrada');
  end if;

  -- Datos mínimos obligatorios del Anexo I (misma validación que la 015)
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
    -- Upsert por (hostal_id, num_documento) — decisión (d) v3, copia exacta de la 015:
    -- huésped que repite albergue actualiza su fila y resetea entrada_at para la
    -- nueva estancia. verificado_otp_at conserva el timestamp real del OTP.
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

  -- El token del QR se devuelve AQUÍ (no en la verificación): hasta que no hay
  -- datos guardados no hay ficha que enseñar. Misma fórmula HMAC de la 007/015.
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

-- 3. La antigua confirm_checkin_otp queda obsoleta en este punto (el resto de la
--    015 sigue vigente). Su única llamante era la página /checkin (verificado por
--    grep 2026-09-08), que se actualiza en el mismo ciclo.
drop function if exists public.confirm_checkin_otp(uuid, text, jsonb);

-- Verificación manual (SQL Editor):
--   select public.verificar_codigo_otp('<uuid>', '000000');   -- código incorrecto o caducado
--   select public.guardar_datos_checkin('<uuid>', '{}');      -- faltan datos / no verificado
--   select proname from pg_proc where proname like '%checkin_otp';  -- solo request_

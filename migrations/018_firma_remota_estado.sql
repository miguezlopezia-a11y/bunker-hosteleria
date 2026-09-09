-- 018_firma_remota_estado.sql — Enlace de firma remota para el check-in online (Fase B)
--
-- Tras confirm_checkin_otp (015), el peregrino debe firmar su parte de entrada
-- (RD 933/2021: firma obligatoria de todo viajero >14 años; el OTP no la sustituye,
-- solo prueba posesión del email). Esta RPC devuelve a la PWA (caller anon) la URL
-- del pad de firma ya existente (servidor_firma.py, skill-firma) y si el huésped
-- ya ha firmado, para que la PWA haga polling hasta completar el paso.
--
-- El token se computa con la MISMA fórmula que skills/skill-firma/scripts/token_firma.py:
--   payload = {"hid":"<huesped_id>","hos":"<hostal_id>","exp":<epoch>}   (string literal,
--             byte a byte igual que json.dumps(..., separators=(",",":")) de Python:
--             claves en orden hid/hos/exp, strings con comillas, epoch entero sin comillas)
--   b64     = base64url(payload) sin padding
--   token   = b64 || '.' || hex(HMAC-SHA256(key=firma_secret, msg=b64))[:16]
-- servidor_firma.py valida con el mismo FIRMA_SECRET: si aquí cambia el formato,
-- allí deja de validar. NO usar jsonb_build_object para el payload (no garantiza
-- orden de claves ni formato compacto).
--
-- Prerequisito FUERA de esta migración (lo inserta Pablo en el SQL Editor — son
-- credenciales/config y no se escriben en el repo):
--   insert into app_secrets (key, value) values ('firma_secret', '<el mismo FIRMA_SECRET del servidor de firma>');
--   insert into app_secrets (key, value) values ('firma_base_url', '<URL pública del servidor de firma, sin el /firma final>');
--
-- Seguridad: callable por anon, pero solo devuelve datos si la reserva tiene una fila
-- en huespedes con verificado_otp_at no nulo (el OTP es la prueba previa). El
-- reservation_id UUIDv4 actúa como capacidad — mismo riesgo aceptado que en la 015.
--
-- (Esta migración se aplicó en producción el 2026-09-07 tal cual, sin begin/commit.)

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

  -- Mensaje genérico (anti-enumeración): sin check-in online verificado para esa reserva
  if not found then
    return jsonb_build_object('exito', false, 'error', 'no hay un check-in online pendiente de firma');
  end if;

  if h.entrada_at is not null then
    return jsonb_build_object('exito', false, 'error', 'la entrada de esta reserva ya está registrada');
  end if;

  select value into v_secret from public.app_secrets where key = 'firma_secret';
  select value into v_base from public.app_secrets where key = 'firma_base_url';
  if v_secret is null or v_base is null then
    -- Error de configuración del sistema, no del usuario: mensaje distinto a propósito
    -- para que salte claramente en las pruebas de aceptación
    return jsonb_build_object('exito', false, 'error', 'firma no configurada');
  end if;

  -- Payload como string literal EXACTO (ver cabecera). TTL 24h como token_firma.py.
  v_payload := '{"hid":"' || h.id::text || '","hos":"' || h.hostal_id::text
               || '","exp":' || (extract(epoch from now())::bigint + 86400)::text || '}';

  -- base64url sin padding: translate cubre +/→-_, rtrim quita '=' y replace elimina
  -- los '\n' que encode(..., 'base64') inserta cada 76 chars (RFC 2045) — sin ese
  -- replace el token saldría envuelto y el servidor de firma lo rechazaría
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

-- Verificación manual (SQL Editor):
--   select public.firma_remota_estado('0ef5c62d-9fee-45e7-b943-1df606149e25');
--   -- esperado: {"exito": true, "firmado": false, "url": "<base>/firma?token=…"}
--   select public.firma_remota_estado('00000000-0000-0000-0000-000000000000');
--   -- esperado: {"exito": false, "error": "no hay un check-in online pendiente de firma"}
--
-- Test de aceptación REAL (hecho 2026-09-07, evidencia en
-- shared/tarea-kimi-peregrino-checkin-remoto-otp.md): GET a la url devuelta →
-- HTTP 200, pad "Firma Digital — Búnker 2026" con canvas, SIN "Enlace inválido".

-- 007_peregrino_session.sql — Sesión de peregrino vía QR de check-in
-- Ejecutar en SQL Editor de Supabase (proyecto fyhehiqvygbabwwllpvb)
-- Idempotente. Requiere 001_schema.sql (hostaleros) y tabla reservations.
--
-- Diseño (tarea-kimi-peregrino-qr-checkin v2, hallazgo H1 del némesis):
-- el HMAC vive SOLO en estas funciones security definer; nunca en el
-- navegador. El secreto se GENERA dentro de la propia base de datos
-- (nadie lo conoce, no se commitea) y vive en app_secrets con RLS total:
-- sin policies, ni anon ni authenticated pueden leerla vía API; solo la
-- leen las funciones security definer de abajo (corren como el owner).
-- Token = HMAC_SHA256(reservation_id || ':' || checkout) en hex.
-- Expiración: checkout + 1 día (comparado contra current_date).

create extension if not exists pgcrypto;

create table if not exists app_secrets (
  key   text primary key,
  value text not null
);

alter table app_secrets enable row level security;
-- Sin policies a propósito: denegación total vía API.

insert into app_secrets (key, value)
values ('peregrino_hmac_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;  -- no rotar el secreto en re-ejecuciones

-- Generación: solo hostaleros autenticados del hostal de la reserva
-- (o service_role, para uso server-side). El frontend de bunker-hosteleria
-- la llama con la sesión Supabase del recepcionista al completar el check-in.
create or replace function public.generate_peregrino_token(p_reservation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  r record;
  secret text;
begin
  select id, hostal_id, checkout into r
    from public.reservations
   where id = p_reservation_id;
  if not found then
    return jsonb_build_object('exito', false, 'error', 'reserva no encontrada');
  end if;

  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and not exists (
       select 1 from public.hostaleros h
       where h.id = auth.uid() and h.hostal_id = r.hostal_id
     ) then
    return jsonb_build_object('exito', false, 'error', 'no autorizado para esta reserva');
  end if;

  select value into secret from public.app_secrets where key = 'peregrino_hmac_secret';

  return jsonb_build_object(
    'exito', true,
    'reservation_id', r.id,
    'token', encode(hmac(r.id::text || ':' || r.checkout::text, secret, 'sha256'), 'hex'),
    'expira', (r.checkout + 1)::text
  );
end;
$$;

revoke all on function public.generate_peregrino_token(uuid) from public;
revoke all on function public.generate_peregrino_token(uuid) from anon;
grant execute on function public.generate_peregrino_token(uuid) to authenticated;
grant execute on function public.generate_peregrino_token(uuid) to service_role;

-- Verificación: callable por anon (el peregrino escanea el QR sin cuenta).
-- Devuelve datos mínimos solo si el token es válido y no ha expirado.
create or replace function public.verify_peregrino_session(p_reservation_id uuid, p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  r record;
  secret text;
  esperado text;
begin
  select res.id, res.hostal_id, res.guest_name, res.checkin, res.checkout,
         h.name as hostal_name
    into r
    from public.reservations res
    join public.hostales h on h.id = res.hostal_id
   where res.id = p_reservation_id;
  if not found then
    return jsonb_build_object('valid', false, 'error', 'reserva no encontrada');
  end if;

  select value into secret from public.app_secrets where key = 'peregrino_hmac_secret';
  esperado := encode(hmac(r.id::text || ':' || r.checkout::text, secret, 'sha256'), 'hex');

  if p_token is null or p_token <> esperado then
    return jsonb_build_object('valid', false, 'error', 'token inválido');
  end if;

  if r.checkout + 1 < current_date then
    return jsonb_build_object('valid', false, 'error', 'sesión expirada');
  end if;

  return jsonb_build_object(
    'valid', true,
    'hostal_id', r.hostal_id,
    'hostal_name', r.hostal_name,
    'guest_name', r.guest_name,
    'checkin_date', r.checkin,
    'checkout_date', r.checkout
  );
end;
$$;

revoke all on function public.verify_peregrino_session(uuid, text) from public;
grant execute on function public.verify_peregrino_session(uuid, text) to anon, authenticated;

-- Verificación:
-- select public.generate_peregrino_token('<uuid-reserva>');   -- con sesión de hostalero
-- select public.verify_peregrino_session('<uuid-reserva>', '<token>');  -- con anon key

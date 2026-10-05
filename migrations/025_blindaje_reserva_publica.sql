-- ============================================================
-- 025_blindaje_reserva_publica.sql
-- Auditoría seguridad 2026-09-10 — A-1 + A-2 (shared/auditoria-seguridad-hosteleria.md)
--
-- A-1: p_price venía del cliente sin validación (verificado: reservas anon con
--      price 0.01 y -500.00). Ahora el precio se calcula en servidor:
--      hostales.base_price × noches (mismo patrón que 017 con rooms).
-- A-2: sin idempotencia ni throttle. Ahora:
--      * Idempotencia (semántica 017): reintento idéntico (misma cama + email
--        + fechas, no cancelada) devuelve exito:true SIN duplicar ni reenviar
--        email.
--      * Throttle: máx. 5 reservas por guest_email en 24h (entre ambas RPCs;
--        valor inicial documentado, ajustable). Mensaje genérico.
--      * Validación de fechas en aplicación (la 010 caía en "error interno").
--
-- CAMBIO DE FIRMA: se eliminan p_price (calculado en servidor) y los
-- parámetros muertos p_guest_phone / p_guest_document (010 los aceptaba e
-- ignoraba; esos datos se recogen en el check-in real). Llamante actualizado:
-- frontend/src/services/publicService.js. La firma antigua de 10 parámetros
-- se ELIMINA (drop) para que no quede invocable.
--
-- El throttle se aplica también a create_public_booking_room (017): mismo
-- vector (A-2 cubre "todas las camas/habitaciones"), mismo contador por email.
--
-- Mismo patrón de seguridad: security definer + revoke all from public +
-- grant execute a anon, authenticated.
-- ============================================================

create or replace function public.create_public_booking(
  p_slug text,
  p_bed_label text,
  p_guest_name text,
  p_guest_email text,
  p_guest_nationality text,
  p_checkin date,
  p_checkout date
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hostal_id uuid;
  v_bed_id uuid;
  v_hostal_name text;
  v_base_price numeric;
  v_nights int;
  v_service_key text;
  v_reservation_id uuid;
begin
  if p_checkout is null or p_checkin is null or p_checkout <= p_checkin then
    return jsonb_build_object('exito', false, 'error', 'fechas no válidas');
  end if;

  -- Throttle (A-2): máx. 5 reservas por email en 24h
  if (select count(*) from public.reservations
       where guest_email = p_guest_email
         and created_at > now() - interval '24 hours') >= 5 then
    return jsonb_build_object('exito', false, 'error', 'no se pudo completar la reserva');
  end if;

  select id, name, base_price into v_hostal_id, v_hostal_name, v_base_price
    from public.hostales where slug = p_slug;
  if v_hostal_id is null then
    return jsonb_build_object('exito', false, 'error', 'albergue no encontrado');
  end if;
  if v_base_price is null or v_base_price <= 0 then
    return jsonb_build_object('exito', false, 'error', 'no se pudo completar la reserva');
  end if;

  select id into v_bed_id
    from public.beds
   where hostal_id = v_hostal_id and label = p_bed_label;
  if v_bed_id is null then
    return jsonb_build_object('exito', false, 'error', 'cama no encontrada');
  end if;

  -- Idempotencia (A-2): reintento idéntico no duplica ni reenvía email
  if exists (
    select 1 from public.reservations
     where bed_id = v_bed_id
       and guest_email = p_guest_email
       and checkin = p_checkin
       and checkout = p_checkout
       and status <> 'cancelada'
  ) then
    return jsonb_build_object('exito', true);
  end if;

  if exists (
    select 1 from public.reservations
     where bed_id = v_bed_id
       and status <> 'cancelada'
       and checkin < p_checkout
       and checkout > p_checkin
  ) then
    return jsonb_build_object('exito', false, 'error', 'cama no disponible para esas fechas');
  end if;

  -- A-1: el precio lo calcula el servidor, nunca el cliente
  v_nights := p_checkout - p_checkin;

  insert into public.reservations (
    hostal_id, bed_id, guest_name, guest_email, nationality,
    channel, checkin, checkout, status, price, payment_method, payment_status
  ) values (
    v_hostal_id, v_bed_id, p_guest_name, p_guest_email, p_guest_nationality,
    'directo', p_checkin, p_checkout, 'confirmada', v_base_price * v_nights, 'tarjeta', 'pendiente'
  )
  returning id into v_reservation_id;

  begin
    select value into v_service_key from public.app_secrets where key = 'service_role_key';
    if v_service_key is not null and p_guest_email is not null then
      perform net.http_post(
        url := 'https://fyhehiqvygbabwwllpvb.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key,
          'apikey', v_service_key
        ),
        body := jsonb_build_object(
          'to', p_guest_email,
          'template', 'booking_confirmation',
          'variables', jsonb_build_object(
            'guestName', p_guest_name,
            'hostalName', v_hostal_name,
            'checkin', p_checkin,
            'checkout', p_checkout,
            'bedLabel', p_bed_label,
            'checkinUrl', 'https://pwa-hostaleria.miguezlopezia.workers.dev/checkin?r=' || v_reservation_id
          ),
          'hostal_id', v_hostal_id
        ),
        timeout_milliseconds := 5000
      );
    end if;
  exception when others then
    null;
  end;

  return jsonb_build_object('exito', true);
exception when others then
  return jsonb_build_object('exito', false, 'error', 'error interno, inténtalo de nuevo');
end;
$$;

-- La firma antigua (10 parámetros, con p_price) se elimina: revoke solo no
-- bastaría (gotcha PUBLIC/EXECUTE, A-3) y dejarla es dejar el vector abierto.
drop function if exists public.create_public_booking(text, text, text, text, text, text, text, date, date, numeric);

revoke all on function public.create_public_booking(text, text, text, text, text, date, date) from public;
grant execute on function public.create_public_booking(text, text, text, text, text, date, date) to anon, authenticated;

-- Mismo throttle en la RPC de habitaciones (017): mismo vector A-2.
create or replace function public.create_public_booking_room(
  p_slug text,
  p_room_name text,
  p_guest_name text,
  p_guest_email text,
  p_guest_nationality text,
  p_checkin date,
  p_checkout date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hostal_id uuid;
  v_room_id uuid;
  v_price_per_night numeric;
  v_nights int;
begin
  if p_checkout is null or p_checkin is null or p_checkout <= p_checkin then
    return jsonb_build_object('exito', false, 'error', 'fechas no válidas');
  end if;

  -- Throttle (A-2): máx. 5 reservas por email en 24h
  if (select count(*) from public.reservations
       where guest_email = p_guest_email
         and created_at > now() - interval '24 hours') >= 5 then
    return jsonb_build_object('exito', false, 'error', 'no se pudo completar la reserva');
  end if;

  select id into v_hostal_id from public.hostales where slug = p_slug;
  if v_hostal_id is null then
    return jsonb_build_object('exito', false, 'error', 'albergue no encontrado');
  end if;

  select id, price_per_night into v_room_id, v_price_per_night
    from public.rooms
   where hostal_id = v_hostal_id
     and name = p_room_name
     and tipo = 'privada';
  if v_room_id is null then
    return jsonb_build_object('exito', false, 'error', 'habitación no encontrada');
  end if;

  -- Idempotencia: reintento identico no duplica
  if exists (
    select 1 from public.reservations
     where room_id = v_room_id
       and guest_email = p_guest_email
       and checkin = p_checkin
       and checkout = p_checkout
       and status <> 'cancelada'
  ) then
    return jsonb_build_object('exito', true);
  end if;

  -- Solape por room_id (misma semantica que bed_id)
  if exists (
    select 1 from public.reservations
     where room_id = v_room_id
       and status <> 'cancelada'
       and checkin < p_checkout
       and checkout > p_checkin
  ) then
    return jsonb_build_object('exito', false, 'error', 'habitación no disponible para esas fechas');
  end if;

  v_nights := p_checkout - p_checkin;

  insert into public.reservations (
    hostal_id, room_id, guest_name, guest_email, nationality,
    channel, checkin, checkout, status, price, payment_method, payment_status
  ) values (
    v_hostal_id, v_room_id, p_guest_name, p_guest_email, p_guest_nationality,
    'directo', p_checkin, p_checkout, 'confirmada', v_price_per_night * v_nights, 'tarjeta', 'pendiente'
  );

  return jsonb_build_object('exito', true);
exception when others then
  return jsonb_build_object('exito', false, 'error', 'error interno, inténtalo de nuevo');
end;
$$;

revoke all on function public.create_public_booking_room(text, text, text, text, text, date, date) from public;
grant execute on function public.create_public_booking_room(text, text, text, text, text, date, date) to anon, authenticated;

-- ============================================================
-- 017_create_public_booking_room.sql
-- Tarea: shared/tarea-kimi-habitaciones-unidad-vendible.md (v2), Fase B
-- Reserva publica de habitacion privada (unidad = room_id).
-- RPC PARALELA a create_public_booking (010) — no se toca la de camas.
--
-- NO EJECUTAR sin confirmacion explicita de Pablo en el momento.
-- Requiere 016 aplicada (rooms.tipo/price_per_night, reservations.room_id).
--
-- Diferencias deliberadas respecto a 010:
--  * Solo resuelve rooms con tipo='privada' (los dormitorios se venden
--    por cama via 010; una privada jamas se vende por cama).
--  * El precio NO viene del cliente: se calcula en servidor como
--    rooms.price_per_night x noches (la privada tiene precio canonico
--    en BD por la constraint rooms_precio_segun_tipo; evita
--    manipulacion del precio desde el navegador).
--  * Idempotente (restriccion del documento): reintento identico
--    (misma habitacion + email + fechas, no cancelada) devuelve
--    exito:true sin duplicar la reserva.
-- Mismo contrato de salida que 010: jsonb { exito, error }.
-- Mismo patron de seguridad (v2 Mejora 2): security definer +
-- revoke all from public + grant execute a anon, authenticated.
-- ============================================================

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

  -- Solape por room_id (misma semantica que 010 con bed_id)
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

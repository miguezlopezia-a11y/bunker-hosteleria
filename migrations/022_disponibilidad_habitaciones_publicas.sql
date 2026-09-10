-- ============================================================
-- 022_disponibilidad_habitaciones_publicas.sql
-- Tarea: shared/tarea-kimi-habitaciones-unidad-vendible.md (v2), Fase C
-- Disponibilidad publica de habitaciones privadas (unidad = room_id).
-- RPCs PARALELAS a las de camas (008) — no se tocan
-- get_beds_by_hostal_slug ni list_public_availability.
--
-- NO EJECUTAR sin confirmacion explicita de Pablo en el momento.
-- Requiere 016 aplicada (rooms.tipo/occupancy_status/price_per_night,
-- guests.room_id, reservations.room_id).
--
-- Semantica de ocupacion: ESPEJO exacto de 008, cambiando cama por
-- habitacion. Una habitacion privada esta OCUPADA en p_date si:
--   a) huesped con checkin <= p_date <= checkout via guests.room_id
--      (inclusive, mismo criterio que buildActiveGuestBedMap), o
--   b) reserva no cancelada con checkin <= p_date < checkout via
--      reservations.room_id (noches [checkin, checkout)), o
--   c) solo si p_date = hoy: rooms.occupancy_status = 'occupied'
--      (verdad operativa del panel).
--
-- Restricciones v2 respetadas:
--   * Solo lista rooms tipo='privada' (los dormitorios se venden por
--     cama; occupancy_status de un dormitorio NO es dato valido — aqui
--     nunca se lee porque el where filtra tipo antes).
--   * Mismo patron de seguridad que 008 (security definer + revoke
--     public + grant anon, authenticated).
--   * Idempotentes por construccion: son SELECTs (stable, sin estado).
--
-- Desviacion documentada respecto a la nemesis (que proponia solo
-- (name, status)): se exponen tambien price_per_night y capacity —
-- datos publicos de carta que la ficha publica necesita para mostrar
-- "desde X€" y plazas (D-2/D-7). Nada mas.
--
-- Contenido:
--   0) FIX constraint guests: la 016 puso XOR estricto (exactamente una
--      unidad), pero el checkout existente DESVINCULA la unidad
--      (checkOutGuest hace bed_id=null — AppContext.jsx). Con XOR estricto
--      todo checkout fallaria (regresion del flujo actual). En guests la
--      regla real es "nunca ambas" (los historicos desvinculados son
--      legitimos); el XOR estricto se mantiene solo en reservations.
--   1) get_rooms_by_hostal_slug(p_slug, p_date=today)
--      -> (name, status, price_per_night, capacity)
--      Detalle por habitacion para la ficha publica (Web.jsx).
--   2) list_public_room_availability(p_date=today) -> (slug, free_rooms)
--      Conteo agregado por hostal para el directorio (no expone
--      habitaciones individuales, solo el numero).
-- ============================================================

-- 0) guests: de XOR estricto a "como mucho una unidad"
alter table public.guests
  drop constraint guests_exactly_one_unit;
alter table public.guests
  add constraint guests_at_most_one_unit
    check (not (bed_id is not null and room_id is not null));

create or replace function public.get_rooms_by_hostal_slug(p_slug text, p_date date default current_date)
returns table (name text, status text, price_per_night numeric, capacity integer)
language sql
stable
security definer
set search_path = public
as $$
  select r.name,
         case
           when p_date = current_date and r.occupancy_status = 'occupied' then 'occupied'
           when exists (
             select 1 from public.guests g
             where g.room_id = r.id
               and g.checkin::date <= p_date
               and g.checkout::date >= p_date
           ) then 'occupied'
           when exists (
             select 1 from public.reservations res
             where res.room_id = r.id
               and res.status <> 'cancelada'
               and res.checkin::date <= p_date
               and res.checkout::date > p_date
           ) then 'occupied'
           else 'free'
         end as status,
         r.price_per_night,
         r.capacity
  from public.rooms r
  join public.hostales h on h.id = r.hostal_id
  where h.slug = p_slug
    and r.tipo = 'privada'
  order by length(r.name), r.name;
$$;

revoke all on function public.get_rooms_by_hostal_slug(text, date) from public;
grant execute on function public.get_rooms_by_hostal_slug(text, date) to anon, authenticated;

create or replace function public.list_public_room_availability(p_date date default current_date)
returns table (slug text, free_rooms integer)
language sql
stable
security definer
set search_path = public
as $$
  select h.slug,
         (select count(*)::integer
          from public.get_rooms_by_hostal_slug(h.slug, p_date) r
          where r.status = 'free') as free_rooms
  from public.hostales h
  order by h.slug;
$$;

revoke all on function public.list_public_room_availability(date) from public;
grant execute on function public.list_public_room_availability(date) to anon, authenticated;

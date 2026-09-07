-- ============================================================
-- 016_habitaciones_unidad_vendible.sql
-- Tarea: shared/tarea-kimi-habitaciones-unidad-vendible.md (v2)
-- La habitacion privada como unidad vendible de primera clase,
-- EN PARALELO al modelo de camas (que no se toca).
--
-- NO EJECUTAR sin confirmacion explicita de Pablo en el momento.
--
-- Verificado por sonda con anon key (2026-09-04), no desde mocks:
--   rooms        = id, hostal_id, name, capacity (sin tipo/ocupacion/precio)
--   guests       = tiene bed_id, NO tiene room_id
--   reservations = tiene bed_id, NO tiene room_id
--   beds         = id, hostal_id, room_id, label, status
--   ids          = uuid (sonda eq.no-es-uuid -> 400)
-- Nullability de bed_id no verificable con anon -> "drop not null"
-- defensivo (no-op si ya era nullable).
-- Numero 016: el 015 lo ocupa la tarea OTP (feat/checkin-remoto-otp,
-- ya aplicada en produccion). Esta migracion no depende de la 015.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) rooms: tipo + estado de ocupacion propio + precio por noche
--    (no habia columna de limpieza con la que chocar: la limpieza
--    vive en cleaning_tasks — verificado en la nemesis)
-- ------------------------------------------------------------
alter table public.rooms
  add column tipo text not null default 'dormitorio';

alter table public.rooms
  add constraint rooms_tipo_valido
    check (tipo in ('dormitorio', 'privada'));

-- occupancy_status SOLO es significativo para tipo='privada'.
-- Para 'dormitorio' la ocupacion real se sigue leyendo de beds
-- (restriccion v2: ningun KPI/informe debe leerlo en dormitorios).
alter table public.rooms
  add column occupancy_status text not null default 'free';

alter table public.rooms
  add constraint rooms_occupancy_status_valido
    check (occupancy_status in ('free', 'occupied'));

-- Precio por noche de la privada (hostales.base_price es POR CAMA).
alter table public.rooms
  add column price_per_night numeric(10,2);

-- Constraint cruzada (v2, D-2): privada EXIGE precio, dormitorio lo
-- PROHIBE. Las filas existentes quedan dormitorio + precio null,
-- asi que la cumplen.
alter table public.rooms
  add constraint rooms_precio_segun_tipo
    check (
      (tipo = 'privada'    and price_per_night is not null) or
      (tipo = 'dormitorio' and price_per_night is null)
    );

-- Semantica dual de capacity (v2, D-7): numero de camas en
-- dormitorio, capacidad en personas en privada. Sin DDL, solo doc.
comment on column public.rooms.capacity is
  'Plazas: nº de camas si tipo=dormitorio, nº de personas si tipo=privada';
comment on column public.rooms.occupancy_status is
  'Ocupacion operativa del dia. Solo valido para tipo=privada; en dormitorio la ocupacion vive en beds';

-- ------------------------------------------------------------
-- 2) reservations: room_id paralelo a bed_id + exclusividad XOR
--    (restriccion bloqueante del documento: en BD, no solo en app)
-- ------------------------------------------------------------
alter table public.reservations
  add column room_id uuid references public.rooms(id);

alter table public.reservations
  alter column bed_id drop not null;  -- defensivo: no-op si ya era nullable

alter table public.reservations
  add constraint reservations_exactly_one_unit
    check ((bed_id is not null) <> (room_id is not null));

-- ------------------------------------------------------------
-- 3) guests: idem — el check-in de habitacion inserta aqui
--    (sin XOR en guests la exclusividad se rompe en mitad del flujo)
-- ------------------------------------------------------------
alter table public.guests
  add column room_id uuid references public.rooms(id);

alter table public.guests
  alter column bed_id drop not null;  -- defensivo

alter table public.guests
  add constraint guests_exactly_one_unit
    check ((bed_id is not null) <> (room_id is not null));

commit;

-- 008_get_beds_by_hostal_slug.sql — Camas y disponibilidad pública por slug
-- Ejecutar en SQL Editor de Supabase (proyecto fyhehiqvygbabwwllpvb)
-- Idempotente (create or replace).
--
-- Motivo (tarea-kimi-peregrino-disponibilidad-resenas, hallazgo B-2 del
-- némesis, 2026-08-30): publicService.getBedsByHostalSlug (Web.jsx) llama a
-- esta RPC pero NO EXISTE en el schema (verificado con service role por la
-- socia: no es un problema de grants) — la página pública de reserva nunca
-- muestra camas. Esta migración la crea, con semántica ampliada por fecha:
--
--   Una cama está OCUPADA en la fecha p_date si:
--   a) hay un huésped (guests) con checkin <= p_date <= checkout
--      (inclusive, mismo criterio que buildActiveGuestBedMap del panel), o
--   b) hay una reserva no cancelada con checkin <= p_date < checkout
--      (noches [checkin, checkout)), o
--   c) solo si p_date = hoy: beds.status = 'occupied' (verdad operativa del
--      panel, cubre ocupaciones manuales sin fila en guests).
--
-- Supuestos verificados desde código (no desde el schema directamente):
--   beds(id, hostal_id, label, status['free'|'occupied'])
--   guests(bed_id, checkin, checkout) — se castea a ::date por si son
--   timestamptz; si ya son date el cast es no-op.
--   reservations(bed_id, checkin, checkout, status['pendiente','cancelada',...])
--
-- Contenido:
--   1) get_beds_by_hostal_slug(p_slug, p_date=today) -> (label, status)
--      Detalle por cama; la usa Web.jsx (solo con p_slug -> hoy) y la ficha
--      pública del albergue.
--   2) list_public_availability(p_date=today) -> (slug, free_beds)
--      Conteo agregado por hostal para el directorio público (no expone
--      camas individuales, solo el número).

create or replace function public.get_beds_by_hostal_slug(p_slug text, p_date date default current_date)
returns table (label text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select b.label,
         case
           when p_date = current_date and b.status = 'occupied' then 'occupied'
           when exists (
             select 1 from public.guests g
             where g.bed_id = b.id
               and g.checkin::date <= p_date
               and g.checkout::date >= p_date
           ) then 'occupied'
           when exists (
             select 1 from public.reservations r
             where r.bed_id = b.id
               and r.status <> 'cancelada'
               and r.checkin::date <= p_date
               and r.checkout::date > p_date
           ) then 'occupied'
           else 'free'
         end as status
  from public.beds b
  join public.hostales h on h.id = b.hostal_id
  where h.slug = p_slug
  order by length(b.label), b.label;
$$;

revoke all on function public.get_beds_by_hostal_slug(text, date) from public;
grant execute on function public.get_beds_by_hostal_slug(text, date) to anon, authenticated;

create or replace function public.list_public_availability(p_date date default current_date)
returns table (slug text, free_beds integer)
language sql
stable
security definer
set search_path = public
as $$
  select h.slug,
         (select count(*)::integer
          from public.get_beds_by_hostal_slug(h.slug, p_date) b
          where b.status = 'free') as free_beds
  from public.hostales h
  order by h.slug;
$$;

revoke all on function public.list_public_availability(date) from public;
grant execute on function public.list_public_availability(date) to anon, authenticated;

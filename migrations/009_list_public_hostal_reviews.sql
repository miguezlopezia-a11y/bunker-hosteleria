-- 009_list_public_hostal_reviews.sql — URLs de reseñas públicas por hostal
-- Ejecutar en SQL Editor de Supabase (proyecto fyhehiqvygbabwwllpvb)
-- Idempotente (create or replace).
--
-- Motivo (tarea-kimi-peregrino-disponibilidad-resenas, decisión v2 nº 5):
-- el directorio público y la ficha del albergue muestran badges/enlaces a
-- las reseñas de Google/Booking cuando existen. Las columnas
-- google_review_url / booking_review_url existen en `hostales` (verificado
-- por la socia con service role el 2026-08-29, registrado en la cabecera
-- de 006) pero ninguna RPC pública las expone.
-- Se crea una RPC APARTE en vez de ampliar list_public_hostales: cambiar el
-- returns table de una función existente exigiría DROP + CREATE (no vale
-- create or replace), y una función separada es más limpia y compatible.

create or replace function public.list_public_hostal_reviews()
returns table (slug text, google_review_url text, booking_review_url text)
language sql
stable
security definer
set search_path = public
as $$
  select h.slug, h.google_review_url, h.booking_review_url
  from public.hostales h
  order by h.slug;
$$;

revoke all on function public.list_public_hostal_reviews() from public;
grant execute on function public.list_public_hostal_reviews() to anon, authenticated;

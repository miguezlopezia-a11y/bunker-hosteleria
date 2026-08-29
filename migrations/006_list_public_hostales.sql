-- 006_list_public_hostales.sql — RPC pública para el directorio de albergues
-- Ejecutar en SQL Editor de Supabase (proyecto fyhehiqvygbabwwllpvb)
-- Idempotente (create or replace).
--
-- Motivo: la RLS de `hostales` excluye todas las filas para el rol anon
-- (verificado 2026-08-29: SELECT directo con la anon key -> HTTP 200 con []).
-- El directorio público (/directorio) necesita listar los hostales sin auth,
-- así que se expone una RPC security definer con SOLO los campos públicos
-- verificados: name, slug, address, base_price.
--
-- Columnas reales de `hostales` verificadas con service role el 2026-08-29:
-- id, name, slug, address, phone, email, google_review_url,
-- booking_review_url, base_price, modo_directo, created_at, updated_at,
-- auto_send_survey. NO existen comunidad/capacity/rating — no exponer nada más.
--
-- Nota: si al crear la función falla por tipo de `base_price` (se asume
-- numeric; no verificable con la anon key), ajustar el tipo del returns table
-- al real de la columna.

create or replace function public.list_public_hostales()
returns table (name text, slug text, address text, base_price numeric)
language sql
stable
security definer
set search_path = public
as $$
  select h.name, h.slug, h.address, h.base_price
  from public.hostales h
  order by h.name;
$$;

revoke all on function public.list_public_hostales() from public;
grant execute on function public.list_public_hostales() to anon, authenticated;

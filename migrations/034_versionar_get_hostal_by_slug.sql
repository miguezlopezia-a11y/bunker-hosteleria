-- ============================================================
-- 034_versionar_get_hostal_by_slug.sql
-- Tarea: shared/tarea-kimi-web-hostal-plantilla-piloto.md (añadido de Pablo
-- al aprobar la Fase 0): la RPC get_hostal_by_slug era SQL huérfano
-- (existía en producción sin fuente en el repo, deuda anotada en H4 de la
-- némesis QR). Este archivo la versiona SIN cambiar su comportamiento,
-- mismo criterio que se aplicó con send-email.ts.
--
-- ⚠️ RECONSTRUCCION DESDE COMPORTAMIENTO OBSERVABLE — VERIFICAR ANTES DE
-- APLICAR: el SQL exacto nunca estuvo en el repo y no se pudo extraer sin
-- service role. Antes de ejecutar esto en producción, comparar con:
--
--   select pg_get_functiondef('public.get_hostal_by_slug(text)'::regprocedure);
--
-- Si difiere, sustituir el cuerpo de abajo por la definición real (este
-- archivo queda como la fuente versionada). Si el tipo de retorno real
-- difiriera, el create or replace FALLARIA (Postgres no permite cambiar el
-- return type con or replace) — fallo seguro, no silencioso.
--
-- Comportamiento observable verificado el 2026-09-10 (anon key, produccion):
--   POST /rest/v1/rpc/get_hostal_by_slug {"p_slug":"albergue-demo-galicia"}
--   -> HTTP 200, [{"name":"Albergue Demo Galicia","base_price":14.00,
--      "modo_directo":true}]
-- (array => returns table/setof; la llamada desde el frontend usa .single()).
-- Es llamable por anon hoy; el revoke+grant de abajo conserva exactamente
-- eso (mismo patron que el resto de RPCs públicas del proyecto).
-- ============================================================

create or replace function public.get_hostal_by_slug(p_slug text)
returns table (name text, base_price numeric, modo_directo boolean)
language sql
stable
security definer
set search_path = public
as $$
  select h.name, h.base_price, h.modo_directo
  from public.hostales h
  where h.slug = p_slug;
$$;

revoke all on function public.get_hostal_by_slug(text) from public;
grant execute on function public.get_hostal_by_slug(text) to anon, authenticated;

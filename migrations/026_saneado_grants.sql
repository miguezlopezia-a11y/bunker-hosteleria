-- ============================================================
-- 026_saneado_grants.sql
-- Auditoría seguridad 2026-09-10 — A-3 (+ re-aserción de la 019)
--
-- A-3: la migración 013 revocó EXECUTE de anon pero no de PUBLIC, y en
-- Postgres el grant por defecto de PUBLIC manda: get_my_hostal_id,
-- get_my_rol y rls_auto_enable seguían ejecutables por anon (verificado
-- ejecutando como anon real: null|200 y la ejecución de rls_auto_enable).
--
-- Patrón correcto (el que ya usan 006/008/015/017/019/020/022):
--   revoke all ... from public  +  grant execute solo a quien lo necesita.
--
--   * get_my_hostal_id / get_my_rol: las usan las políticas RLS y el panel
--     → grant a authenticated. anon no los necesita (las RPCs públicas son
--     security definer y las tablas no tienen grants para anon).
--   * handle_new_user / rls_auto_enable: triggers (auth.users / event
--     trigger). Nadie los llama por RPC → sin grant a ningún rol de API.
--     (La ejecución como trigger no depende del privilegio EXECUTE.)
--   * registrar_entrada_peregrino: re-aserción de la 019 (en producción el
--     revoke no se mantenía — deriva A-5, investigada aparte; este revoke es
--     el correcto independientemente de la causa).
--
-- Fix sistémico del gotcha: default privileges sin EXECUTE a PUBLIC para
-- funciones creadas desde el SQL editor (rol postgres). A partir de aquí,
-- toda función nueva nace sin EXECUTE público y cada migración concede
-- explícito (como ya hacen las buenas).
-- ============================================================

revoke all on function public.get_my_hostal_id() from public;
revoke all on function public.get_my_hostal_id() from anon;
grant execute on function public.get_my_hostal_id() to authenticated;

revoke all on function public.get_my_rol() from public;
revoke all on function public.get_my_rol() from anon;
grant execute on function public.get_my_rol() to authenticated;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon, authenticated;

revoke all on function public.registrar_entrada_peregrino(uuid) from public;
revoke all on function public.registrar_entrada_peregrino(uuid) from anon;
grant execute on function public.registrar_entrada_peregrino(uuid) to authenticated;

-- Las funciones nacen sin EXECUTE para PUBLIC; cada migración concede a mano.
alter default privileges for role postgres revoke all on functions from public;

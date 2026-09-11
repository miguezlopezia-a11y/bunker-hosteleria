-- ============================================================
-- 028_versionar_rls_auto_enable.sql
-- Auditoría seguridad 2026-09-10 — A-5 (deriva producción↔repo)
--
-- rls_auto_enable existía en producción sin fuente versionada. Cuerpo REAL
-- recuperado con pg_get_functiondef el 2026-09-11 (diagnóstico corrido por
-- Pablo, §9 del informe) — este archivo lo versiona TAL CUAL, sin cambiar
-- comportamiento. Es inocuo: activa RLS en tablas nuevas de public, nada
-- de grants (descartado como causa de la deriva de la 019).
--
-- Es una función de event trigger: nadie la llama por RPC. Sin grant a
-- ningún rol de API (la ejecución como trigger no usa EXECUTE) — mismo
-- criterio que la 026.
-- ============================================================

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon, authenticated;

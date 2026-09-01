-- Security Advisor: limpieza del EXECUTE a PUBLIC por defecto en funciones internas.
-- No explotable: get_my_* devuelve null para anon, las otras son trigger/event-trigger.

revoke execute on function public.get_my_hostal_id() from anon;
revoke execute on function public.get_my_rol() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

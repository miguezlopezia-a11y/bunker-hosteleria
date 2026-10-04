-- Cierre C-3: handle_new_user deja de provisionar hostaleros desde metadata.
--
-- Antes: el trigger de auth.users leia raw_user_meta_data->>'hostal_id' (lo
-- rellena el cliente sin validar) y se auto-vinculaba como Director de ese
-- hostal. Cualquiera podia adjuntarse a un hostal ajeno pasando el uuid en
-- el signup.
--
-- Despues: el trigger no provisiona nada. El vinculo usuario<->hostal lo
-- crean, con autorizacion de servidor:
--   - crear_mi_hostal (Fase B): el propio usuario crea SU hostal nuevo.
--   - invitacion de empleado (Fase C): Edge Function con sesion de Director.
--
-- Sin cambios en filas existentes: solo afecta a altas futuras.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

-- Gotcha PUBLIC+EXECUTE (A-3/026): ningun rol invoca esta funcion directamente;
-- la dispara el trigger como definer. Revokes explicitos para que proacl quede limpio.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

commit;

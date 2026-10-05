-- 2a plantilla visual (hero dividido). Amplia el check, idempotente.

alter table public.hostales
  drop constraint if exists hostales_plantilla_check;
alter table public.hostales
  add constraint hostales_plantilla_check
    check (plantilla is null or plantilla in ('piloto_a', 'piloto_b'));

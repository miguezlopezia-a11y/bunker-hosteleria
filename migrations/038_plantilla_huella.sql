-- Tema premium Huella. Idempotente.
-- NO aplicada: la aplica Pablo (mismo criterio que 037).

alter table public.hostales
  drop constraint if exists hostales_plantilla_check;
alter table public.hostales
  add constraint hostales_plantilla_check
    check (plantilla is null or plantilla in ('piloto_a', 'piloto_b', 'norte', 'huella'));

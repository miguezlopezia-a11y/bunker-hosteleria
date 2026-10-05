-- ============================================================
-- 035_hostales_fotos_bucket.sql
-- Tarea: shared/tarea-kimi-web-hostal-plantilla-piloto.md
-- Bucket de Storage para las fotos de la página web pública por hostal.
--
-- NO EJECUTAR sin confirmacion explicita de Pablo en el momento.
-- Idempotente (on conflict / drop policy if exists).
--
-- Fase 0 (2026-09-10): no existía bucket reutilizable — solo `firmas`
-- (public:true, PII, sospechoso en la auditoría de seguridad concurrente).
-- `hostales-fotos` es PUBLIC a propósito: contiene solo fotos de marketing
-- que se sirven en la web pública; NUNCA PII ni documentos. Avisada la
-- auditoría de seguridad (tarea concurrente) de que este piloto lo añade.
--
-- Convención de path: <hostal_id>/<nombre-archivo>. El hostalero solo puede
-- escribir/borrar dentro de la carpeta de SU hostal (get_my_hostal_id(),
-- el mismo helper de las RLS de la 003/004). Lectura pública.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('hostales-fotos', 'hostales-fotos', true)
on conflict (id) do nothing;

-- Lectura pública vía API (además del endpoint /object/public/ del bucket).
drop policy if exists hostales_fotos_public_read on storage.objects;
create policy hostales_fotos_public_read
  on storage.objects for select
  using (bucket_id = 'hostales-fotos');

-- Escritura solo dentro de la carpeta del propio hostal.
drop policy if exists hostales_fotos_owner_insert on storage.objects;
create policy hostales_fotos_owner_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hostales-fotos'
    and (storage.foldername(name))[1] = public.get_my_hostal_id()::text
  );

drop policy if exists hostales_fotos_owner_update on storage.objects;
create policy hostales_fotos_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'hostales-fotos'
    and (storage.foldername(name))[1] = public.get_my_hostal_id()::text
  );

drop policy if exists hostales_fotos_owner_delete on storage.objects;
create policy hostales_fotos_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hostales-fotos'
    and (storage.foldername(name))[1] = public.get_my_hostal_id()::text
  );

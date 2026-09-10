-- C-1 (auditoría seguridad 2026-09-10): bucket 'firmas' privado y versionado.
-- El bucket lo creó skill-firma en runtime (servidor_firma.py) con public:true
-- y las firmas de huéspedes (PII, requisito legal RD 933/2021) eran
-- descargables sin credenciales. El flag public=false ya se aplicó en
-- producción vía Storage API el 2026-09-10; esta migración lo fija como
-- código y añade la única policy de lectura: el panel (rol authenticated)
-- solo puede leer la carpeta de su propio hostal y generar signed URLs de
-- corta duración con createSignedUrl (que exige SELECT en storage.objects).
-- Escrituras: sin policies para anon/authenticated — solo service_role
-- (bypassa RLS), que es quien sube las firmas desde skill-firma.

insert into storage.buckets (id, name, public)
values ('firmas', 'firmas', false)
on conflict (id) do update set public = false;

create policy firmas_select_hostal_propio on storage.objects
  for select to authenticated
  using (
    bucket_id = 'firmas'
    and (storage.foldername(name))[1] = public.get_my_hostal_id()::text
  );

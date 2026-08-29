-- 003_policia_firma.sql — Tablas para skill-policia y skill-firma
-- Ejecutar en SQL Editor de Supabase (proyecto fyhehiqvygbabwwllpvb)
-- Idempotente. Requiere 001_schema.sql aplicado (helpers get_my_hostal_id/get_my_rol).

create table if not exists huespedes (
  id                  uuid primary key default gen_random_uuid(),
  hostal_id           uuid not null references hostales(id),
  nombre              text not null,
  apellidos           text not null,
  tipo_documento      text not null check (tipo_documento in ('D', 'N', 'P', 'I', 'X')),
  num_documento       text not null,
  fecha_nacimiento    date,
  pais_nacionalidad   text,
  firma_digital_url   text,
  created_at          timestamptz default now(),
  fecha_caducidad_doc date,
  num_soporte_doc     text,
  didit_status        text default 'pendiente',
  didit_portrait_url  text,
  unique (hostal_id, num_documento)
);

alter table huespedes enable row level security;

drop policy if exists "hostalero ve huespedes" on huespedes;
create policy "hostalero ve huespedes" on huespedes
  for select using (hostal_id = get_my_hostal_id());

drop policy if exists "hostalero inserta huespedes" on huespedes;
create policy "hostalero inserta huespedes" on huespedes
  for insert with check (hostal_id = get_my_hostal_id());

drop policy if exists "hostalero actualiza huespedes" on huespedes;
create policy "hostalero actualiza huespedes" on huespedes
  for update using (hostal_id = get_my_hostal_id())
  with check (hostal_id = get_my_hostal_id());

create table if not exists alertas_log (
  id          uuid primary key default gen_random_uuid(),
  hostal_id   uuid references hostales(id),
  tipo        text not null check (tipo in ('LEGAL', 'TECNICA', 'INFO')),
  mensaje     text not null,
  datos       jsonb,
  created_at  timestamptz default now()
);

alter table alertas_log enable row level security;

drop policy if exists "directores ven alertas" on alertas_log;
create policy "directores ven alertas" on alertas_log
  for select using (hostal_id = get_my_hostal_id() and get_my_rol() = 'Director');

drop policy if exists "hostalero inserta alertas" on alertas_log;
create policy "hostalero inserta alertas" on alertas_log
  for insert with check (hostal_id = get_my_hostal_id());

-- 004_hostales_secrets.sql — Credenciales SES por hostal
-- Ejecutar en SQL Editor de Supabase (proyecto fyhehiqvygbabwwllpvb)
-- Idempotente. Requiere 001_schema.sql aplicado (helpers get_my_hostal_id/get_my_rol).
--
-- El pipeline (api_ses.load_secrets_from_supabase) lee esta tabla en cada scan
-- en modo real. RLS: solo el Director del hostal puede ver/editar sus secrets.
-- El backend usa service role (bypassea RLS).

create table if not exists hostales_secrets (
  hostal_id               uuid primary key references hostales(id),
  ses_username            text not null default '',
  ses_password            text not null default '',
  ses_establecimiento_id  text not null default '',
  updated_at              timestamptz default now()
);

alter table hostales_secrets enable row level security;

drop policy if exists "director gestiona secrets" on hostales_secrets;
create policy "director gestiona secrets" on hostales_secrets
  for all
  using (hostal_id = get_my_hostal_id() and get_my_rol() = 'Director')
  with check (hostal_id = get_my_hostal_id() and get_my_rol() = 'Director');

drop trigger if exists trg_hostales_secrets_updated_at on hostales_secrets;
create trigger trg_hostales_secrets_updated_at
  before update on hostales_secrets
  for each row execute function set_updated_at();

-- Cuando tengas las credenciales del alta en SES, insertarlas así:
-- insert into hostales_secrets (hostal_id, ses_username, ses_password, ses_establecimiento_id)
-- values ('<UUID_DEL_HOSTAL>', '<usuario_ses>', '<password_ses>', '<codigo_establecimiento>')
-- on conflict (hostal_id) do update set
--   ses_username = excluded.ses_username,
--   ses_password = excluded.ses_password,
--   ses_establecimiento_id = excluded.ses_establecimiento_id;

-- Cierre A-5: versiona esquema base+RLS+funciones huérfanas, sin cambiar comportamiento.
-- Recuperado vía SQL Editor 2026-09-30 (sin FKs: no consultadas, no inventarlas).

create table if not exists public.hostales (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  slug text not null,
  address text,
  phone text,
  email text,
  google_review_url text,
  booking_review_url text,
  base_price numeric default 15.00,
  modo_directo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  auto_send_survey boolean default true,
  descripcion_larga text,
  fotos text[] not null default '{}',
  color_acento text,
  plantilla text,
  pagina_web_activa boolean not null default false
);

create table if not exists public.hostaleros (
  id uuid not null primary key,
  hostal_id uuid not null,
  email text not null,
  nombre text,
  rol text not null,
  created_at timestamptz default now(),
  expected_checkin_time time default '09:00:00'
);

create table if not exists public.rooms (
  id uuid not null default gen_random_uuid() primary key,
  hostal_id uuid not null,
  name text not null,
  capacity integer not null default 6,
  tipo text not null default 'dormitorio',
  occupancy_status text not null default 'free',
  price_per_night numeric
);

create table if not exists public.beds (
  id uuid not null default gen_random_uuid() primary key,
  hostal_id uuid not null,
  room_id uuid,
  label text not null,
  status text not null default 'free'
);

create table if not exists public.guests (
  id uuid not null default gen_random_uuid() primary key,
  hostal_id uuid not null,
  reservation_id uuid,
  bed_id uuid,
  room_id uuid,
  name text not null,
  email text,
  document text,
  nationality text,
  checkin date,
  checkout date,
  price numeric,
  payment_status text default 'pendiente',
  loyalty_points integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reservations (
  id uuid not null default gen_random_uuid() primary key,
  hostal_id uuid not null,
  bed_id uuid,
  room_id uuid,
  guest_name text not null,
  guest_email text,
  nationality text,
  channel text default 'directo',
  checkin date not null,
  checkout date not null,
  status text default 'pendiente',
  price numeric,
  payment_method text,
  payment_status text default 'pendiente',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.hostales enable row level security;
alter table public.hostaleros enable row level security;
alter table public.rooms enable row level security;
alter table public.beds enable row level security;
alter table public.guests enable row level security;
alter table public.reservations enable row level security;

drop policy if exists "hostalero ve su hostal" on public.hostales;
create policy "hostalero ve su hostal" on public.hostales
  for select using (id = get_my_hostal_id());

drop policy if exists "director actualiza su hostal" on public.hostales;
create policy "director actualiza su hostal" on public.hostales
  for update
  using (id = get_my_hostal_id() and get_my_rol() = 'Director')
  with check (id = get_my_hostal_id());

drop policy if exists "hostalero ve su perfil" on public.hostaleros;
create policy "hostalero ve su perfil" on public.hostaleros
  for select using (id = auth.uid());

drop policy if exists "director gestiona hostaleros" on public.hostaleros;
create policy "director gestiona hostaleros" on public.hostaleros
  for all
  using (hostal_id = get_my_hostal_id() and get_my_rol() = 'Director')
  with check (hostal_id = get_my_hostal_id() and get_my_rol() = 'Director');

drop policy if exists "hostalero ve su hostal" on public.rooms;
create policy "hostalero ve su hostal" on public.rooms
  for select using (hostal_id = get_my_hostal_id());
drop policy if exists "hostalero inserta en su hostal" on public.rooms;
create policy "hostalero inserta en su hostal" on public.rooms
  for insert with check (hostal_id = get_my_hostal_id());
drop policy if exists "hostalero actualiza en su hostal" on public.rooms;
create policy "hostalero actualiza en su hostal" on public.rooms
  for update
  using (hostal_id = get_my_hostal_id())
  with check (hostal_id = get_my_hostal_id());

drop policy if exists "hostalero ve su hostal" on public.beds;
create policy "hostalero ve su hostal" on public.beds
  for select using (hostal_id = get_my_hostal_id());
drop policy if exists "hostalero inserta en su hostal" on public.beds;
create policy "hostalero inserta en su hostal" on public.beds
  for insert with check (hostal_id = get_my_hostal_id());
drop policy if exists "hostalero actualiza en su hostal" on public.beds;
create policy "hostalero actualiza en su hostal" on public.beds
  for update
  using (hostal_id = get_my_hostal_id())
  with check (hostal_id = get_my_hostal_id());

drop policy if exists "hostalero ve su hostal" on public.guests;
create policy "hostalero ve su hostal" on public.guests
  for select using (hostal_id = get_my_hostal_id());
drop policy if exists "hostalero inserta en su hostal" on public.guests;
create policy "hostalero inserta en su hostal" on public.guests
  for insert with check (hostal_id = get_my_hostal_id());
drop policy if exists "hostalero actualiza en su hostal" on public.guests;
create policy "hostalero actualiza en su hostal" on public.guests
  for update
  using (hostal_id = get_my_hostal_id())
  with check (hostal_id = get_my_hostal_id());

drop policy if exists "hostalero ve su hostal" on public.reservations;
create policy "hostalero ve su hostal" on public.reservations
  for select using (hostal_id = get_my_hostal_id());
drop policy if exists "hostalero inserta en su hostal" on public.reservations;
create policy "hostalero inserta en su hostal" on public.reservations
  for insert with check (hostal_id = get_my_hostal_id());
drop policy if exists "hostalero actualiza en su hostal" on public.reservations;
create policy "hostalero actualiza en su hostal" on public.reservations
  for update
  using (hostal_id = get_my_hostal_id())
  with check (hostal_id = get_my_hostal_id());

create or replace function public.get_review_request_by_token(p_token text)
returns table(id uuid, guest_name text, score smallint, feedback text,
              redirected boolean, google_review_url text, booking_review_url text)
language sql
stable
security definer
set search_path to 'public'
as $function$
    select
      r.id,
      r.guest_name,
      r.score,
      r.feedback,
      r.redirected,
      h.google_review_url,
      h.booking_review_url
    from review_requests r
    join hostales h on h.id = r.hostal_id
    where r.token = p_token
    limit 1;
  $function$;

create or replace function public.submit_review(
  p_token text, p_score smallint, p_feedback text default null::text,
  p_redirected boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
  declare
    v_id uuid;
  begin
    if p_score is null or p_score < 1 or p_score > 5 then
      raise exception 'La puntuación debe estar entre 1 y 5';
    end if;

    update review_requests
    set
      score = p_score,
      feedback = p_feedback,
      redirected = p_redirected,
      responded_at = now()
    where token = p_token
    returning id into v_id;

    return v_id;
  end;
  $function$;

revoke all on function public.get_review_request_by_token(text) from public;
grant execute on function public.get_review_request_by_token(text) to anon, authenticated;
revoke all on function public.submit_review(text, smallint, text, boolean) from public;
grant execute on function public.submit_review(text, smallint, text, boolean) to anon, authenticated;

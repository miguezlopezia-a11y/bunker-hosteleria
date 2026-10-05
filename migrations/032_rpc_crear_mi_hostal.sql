-- Fase B — RPC crear_mi_hostal: alta autoservicio de UN hostal nuevo.
--
-- El usuario YA existe en auth.users (paso 1 del quiz: signup estandar).
-- La RPC crea el hostal nuevo y lo vincula como Director con id = auth.uid().
-- Cierra C-3 por diseno: nadie se adjunta a un hostal ajeno; el unico
-- vinculo Director posible nace de crear-su-propio-hostal. Segunda llamada
-- del mismo usuario -> error limpio (un usuario, como mucho un hostalero,
-- garantizado ademas por hostaleros_pkey + hostaleros_id_fkey).

begin;

create or replace function public.crear_mi_hostal(
  p_nombre text,
  p_direccion text default null,
  p_telefono text default null,
  p_email text default null,
  p_precio_base numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_slug text;
  v_base text;
  v_i integer := 2;
  v_hostal_id uuid;
begin
  if v_uid is null then
    raise exception 'no autenticado' using errcode = '42501';
  end if;

  -- Un usuario, como mucho un hostalero: segunda llamada falla limpio.
  if exists (select 1 from public.hostaleros where id = v_uid) then
    raise exception 'este usuario ya tiene un hostal asociado';
  end if;

  if p_nombre is null or btrim(p_nombre) = '' then
    raise exception 'el nombre del establecimiento es obligatorio';
  end if;

  if p_precio_base is not null and p_precio_base < 0 then
    raise exception 'el precio base no puede ser negativo';
  end if;

  v_email := (select email from auth.users where id = v_uid);

  -- slug derivado del nombre, sin acentos, deduplicado contra los existentes.
  v_base := btrim(regexp_replace(
    lower(translate(btrim(p_nombre),
      'áàäéèëíìïóòöúùuñç', 'aaaeeeiiiooouuunc')),
    '[^a-z0-9]+', '-', 'g'), '-');
  if v_base = '' then
    v_base := 'hostal';
  end if;
  v_slug := v_base;
  while exists (select 1 from public.hostales where slug = v_slug) loop
    v_slug := v_base || '-' || v_i;
    v_i := v_i + 1;
  end loop;

  insert into public.hostales (name, slug, address, phone, email, base_price)
  values (btrim(p_nombre), v_slug, p_direccion, p_telefono, p_email, p_precio_base)
  returning id into v_hostal_id;

  insert into public.hostaleros (id, hostal_id, email, nombre, rol)
  values (v_uid, v_hostal_id, v_email, v_email, 'Director');

  return v_hostal_id;
end;
$$;

revoke all on function public.crear_mi_hostal(text, text, text, text, numeric) from public;
revoke all on function public.crear_mi_hostal(text, text, text, text, numeric) from anon;
grant execute on function public.crear_mi_hostal(text, text, text, text, numeric) to authenticated;

commit;

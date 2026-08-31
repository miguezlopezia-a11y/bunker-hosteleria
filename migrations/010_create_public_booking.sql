-- create_public_booking no existia (404). reservations no tiene guest_document/guest_phone: se recogen en el check-in real, no aqui.

create or replace function public.create_public_booking(
  p_slug text,
  p_bed_label text,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_guest_document text,
  p_guest_nationality text,
  p_checkin date,
  p_checkout date,
  p_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hostal_id uuid;
  v_bed_id uuid;
  v_bed_status text;
begin
  select id into v_hostal_id from public.hostales where slug = p_slug;
  if v_hostal_id is null then
    return jsonb_build_object('exito', false, 'error', 'albergue no encontrado');
  end if;

  select id, status into v_bed_id, v_bed_status
    from public.beds
   where hostal_id = v_hostal_id and label = p_bed_label;
  if v_bed_id is null then
    return jsonb_build_object('exito', false, 'error', 'cama no encontrada');
  end if;

  if exists (
    select 1 from public.reservations
     where bed_id = v_bed_id
       and status <> 'cancelada'
       and checkin < p_checkout
       and checkout > p_checkin
  ) then
    return jsonb_build_object('exito', false, 'error', 'cama no disponible para esas fechas');
  end if;

  insert into public.reservations (
    hostal_id, bed_id, guest_name, guest_email, nationality,
    channel, checkin, checkout, status, price, payment_method, payment_status
  ) values (
    v_hostal_id, v_bed_id, p_guest_name, p_guest_email, p_guest_nationality,
    'directo', p_checkin, p_checkout, 'confirmada', p_price, 'tarjeta', 'pendiente'
  );

  return jsonb_build_object('exito', true);
exception when others then
  return jsonb_build_object('exito', false, 'error', 'error interno, inténtalo de nuevo');
end;
$$;

revoke all on function public.create_public_booking(text, text, text, text, text, text, text, date, date, numeric) from public;
grant execute on function public.create_public_booking(text, text, text, text, text, text, text, date, date, numeric) to anon, authenticated;

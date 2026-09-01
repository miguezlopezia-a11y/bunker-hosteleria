-- Debug 09-01: 401 en pg_net->send-email por header apikey ausente y key legacy (219) en vez del secret nuevo (41).
-- Pega la secret key nueva (Project Settings -> API Keys, no Legacy) donde dice TU_SECRET_KEY_NUEVA_AQUI.
update app_secrets
set value = 'TU_SECRET_KEY_NUEVA_AQUI'
where key = 'service_role_key';

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
set search_path = public, extensions
as $$
declare
  v_hostal_id uuid;
  v_bed_id uuid;
  v_bed_status text;
  v_hostal_name text;
  v_service_key text;
begin
  select id, name into v_hostal_id, v_hostal_name from public.hostales where slug = p_slug;
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

  begin
    select value into v_service_key from public.app_secrets where key = 'service_role_key';
    if v_service_key is not null and p_guest_email is not null then
      perform net.http_post(
        url := 'https://fyhehiqvygbabwwllpvb.supabase.co/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_key,
          'apikey', v_service_key
        ),
        body := jsonb_build_object(
          'to', p_guest_email,
          'template', 'booking_confirmation',
          'variables', jsonb_build_object(
            'guestName', p_guest_name,
            'hostalName', v_hostal_name,
            'checkin', p_checkin,
            'checkout', p_checkout,
            'bedLabel', p_bed_label
          ),
          'hostal_id', v_hostal_id
        ),
        timeout_milliseconds := 5000
      );
    end if;
  exception when others then
    null;
  end;

  return jsonb_build_object('exito', true);
exception when others then
  return jsonb_build_object('exito', false, 'error', 'error interno, inténtalo de nuevo');
end;
$$;

revoke all on function public.create_public_booking(text, text, text, text, text, text, text, date, date, numeric) from public;
grant execute on function public.create_public_booking(text, text, text, text, text, text, text, date, date, numeric) to anon, authenticated;

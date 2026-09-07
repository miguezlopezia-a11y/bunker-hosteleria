-- 019_registrar_entrada_peregrino.sql — Fase C del check-in remoto OTP
--
-- Marca la entrada de un peregrino que completó el check-in online (015: OTP
-- verificado; 018: enlace de firma). Precondiciones duras, en orden:
--   1. la reserva existe, no está cancelada y no tiene ya check-in completado
--      (cubre el solape del flujo presencial y el remoto sobre la misma reserva,
--      que si no duplicaría la fila en guests — decisión de Pablo, 2026-09-07)
--   2. el caller es hostalero DEL hostal de la reserva (get_my_hostal_id())
--   3. hay huesped con verificado_otp_at no nulo para la reserva
--   4. entrada_at es null (ancla de idempotencia del flujo remoto)
--   5. firma_digital_url no es null — la firma es requisito legal (RD 933/2021),
--      sin ella no se registra la entrada (decisión de Pablo, 2026-09-07)
--
-- Replica en servidor la lógica de checkInReservation (AppContext.jsx:394):
--   reservations.status = 'checkin_completado'
--   insert en guests (payment_status 'pagado', loyalty_points = round(price))
--   unidad occupied: beds.status (bed_id) o rooms.occupancy_status (room_id) — XOR 016
-- y además: huespedes.entrada_at = now()
--
-- Seguridad: solo authenticated, y el caller debe ser hostalero del hostal de la
-- reserva (get_my_hostal_id(), la misma función que usan las RLS de la 003).
--
-- (Aplicada en producción el 2026-09-07 tal cual, sin begin/commit.)

create or replace function public.registrar_entrada_peregrino(p_reservation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  h record;
begin
  select id, hostal_id, bed_id, room_id, guest_name, guest_email, nationality,
         checkin, checkout, price, status
    into r
    from public.reservations
   where id = p_reservation_id;

  if not found then
    return jsonb_build_object('exito', false, 'error', 'reserva no encontrada');
  end if;

  -- Autorización: el hostalero autenticado solo toca reservas de SU hostal
  if r.hostal_id is distinct from public.get_my_hostal_id() then
    return jsonb_build_object('exito', false, 'error', 'no autorizado');
  end if;

  if r.status = 'cancelada' then
    return jsonb_build_object('exito', false, 'error', 'la reserva está cancelada');
  end if;

  -- Solape presencial/remoto: si el check-in ya se completó por cualquier vía,
  -- no continuar (evitaría duplicar la fila en guests)
  if r.status = 'checkin_completado' then
    return jsonb_build_object('exito', false, 'error', 'esta reserva ya tiene el check-in completado');
  end if;

  -- Debe existir el check-in online verificado (015) y no tener entrada previa
  select id, nombre, apellidos, num_documento, pais_nacionalidad, email,
         entrada_at, firma_digital_url
    into h
    from public.huespedes
   where reservation_id = p_reservation_id
     and verificado_otp_at is not null;

  if not found then
    return jsonb_build_object('exito', false, 'error', 'esta reserva no tiene el check-in online verificado');
  end if;

  if h.entrada_at is not null then
    return jsonb_build_object('exito', false, 'error', 'la entrada de esta reserva ya está registrada');
  end if;

  -- Firma obligatoria (RD 933/2021): sin ella no se registra la entrada
  if h.firma_digital_url is null then
    return jsonb_build_object('exito', false, 'error', 'falta la firma del huésped');
  end if;

  begin
    update public.reservations
       set status = 'checkin_completado', updated_at = now()
     where id = r.id;

    -- guests_exactly_one_unit (016): bed_id XOR room_id, tal como vienen de la reserva
    insert into public.guests (
      hostal_id, reservation_id, bed_id, room_id,
      name, email, document, nationality,
      checkin, checkout, price, payment_status, loyalty_points
    ) values (
      r.hostal_id, r.id, r.bed_id, r.room_id,
      h.nombre || ' ' || h.apellidos,
      coalesce(h.email, r.guest_email),
      h.num_documento,
      coalesce(h.pais_nacionalidad, r.nationality),
      r.checkin, r.checkout, r.price, 'pagado', round(r.price)
    );

    if r.bed_id is not null then
      update public.beds set status = 'occupied' where id = r.bed_id;
    else
      update public.rooms set occupancy_status = 'occupied' where id = r.room_id;
    end if;

    update public.huespedes set entrada_at = now() where id = h.id;
  exception when others then
    return jsonb_build_object('exito', false, 'error', 'error interno, inténtalo de nuevo');
  end;

  return jsonb_build_object('exito', true);
end;
$$;

revoke all on function public.registrar_entrada_peregrino(uuid) from public;
grant execute on function public.registrar_entrada_peregrino(uuid) to authenticated;

-- Verificación manual (SQL Editor):
--   select public.registrar_entrada_peregrino('0ef5c62d-9fee-45e7-b943-1df606149e25');
--   -- sin firma todavía: {"exito": false, "error": "falta la firma del huésped"}
--   -- con firma hecha y sesión de hostalero del hostal demo: {"exito": true}
--   --   → huespedes.entrada_at relleno, reservations.status='checkin_completado',
--   --     fila en guests, cama 1A occupied.
--   -- segunda llamada: {"error": "la entrada de esta reserva ya está registrada"}

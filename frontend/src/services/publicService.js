import { supabase } from '../lib/supabase';

export const publicService = {
  listPublicHostales: () => supabase.rpc('list_public_hostales'),

  getHostalBySlug: (slug) => supabase.rpc('get_hostal_by_slug', { p_slug: slug }).single(),

  getBedsByHostalSlug: (slug) => supabase.rpc('get_beds_by_hostal_slug', { p_slug: slug }),

  // Habitaciones privadas de un albergue, con estado (libre/ocupada) para la
  // fecha indicada. RPC de la migración 022 (pendiente de aplicar en prod).
  getRoomsByHostalSlug: (slug, date) =>
    supabase.rpc('get_rooms_by_hostal_slug', { p_slug: slug, p_date: date || null }),

  // Reserva pública de habitación privada: sin precio (lo calcula el servidor)
  // y sin teléfono/documento (no los acepta la RPC). YA aplicada en prod.
  createPublicBookingRoom: ({
    slug,
    roomName,
    guestName,
    guestEmail,
    guestNationality,
    checkin,
    checkout,
  }) =>
    supabase.rpc('create_public_booking_room', {
      p_slug: slug,
      p_room_name: roomName,
      p_guest_name: guestName,
      p_guest_email: guestEmail,
      p_guest_nationality: guestNationality,
      p_checkin: checkin,
      p_checkout: checkout,
    }),

  createPublicBooking: ({
    slug,
    bedLabel,
    guestName,
    guestEmail,
    guestNationality,
    checkin,
    checkout,
  }) =>
    // Sin price/phone/document: el precio lo calcula el servidor
    // (base_price × noches, migración 025) y teléfono/documento se recogen
    // en el check-in real, no aquí.
    supabase.rpc('create_public_booking', {
      p_slug: slug,
      p_bed_label: bedLabel,
      p_guest_name: guestName,
      p_guest_email: guestEmail,
      p_guest_nationality: guestNationality,
      p_checkin: checkin,
      p_checkout: checkout,
    }),
};

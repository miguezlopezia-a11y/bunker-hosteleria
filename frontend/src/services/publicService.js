import { supabase } from '../lib/supabase';

export const publicService = {
  listPublicHostales: () => supabase.rpc('list_public_hostales'),

  getHostalBySlug: (slug) => supabase.rpc('get_hostal_by_slug', { p_slug: slug }).single(),

  getBedsByHostalSlug: (slug) => supabase.rpc('get_beds_by_hostal_slug', { p_slug: slug }),

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

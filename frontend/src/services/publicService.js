import { supabase } from '../lib/supabase';

export const publicService = {
  getHostalBySlug: (slug) => supabase.rpc('get_hostal_by_slug', { p_slug: slug }).single(),

  getBedsByHostalSlug: (slug) => supabase.rpc('get_beds_by_hostal_slug', { p_slug: slug }),

  createPublicBooking: ({
    slug,
    bedLabel,
    guestName,
    guestEmail,
    guestPhone,
    guestDocument,
    guestNationality,
    checkin,
    checkout,
    price,
  }) =>
    supabase.rpc('create_public_booking', {
      p_slug: slug,
      p_bed_label: bedLabel,
      p_guest_name: guestName,
      p_guest_email: guestEmail,
      p_guest_phone: guestPhone,
      p_guest_document: guestDocument,
      p_guest_nationality: guestNationality,
      p_checkin: checkin,
      p_checkout: checkout,
      p_price: price,
    }),
};

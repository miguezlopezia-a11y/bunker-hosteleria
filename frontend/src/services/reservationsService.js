import { supabase } from '../lib/supabase';

export const reservationsService = {
  listByHostal: (hostalId) =>
    supabase.from('reservations').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }),

  create: (reservation) => supabase.from('reservations').insert(reservation).select(),

  update: (id, updates) => supabase.from('reservations').update(updates).eq('id', id).select(),
};

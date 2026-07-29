import { supabase } from '../lib/supabase';

export const guestsService = {
  listByHostal: (hostalId) =>
    supabase.from('guests').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }),

  create: (guest) => supabase.from('guests').insert(guest).select(),

  getById: (id) => supabase.from('guests').select('*').eq('id', id).single(),

  update: (id, updates) => supabase.from('guests').update(updates).eq('id', id).select(),
};

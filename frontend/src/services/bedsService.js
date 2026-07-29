import { supabase } from '../lib/supabase';

export const bedsService = {
  listByHostal: (hostalId) =>
    supabase.from('beds').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: true }),

  update: (id, updates) => supabase.from('beds').update(updates).eq('id', id).select(),
};

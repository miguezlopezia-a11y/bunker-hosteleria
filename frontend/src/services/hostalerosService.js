import { supabase } from '../lib/supabase';

export const hostalerosService = {
  listByHostal: (hostalId) =>
    supabase.from('hostaleros').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: true }),

  update: (id, updates) => supabase.from('hostaleros').update(updates).eq('id', id).select(),
};

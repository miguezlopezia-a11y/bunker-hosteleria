import { supabase } from '../lib/supabase';

export const fichajesService = {
  listByHostal: (hostalId) =>
    supabase.from('fichajes').select('*').eq('hostal_id', hostalId).order('timestamp', { ascending: false }),

  create: (record) => supabase.from('fichajes').insert(record).select(),
};

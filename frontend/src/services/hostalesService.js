import { supabase } from '../lib/supabase';

export const hostalesService = {
  getById: (id) => supabase.from('hostales').select('*').eq('id', id).single(),

  update: (id, updates) => supabase.from('hostales').update(updates).eq('id', id).select(),
};

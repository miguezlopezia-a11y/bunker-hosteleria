import { supabase } from '../lib/supabase';

export const loyaltyService = {
  listByHostal: (hostalId) =>
    supabase.from('loyalty_members').select('*').eq('hostal_id', hostalId).order('points', { ascending: false }),

  create: (member) => supabase.from('loyalty_members').insert(member).select(),

  update: (id, updates) => supabase.from('loyalty_members').update(updates).eq('id', id).select(),

  delete: (id) => supabase.from('loyalty_members').delete().eq('id', id),
};

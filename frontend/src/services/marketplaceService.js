import { supabase } from '../lib/supabase';

export const marketplaceService = {
  listByHostal: (hostalId) =>
    supabase.from('marketplace_services').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: true }),

  create: (service) => supabase.from('marketplace_services').insert(service).select(),

  update: (id, updates) => supabase.from('marketplace_services').update(updates).eq('id', id).select(),
};

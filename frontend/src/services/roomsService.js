import { supabase } from '../lib/supabase';

export const roomsService = {
  listByHostal: (hostalId) =>
    supabase.from('rooms').select('*').eq('hostal_id', hostalId).order('name', { ascending: true }),

  create: (room) => supabase.from('rooms').insert(room).select(),

  update: (id, updates) => supabase.from('rooms').update(updates).eq('id', id).select(),

  delete: (id) => supabase.from('rooms').delete().eq('id', id),
};

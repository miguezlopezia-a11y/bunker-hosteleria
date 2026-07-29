import { supabase } from '../lib/supabase';

export const notificationsService = {
  listByHostal: (hostalId) =>
    supabase.from('notifications').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }),

  create: (notification) => supabase.from('notifications').insert(notification).select(),

  markRead: (id) => supabase.from('notifications').update({ read: true }).eq('id', id).select(),
};

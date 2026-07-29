import { supabase } from '../lib/supabase';

export const reviewRequestsService = {
  listByHostal: (hostalId) =>
    supabase
      .from('review_requests')
      .select('*')
      .eq('hostal_id', hostalId)
      .order('created_at', { ascending: false }),

  create: (record) =>
    supabase.from('review_requests').insert(record).select('id, token').single(),

  update: (id, updates) =>
    supabase.from('review_requests').update(updates).eq('id', id).select(),

  markManaged: (id) =>
    supabase.from('review_requests').update({ managed: true }).eq('id', id).select(),

  getByToken: (token) =>
    supabase
      .from('review_requests')
      .select('*, hostales(name, google_review_url, booking_review_url)')
      .eq('token', token)
      .single(),
};

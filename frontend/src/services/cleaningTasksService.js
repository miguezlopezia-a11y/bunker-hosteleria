import { supabase } from '../lib/supabase';

export const cleaningTasksService = {
  listByHostal: (hostalId) =>
    supabase.from('cleaning_tasks').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }),

  create: (task) => supabase.from('cleaning_tasks').insert(task).select(),

  update: (id, updates) => supabase.from('cleaning_tasks').update(updates).eq('id', id).select(),

  markDone: (id) =>
    supabase
      .from('cleaning_tasks')
      .update({ status: 'completada', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select(),
};

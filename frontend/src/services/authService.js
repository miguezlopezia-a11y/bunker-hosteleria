import { supabase } from '../lib/supabase';

export const authService = {
  signIn: ({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback),

  getHostalero: async (userId) => {
    const { data, error } = await supabase
      .from('hostaleros')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },
};

import { supabase } from '../lib/supabase';

export const employeesService = {
  create: async ({ email, nombre, rol }) => {
    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: { email, nombre, rol },
    });
    return { data, error };
  },
};

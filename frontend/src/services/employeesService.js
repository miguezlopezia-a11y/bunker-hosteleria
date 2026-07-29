import { supabase } from '../lib/supabase';

export const employeesService = {
  create: async ({ email, password, nombre, rol }) => {
    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: { email, password, nombre, rol },
    });
    return { data, error };
  },
};

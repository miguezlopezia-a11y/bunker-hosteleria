import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'test') {
    // Valores dummy para que los tests puedan mockear el cliente sin fallar al importar.
    createClient('http://localhost', 'dummy');
  } else {
    throw new Error(
      'Faltan las variables de entorno REACT_APP_SUPABASE_URL y/o REACT_APP_SUPABASE_ANON_KEY'
    );
  }
}

export const supabase = createClient(supabaseUrl || 'http://localhost', supabaseAnonKey || 'dummy');

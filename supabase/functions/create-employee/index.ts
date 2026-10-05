// Edge Function: alta de empleados por un Director del hostal.
// Crea un usuario en auth.users con metadata que el trigger handle_new_user
// convierte en fila de public.hostaleros.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('No autenticado');
    }

    const { data: hostalero, error: hostaleroError } = await supabaseClient
      .from('hostaleros')
      .select('rol, hostal_id')
      .eq('id', user.id)
      .single();

    if (hostaleroError || !hostalero || hostalero.rol !== 'Director') {
      throw new Error('No autorizado');
    }

    const { email, password, nombre, rol } = await req.json();
    if (!email || !password || !nombre || !rol) {
      throw new Error('Datos incompletos');
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        hostal_id: hostalero.hostal_id,
        nombre,
        rol,
      },
    });

    if (createError || !newUser?.user) {
      throw new Error(createError?.message ?? 'No se pudo crear el usuario');
    }

    return new Response(
      JSON.stringify({ id: newUser.user.id, email: newUser.user.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

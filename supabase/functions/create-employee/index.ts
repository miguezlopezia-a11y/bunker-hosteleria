// Edge Function: invitación de empleados por un Director del hostal (Fase C,
// tarea onboarding-autoservicio). Sustituye al alta con contraseña fijada por
// el Director (antipatrón: un tercero conocía la contraseña inicial).
//
// Flujo: el Director autenticado manda {email, nombre, rol} → inviteUserByEmail
// crea el usuario en auth.users → esta función vincula la fila en
// public.hostaleros con el hostal_id de la SESIÓN del Director (nunca de
// metadata del invitado — cierre C-3). El invitado fija su contraseña desde
// el email (mismo auth estándar: sirve para panel y fichaje).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeadersFor, normalizeInvitePayload } from './utils.ts';

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Sesión del caller: mismo patrón que send-email.
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

    // El hostal_id sale de la fila del propio Director (RLS de su sesión),
    // nunca de algo que mande el cliente.
    const { data: hostalero, error: hostaleroError } = await supabaseClient
      .from('hostaleros')
      .select('rol, hostal_id')
      .eq('id', user.id)
      .single();

    if (hostaleroError || !hostalero || hostalero.rol !== 'Director') {
      throw new Error('No autorizado');
    }

    const parsed = normalizeInvitePayload(await req.json());
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    const { email, nombre, rol } = parsed.value;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // inviteUserByEmail crea el usuario (sin confirmar) y envía el email para
    // que el invitado fije su contraseña.
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      { data: { nombre, rol } },
    );

    if (inviteError || !invited?.user) {
      const msg = inviteError?.message ?? 'No se pudo enviar la invitación';
      if (/already (been )?registered|already exists/i.test(msg)) {
        throw new Error('Ya existe un usuario con ese email');
      }
      throw new Error(msg);
    }

    // Vinculación server-side. La FK hostaleros.id -> auth.users(id) se
    // satisface porque inviteUserByEmail ya creó el usuario.
    const { error: linkError } = await adminClient.from('hostaleros').insert({
      id: invited.user.id,
      hostal_id: hostalero.hostal_id,
      email,
      nombre,
      rol,
    });

    if (linkError) {
      // Best-effort: sin fila de hostaleros la invitación quedaría huérfana.
      await adminClient.auth.admin.deleteUser(invited.user.id);
      throw new Error('No se pudo vincular el empleado a tu hostal');
    }

    return new Response(
      JSON.stringify({ id: invited.user.id, email, invited: true }),
      { headers: { ...cors, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...cors, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

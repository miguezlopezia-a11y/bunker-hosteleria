// Edge Function: invitación de empleados por un Director del hostal (Fase C,
// tarea onboarding-autoservicio). Sustituye al alta con contraseña fijada por
// el Director (antipatrón: un tercero conocía la contraseña inicial).
//
// Flujo: el Director autenticado manda {email, nombre, rol} → inviteUserByEmail
// crea el usuario en auth.users → esta función vincula la fila en
// public.hostaleros con el hostal_id de la SESIÓN del Director (nunca de
// metadata del invitado — cierre C-3). El invitado fija su contraseña desde
// el email (mismo auth estándar: sirve para panel y fichaje).
//
// Archivo único (no utils.ts separado): el Dashboard de Supabase no permite
// crear un segundo archivo en el editor de una función ya existente sin
// arriesgar el mismo bloqueo que M-1 (orphaned functions, _shared/cors.ts no
// deployable). utils.ts/utils.test.ts se mantienen solo para test local.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://pwa-hostaleria.miguezlopezia.workers.dev',
  'https://bunkerhostal.com',
  'http://localhost:3000',
];

const CORS_BASE = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function corsHeadersFor(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { ...CORS_BASE, 'Access-Control-Allow-Origin': origin };
  }
  return { ...CORS_BASE };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: unknown): boolean {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

const INVITABLE_ROLES = ['Recepción', 'Empleado'];

function normalizeInvitePayload(
  body: unknown,
): { ok: true; value: { email: string; nombre: string; rol: string } } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const nombre = typeof b.nombre === 'string' ? b.nombre.trim() : '';
  const rol = typeof b.rol === 'string' ? b.rol.trim() : '';
  if (!email || !nombre || !rol) return { ok: false, error: 'Datos incompletos' };
  if (!isValidEmail(email)) return { ok: false, error: 'Email no válido' };
  if (!INVITABLE_ROLES.includes(rol)) {
    return { ok: false, error: 'Rol no invitable (solo Recepción o Empleado)' };
  }
  return { ok: true, value: { email, nombre, rol } };
}

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

    const parsed = normalizeInvitePayload(await req.json());
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }
    const { email, nombre, rol } = parsed.value;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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

    const { error: linkError } = await adminClient.from('hostaleros').insert({
      id: invited.user.id,
      hostal_id: hostalero.hostal_id,
      email,
      nombre,
      rol,
    });

    if (linkError) {
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

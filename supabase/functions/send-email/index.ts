import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@^2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildEmail,
  corsHeadersFor,
  isValidEmail,
  recipientExists,
} from './utils.ts';

// A-4/M-1 (auditoría 2026-09-10): variables escapadas y URLs validadas en
// utils.buildEmail; destinatario validado contra una reserva/huésped/reseña
// real del hostal; CORS restringido a orígenes conocidos (nunca '*').
export async function handler(req: Request): Promise<Response> {
  const cors = corsHeadersFor(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { to, template, variables, hostal_id } = await req.json();

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  const callerToken = authHeader.replace('Bearer ', '');
  const isServiceCall = callerToken === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!isServiceCall) {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(callerToken);
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: cors });

    const { data: hostalero } = await supabaseAdmin
      .from('hostaleros')
      .select('hostal_id')
      .eq('id', user.id)
      .single();

    if (!hostalero || hostalero.hostal_id !== hostal_id) {
      return new Response('Forbidden', { status: 403, headers: cors });
    }
  }

  if (!isValidEmail(to) || !hostal_id) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const email = buildEmail(template, variables);
  if (!email) {
    return new Response(JSON.stringify({ error: 'unknown_template' }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  // A-4: relay cerrado — el destinatario debe ser real para este hostal,
  // también en la rama service role (la invoca create_public_booking con
  // datos que vienen del anon).
  if (!(await recipientExists(supabaseAdmin, hostal_id, to))) {
    return new Response(JSON.stringify({ error: 'unknown_recipient' }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 403,
    });
  }

  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject: email.subject,
      html: email.html,
    });
    return new Response(JSON.stringify(result), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'email_failed' }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

// import.meta.main: los tests importan handler/utils sin levantar el servidor.
if (import.meta.main) {
  serve(handler);
}

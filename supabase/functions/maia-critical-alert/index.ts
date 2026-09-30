import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@^2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';
import { escapeHtml } from '../_shared/html.ts';

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { message, hostal_id } = await req.json().catch(() => ({}));
  if (!message || !hostal_id) {
    return new Response(JSON.stringify({ error: 'missing_params' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const { data: hostalero } = await supabaseAdmin.from('hostaleros').select('hostal_id').eq('id', user.id).single();
  if (!hostalero || hostalero.hostal_id !== hostal_id) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    });
  }

  try {
    const { data: hostal } = await supabaseAdmin.from('hostales').select('email, name').eq('id', hostal_id).single();
    const to = hostal?.email;
    if (!to) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const result = await resend.emails.send({
      from: 'alertas@bunkerhostal.com',
      to,
      subject: `Alerta crítica — ${escapeHtml(hostal.name)}`,
      html: `<p><strong>MaiA ha detectado una alerta crítica en ${escapeHtml(hostal.name)}:</strong></p><p>${escapeHtml(message)}</p><p><a href="${Deno.env.get('PUBLIC_APP_URL') || ''}/maia">Ver panel MaiA</a></p>`,
    });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Critical alert email error:', err);
    return new Response(JSON.stringify({ error: 'email_failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

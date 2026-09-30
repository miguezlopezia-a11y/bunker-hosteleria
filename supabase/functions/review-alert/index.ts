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

  const { token, score, feedback } = await req.json().catch(() => ({}));
  if (!token || score == null) {
    return new Response(JSON.stringify({ error: 'missing_params' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  try {
    const { data: reviewReq } = await supabaseAdmin
      .from('review_requests')
      .select('*, hostal:hostal_id(id, email, name)')
      .eq('token', token)
      .single();

    if (!reviewReq) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const hostal = reviewReq.hostal;
    const message = `Reseña interna ${score}/5 de ${reviewReq.guest_name}${feedback ? ': ' + feedback : ''}`;

    await supabaseAdmin.from('notifications').insert({
      hostal_id: reviewReq.hostal_id,
      type: 'alerta',
      message,
      dedup_key: `review-alert-${reviewReq.id}`,
    });

    if (hostal?.email) {
      await resend.emails.send({
        from: 'alertas@bunkerhostal.com',
        to: hostal.email,
        subject: `Alerta de reseña — ${escapeHtml(hostal.name)}`,
        html: `<p><strong>${escapeHtml(reviewReq.guest_name)}</strong> ha dejado una valoración de ${escapeHtml(score)}/5.</p>${feedback ? `<p>Comentario: ${escapeHtml(feedback)}</p>` : ''}<p><a href="${Deno.env.get('PUBLIC_APP_URL') || ''}/fidelizacion">Gestionar reseñas</a></p>`,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Review alert error:', err);
    return new Response(JSON.stringify({ error: 'alert_failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

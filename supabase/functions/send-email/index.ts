import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@^2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { to, template, variables, hostal_id } = await req.json();

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  const callerToken = authHeader.replace('Bearer ', '');
  const isServiceCall = callerToken === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!isServiceCall) {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(callerToken);
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    const { data: hostalero } = await supabaseAdmin
      .from('hostaleros')
      .select('hostal_id')
      .eq('id', user.id)
      .single();

    if (!hostalero || hostalero.hostal_id !== hostal_id) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  let subject, html;

  if (template === 'booking_confirmation') {
    subject = `Reserva confirmada — ${variables.hostalName}`;
    // checkinUrl es opcional (compat con llamantes previos a la 021).
    const checkinLink = variables.checkinUrl
      ? '<p>Puedes hacer tu check-in online y ahorrar tiempo a la llegada:</p>' +
        '<p><a href="' + variables.checkinUrl + '">Hacer mi check-in online</a></p>'
      : '';
    html = `<p>Hola ${variables.guestName},</p>
            <p>Tu reserva en <strong>${variables.hostalName}</strong> está confirmada.</p>
            <p>Entrada: ${variables.checkin} · Salida: ${variables.checkout} · Cama: ${variables.bedLabel}</p>
            ${checkinLink}`;
  } else if (template === 'checkin_otp') {
    subject = `Tu código de check-in — ${variables.hostalName}`;
    html = `<p>Hola ${variables.guestName},</p>
            <p>Tu código para completar el check-in online en <strong>${variables.hostalName}</strong> es:</p>
            <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${variables.codigo}</p>
            <p>Caduca en 10 minutos. Si no has pedido este código, ignora este correo.</p>`;
  } else if (template === 'survey') {
    subject = `¿Cómo fue tu estancia en ${variables.hostalName}?`;
    html = `<p>Hola ${variables.guestName},</p>
            <p>¿Nos dejas tu valoración? Solo 10 segundos:</p>
            <p><a href="${variables.surveyUrl}">Valorar mi estancia</a></p>`;
  } else {
    return new Response('Unknown template', { status: 400 });
  }

  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject,
      html,
    });
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'email_failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// utils.ts — helpers puros de send-email (sin imports de Deno) para poder
// testearlos con node. A-4/M-1 (auditoría seguridad 2026-09-10):
// escaping de variables interpoladas en HTML, validación de URLs y CORS
// restringido a los orígenes reales del panel/PWA.

// Orígenes que pueden llamar a la función desde un navegador. Las llamadas
// servidor-a-servidor (pg_net) no mandan Origin y no se ven afectadas.
export const ALLOWED_ORIGINS = [
  'https://pwa-hostaleria.miguezlopezia.workers.dev',
  'https://bunkerhostal.com',
  'http://localhost:3000',
];

const CORS_BASE = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ACAO solo si el Origin está en la lista; si no, sin cabecera (el navegador
// bloquea la respuesta). Nunca '*'.
export function corsHeadersFor(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { ...CORS_BASE, 'Access-Control-Allow-Origin': origin };
  }
  return { ...CORS_BASE };
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

// URLs que van a un href (checkinUrl, surveyUrl): solo https, escapada.
// Cualquier otra cosa (incl. javascript:, data:, http:) se descarta.
export function safeHttpsUrl(value: unknown): string {
  try {
    const u = new URL(String(value ?? ''));
    if (u.protocol !== 'https:') return '';
    return escapeHtml(u.toString());
  } catch {
    return '';
  }
}

export interface EmailContent {
  subject: string;
  html: string;
}

// Construye asunto + HTML con TODAS las variables escapadas. Devuelve null
// si la plantilla no existe.
export function buildEmail(template: string, variables: any): EmailContent | null {
  const v = variables ?? {};
  if (template === 'booking_confirmation') {
    const checkinUrl = safeHttpsUrl(v.checkinUrl);
    // checkinUrl es opcional (compat con llamantes previos a la 021).
    const checkinLink = checkinUrl
      ? '<p>Puedes hacer tu check-in online y ahorrar tiempo a la llegada:</p>' +
        '<p><a href="' + checkinUrl + '">Hacer mi check-in online</a></p>'
      : '';
    return {
      subject: `Reserva confirmada — ${escapeHtml(v.hostalName)}`,
      html: `<p>Hola ${escapeHtml(v.guestName)},</p>
             <p>Tu reserva en <strong>${escapeHtml(v.hostalName)}</strong> está confirmada.</p>
             <p>Entrada: ${escapeHtml(v.checkin)} · Salida: ${escapeHtml(v.checkout)} · Cama: ${escapeHtml(v.bedLabel)}</p>
             ${checkinLink}`,
    };
  }
  if (template === 'checkin_otp') {
    return {
      subject: `Tu código de check-in — ${escapeHtml(v.hostalName)}`,
      html: `<p>Hola ${escapeHtml(v.guestName)},</p>
             <p>Tu código para completar el check-in online en <strong>${escapeHtml(v.hostalName)}</strong> es:</p>
             <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${escapeHtml(v.codigo)}</p>
             <p>Caduca en 10 minutos. Si no has pedido este código, ignora este correo.</p>`,
    };
  }
  if (template === 'survey') {
    const surveyUrl = safeHttpsUrl(v.surveyUrl);
    if (!surveyUrl) return null; // encuesta sin URL válida no se envía
    return {
      subject: `¿Cómo fue tu estancia en ${escapeHtml(v.hostalName)}?`,
      html: `<p>Hola ${escapeHtml(v.guestName)},</p>
             <p>¿Nos dejas tu valoración? Solo 10 segundos:</p>
             <p><a href="${surveyUrl}">Valorar mi estancia</a></p>`,
    };
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): boolean {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

// A-4: el destinatario debe existir como email de una reserva, huésped o
// solicitud de reseña del hostal indicado. Cierra el relay anon → víctima
// arbitraria vía create_public_booking. Fail-closed: si la consulta falla,
// no se envía (el OTP se puede reintentar en 1 minuto).
export async function recipientExists(
  supabaseAdmin: any,
  hostalId: string,
  to: string,
): Promise<boolean> {
  const head = { head: true, count: 'exact' } as const;
  const [res, gue, rev] = await Promise.all([
    supabaseAdmin.from('reservations').select('id', head).eq('hostal_id', hostalId).eq('guest_email', to),
    supabaseAdmin.from('guests').select('id', head).eq('hostal_id', hostalId).eq('email', to),
    supabaseAdmin.from('review_requests').select('id', head).eq('hostal_id', hostalId).eq('guest_email', to),
  ]);
  if (res.error || gue.error || rev.error) return false;
  return [res, gue, rev].some((r) => (r.count ?? 0) > 0);
}

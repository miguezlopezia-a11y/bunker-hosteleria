// utils.ts — helpers puros de create-employee (sin imports de Deno) para
// poder testearlos con node. Fase C (tarea onboarding-autoservicio):
// invitación por email en vez de contraseña fijada por el Director, y CORS
// restringido a los orígenes reales del panel/PWA (mismo patrón que
// send-email/utils.ts, A-4/M-1).

// Orígenes que pueden llamar a la función desde un navegador.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): boolean {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

// El Director invita personal no-directivo. 'Director' se excluye: el alta de
// un segundo Director es decisión de producto, no algo que esta función dé.
const INVITABLE_ROLES = ['Recepción', 'Empleado'] as const;

export type InvitePayload = { email: string; nombre: string; rol: string };

export function normalizeInvitePayload(
  body: unknown,
): { ok: true; value: InvitePayload } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const nombre = typeof b.nombre === 'string' ? b.nombre.trim() : '';
  const rol = typeof b.rol === 'string' ? b.rol.trim() : '';
  if (!email || !nombre || !rol) return { ok: false, error: 'Datos incompletos' };
  if (!isValidEmail(email)) return { ok: false, error: 'Email no válido' };
  if (!(INVITABLE_ROLES as readonly string[]).includes(rol)) {
    return { ok: false, error: 'Rol no invitable (solo Recepción o Empleado)' };
  }
  return { ok: true, value: { email, nombre, rol } };
}

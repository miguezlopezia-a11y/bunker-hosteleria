export const ALLOWED_ORIGINS = [
  'https://pwa-hostaleria.miguezlopezia.workers.dev',
  'https://bunkerhostal.com',
  'http://localhost:3000',
];

const CORS_BASE = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function corsHeadersFor(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { ...CORS_BASE, 'Access-Control-Allow-Origin': origin };
  }
  return { ...CORS_BASE };
}

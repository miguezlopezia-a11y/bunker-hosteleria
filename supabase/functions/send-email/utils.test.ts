// Tests de los helpers puros de send-email (A-4/M-1, auditoría 2026-09-10).
// Ejecutar: npx tsx --test supabase/functions/send-email/utils.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEmail,
  corsHeadersFor,
  escapeHtml,
  isValidEmail,
  recipientExists,
  safeHttpsUrl,
} from './utils.ts';

test('escapeHtml neutraliza inyección HTML', () => {
  assert.equal(
    escapeHtml('<script>alert(1)</script>"\'&'),
    '&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;&amp;',
  );
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
});

test('safeHttpsUrl: solo https, escapada; el resto se descarta', () => {
  assert.equal(safeHttpsUrl('https://app.example/checkin?r=1'), 'https://app.example/checkin?r=1');
  assert.equal(safeHttpsUrl('http://insegura.example/x'), '');
  assert.equal(safeHttpsUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpsUrl('data:text/html,<h1>x</h1>'), '');
  assert.equal(safeHttpsUrl('no-es-url'), '');
  assert.equal(safeHttpsUrl(null), '');
  assert.equal(safeHttpsUrl('https://x.example/"><script>'), 'https://x.example/%22%3E%3Cscript%3E');
});

test('corsHeadersFor: ACAO solo para orígenes conocidos, nunca *', () => {
  assert.equal(
    corsHeadersFor('https://pwa-hostaleria.miguezlopezia.workers.dev')['Access-Control-Allow-Origin'],
    'https://pwa-hostaleria.miguezlopezia.workers.dev',
  );
  assert.equal(corsHeadersFor('http://localhost:3000')['Access-Control-Allow-Origin'], 'http://localhost:3000');
  assert.equal(corsHeadersFor('https://evil.example')['Access-Control-Allow-Origin'], undefined);
  assert.equal(corsHeadersFor(null)['Access-Control-Allow-Origin'], undefined);
  for (const h of [corsHeadersFor('https://evil.example'), corsHeadersFor(null)]) {
    assert.ok(h['Access-Control-Allow-Headers'].includes('authorization'));
  }
});

test('buildEmail: booking_confirmation escapa todas las variables', () => {
  const email = buildEmail('booking_confirmation', {
    guestName: '<img src=x onerror=alert(1)>',
    hostalName: 'Albergue <b>Falso</b>',
    checkin: '2026-09-15',
    checkout: '2026-09-17',
    bedLabel: 'A-1"><script>',
    checkinUrl: 'https://pwa-hostaleria.miguezlopezia.workers.dev/checkin?r=abc',
  });
  assert.ok(email);
  assert.ok(!email.html.includes('<img'));
  assert.ok(!email.html.includes('<script>'));
  assert.ok(email.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(email.html.includes('<strong>Albergue &lt;b&gt;Falso&lt;/b&gt;</strong>'));
  assert.ok(email.html.includes('href="https://pwa-hostaleria.miguezlopezia.workers.dev/checkin?r=abc"'));
  assert.ok(!email.subject.includes('<b>'));
});

test('buildEmail: checkinUrl maliciosa no entra en el HTML', () => {
  const email = buildEmail('booking_confirmation', {
    guestName: 'Ana', hostalName: 'H', checkin: 'c', checkout: 'o', bedLabel: 'b',
    checkinUrl: 'javascript:alert(1)',
  });
  assert.ok(email);
  assert.ok(!email.html.includes('javascript:'));
  assert.ok(!email.html.includes('Hacer mi check-in online'));
});

test('buildEmail: checkin_otp escapa guestName/hostalName/codigo', () => {
  const email = buildEmail('checkin_otp', {
    guestName: '<b>X</b>', hostalName: '<i>H</i>', codigo: '123456<script>',
  });
  assert.ok(email);
  assert.ok(!email.html.includes('<script>'));
  assert.ok(email.html.includes('&lt;b&gt;X&lt;/b&gt;'));
  assert.equal(email.subject, 'Tu código de check-in — &lt;i&gt;H&lt;/i&gt;');
});

test('buildEmail: survey sin URL válida devuelve null (no se envía)', () => {
  assert.equal(buildEmail('survey', { guestName: 'A', hostalName: 'H', surveyUrl: 'http://x' }), null);
  const ok = buildEmail('survey', { guestName: 'A', hostalName: 'H', surveyUrl: 'https://app.example/survey?t=1' });
  assert.ok(ok && ok.html.includes('href="https://app.example/survey?t=1"'));
});

test('buildEmail: plantilla desconocida devuelve null', () => {
  assert.equal(buildEmail('factura', {}), null);
});

test('isValidEmail', () => {
  assert.ok(isValidEmail('a@b.com'));
  assert.ok(!isValidEmail('a@b'));
  assert.ok(!isValidEmail('a b@c.com'));
  assert.ok(!isValidEmail(''));
  assert.ok(!isValidEmail(null));
  assert.ok(!isValidEmail('x'.repeat(250) + '@b.com'));
});

// recipientExists con cliente supabase simulado (query builder encadenable)
function fakeSupabase(counts: Record<string, number>, fail = false) {
  return {
    from(table: string) {
      const q: any = {
        select: () => q,
        eq: () => q,
        then: (resolve: any) =>
          resolve(fail ? { error: new Error('db caída') } : { count: counts[table] ?? 0 }),
      };
      return q;
    },
  };
}

test('recipientExists: true si alguna tabla conoce el email', async () => {
  assert.ok(await recipientExists(fakeSupabase({ reservations: 1 }), 'h1', 'a@b.com'));
  assert.ok(await recipientExists(fakeSupabase({ guests: 2 }), 'h1', 'a@b.com'));
  assert.ok(await recipientExists(fakeSupabase({ review_requests: 1 }), 'h1', 'a@b.com'));
});

test('recipientExists: false si ninguna tabla lo conoce', async () => {
  assert.ok(!(await recipientExists(fakeSupabase({}), 'h1', 'victima@example.com')));
});

test('recipientExists: fail-closed si la consulta falla', async () => {
  assert.ok(!(await recipientExists(fakeSupabase({ reservations: 1 }, true), 'h1', 'a@b.com')));
});

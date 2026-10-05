// Tests de los helpers puros de create-employee (Fase C, tarea
// onboarding-autoservicio). Ejecutar:
//   npx tsx --test supabase/functions/create-employee/utils.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  corsHeadersFor,
  isValidEmail,
  normalizeInvitePayload,
} from './utils.ts';

test('isValidEmail', () => {
  assert.ok(isValidEmail('a@b.com'));
  assert.ok(!isValidEmail('a@b'));
  assert.ok(!isValidEmail('a b@c.com'));
  assert.ok(!isValidEmail(''));
  assert.ok(!isValidEmail(null));
  assert.ok(!isValidEmail('x'.repeat(250) + '@b.com'));
});

test('corsHeadersFor: ACAO solo para orígenes conocidos, nunca *', () => {
  assert.equal(
    corsHeadersFor('https://pwa-hostaleria.miguezlopezia.workers.dev')['Access-Control-Allow-Origin'],
    'https://pwa-hostaleria.miguezlopezia.workers.dev',
  );
  assert.equal(corsHeadersFor('http://localhost:3000')['Access-Control-Allow-Origin'], 'http://localhost:3000');
  assert.equal(corsHeadersFor('https://evil.example')['Access-Control-Allow-Origin'], undefined);
  assert.equal(corsHeadersFor(null)['Access-Control-Allow-Origin'], undefined);
});

test('normalizeInvitePayload: payload válido se normaliza', () => {
  const r = normalizeInvitePayload({ email: '  Ana@Yopmail.COM ', nombre: '  Ana ', rol: 'Empleado' });
  assert.ok(r.ok);
  assert.equal(r.value.email, 'ana@yopmail.com');
  assert.equal(r.value.nombre, 'Ana');
  assert.equal(r.value.rol, 'Empleado');
});

test('normalizeInvitePayload: campos obligatorios', () => {
  for (const p of [
    {},
    { email: 'a@b.com' },
    { email: 'a@b.com', nombre: 'Ana' },
    { email: '', nombre: 'Ana', rol: 'Empleado' },
    { email: 'a@b.com', nombre: '  ', rol: 'Empleado' },
  ]) {
    const r = normalizeInvitePayload(p);
    assert.ok(!r.ok, JSON.stringify(p));
  }
});

test('normalizeInvitePayload: email inválido', () => {
  const r = normalizeInvitePayload({ email: 'no-es-email', nombre: 'Ana', rol: 'Empleado' });
  assert.ok(!r.ok);
});

test('normalizeInvitePayload: solo roles invitables (jamás Director)', () => {
  assert.ok(!normalizeInvitePayload({ email: 'a@b.com', nombre: 'Ana', rol: 'Director' }).ok);
  assert.ok(!normalizeInvitePayload({ email: 'a@b.com', nombre: 'Ana', rol: 'Admin' }).ok);
  assert.ok(normalizeInvitePayload({ email: 'a@b.com', nombre: 'Ana', rol: 'Recepción' }).ok);
});

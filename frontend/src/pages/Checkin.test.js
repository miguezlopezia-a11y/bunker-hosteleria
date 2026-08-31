/**
 * Tests del flujo de Check-in (paso 1 RD933, paso 2 scan real + manual,
 * paso 3 firma). lib/supabase mockeado; fetch mockeado por test — los
 * endpoints /api/policia/* y /api/firma/* se simulan en el borde HTTP.
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../test-utils';
import Checkin from './Checkin';

let mockSignedIn = true;

const RESERVA = {
  id: 'r1', hostal_id: 'h1', bed_id: 'b1', guest_name: 'Peregrino Demo',
  guest_email: 'p@demo.es', guest_phone: '600999000', nationality: 'ESP',
  channel: 'directo', checkin: '2026-08-01', checkout: '2026-08-03',
  status: 'confirmada', price: 30, payment_method: 'tarjeta',
};

jest.mock('../lib/supabase', () => {
  const HOSTAL = { id: 'h1', name: 'Albergue Demo Norte', slug: 'albergue-demo-norte', base_price: 15, modo_directo: false };
  const HOSTALERO = { id: 'u1', hostal_id: 'h1', email: 'd@demo.es', nombre: 'Demo', rol: 'Director' };
  const FIXTURES = {
    hostaleros: [HOSTALERO],
    hostales: [HOSTAL],
    rooms: [{ id: 'rm1', hostal_id: 'h1', name: 'Hab 1', capacity: 6 }],
    beds: [{ id: 'b1', hostal_id: 'h1', room_id: 'rm1', label: '1A', status: 'free' }],
    reservations: [RESERVA],
  };
  const makeThenable = (result) => ({ then: (resolve) => Promise.resolve(result).then(resolve) });
  const chain = (table) => {
    const rows = FIXTURES[table] ?? [];
    const builder = {
      select: () => builder, eq: () => builder, neq: () => builder, is: () => builder,
      in: () => builder, order: () => builder, limit: () => builder,
      insert: () => builder, update: () => builder, upsert: () => builder, delete: () => builder,
      single: () => makeThenable({ data: rows[0] ?? null, error: null }),
      then: (resolve) => Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return builder;
  };
  return {
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: mockSignedIn ? { user: { id: 'u1' }, access_token: 'tok-test' } : null },
          error: null,
        }),
        signInWithPassword: async () => ({ data: { user: { id: 'u1' } }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: (table) => chain(table),
      rpc: (fn) =>
        makeThenable(
          fn === 'generate_peregrino_token'
            ? { data: { exito: true, token: 'tok-qr-123' }, error: null }
            : { data: [], error: null }
        ),
    },
  };
});

const RESPUESTA_SCAN_OK = {
  exito: true,
  huesped_id: 'hue-1',
  etapas: {
    ocr: {
      exito: true,
      datos_mrz: {
        nombre: 'PABLO', apellidos: 'MIGUEZ LOPEZ', num_documento: '45952104J',
        tipo_documento: 'D', num_soporte_doc: 'CGD124902', sexo: 'M',
        fecha_nacimiento: '1992-12-11', fecha_caducidad_doc: '2027-02-22',
        pais_nacionalidad: 'ESP', mrz_valid: true,
      },
    },
  },
};

function mockFetchCon(handlers) {
  global.fetch = jest.fn(async (url, opts) => {
    for (const [match, resp] of Object.entries(handlers)) {
      if (String(url).includes(match)) {
        const body = typeof resp === 'function' ? resp(url, opts) : resp;
        return { json: async () => body };
      }
    }
    throw new Error(`fetch no mockeado: ${url}`);
  });
}

async function llegarAPaso2() {
  await waitFor(() => expect(screen.getByTestId('checkin-step1-form')).toBeInTheDocument(), { timeout: 5000 });
  fireEvent.change(screen.getByTestId('checkin-dob-input'), { target: { value: '1990-01-15' } });
  fireEvent.change(screen.getByTestId('checkin-address-input'), { target: { value: 'Rua Mayor 12' } });
  fireEvent.change(screen.getByTestId('checkin-city-input'), { target: { value: 'O Pino' } });
  fireEvent.submit(screen.getByTestId('checkin-step1-form'));
  await waitFor(() => expect(screen.getByTestId('checkin-scan-input')).toBeInTheDocument());
}

function subirArchivo() {
  const file = new File(['fake-jpg'], 'dni.jpg', { type: 'image/jpeg' });
  fireEvent.change(screen.getByTestId('checkin-scan-input'), { target: { files: [file] } });
}

beforeEach(() => {
  mockSignedIn = true;
  jest.useRealTimers();
});

test('flujo feliz: scan real OK → firma → completar', async () => {
  mockFetchCon({
    '/api/policia/scan': RESPUESTA_SCAN_OK,
    '/api/firma/generar': { exito: true, url: 'http://test/firma?token=abc' },
    '/api/firma/estado': { exito: true, tiene_firma: true, firma_url: 'http://firma/1.png' },
  });

  renderWithProviders(
    <Routes>
      <Route path="/checkin/:reservationId" element={<Checkin />} />
    </Routes>,
    { initialEntries: ['/checkin/r1'] }
  );

  await llegarAPaso2();
  subirArchivo();

  // Scan OK: datos MRZ verificados y hostal_id real en la petición
  await waitFor(() => expect(screen.getByTestId('checkin-scan-success')).toBeInTheDocument(), { timeout: 5000 });
  const llamadaScan = global.fetch.mock.calls.find(([u]) => String(u).includes('/api/policia/scan'));
  const bodyScan = JSON.parse(llamadaScan[1].body);
  expect(bodyScan.hostal_id).toBe('h1');
  expect(bodyScan.fecha_salida).toBe('2026-08-03');
  expect(bodyScan.datos_extra.direccion).toBe('Rua Mayor 12');
  expect(llamadaScan[1].headers.Authorization).toBe('Bearer tok-test');

  // Paso 3: URL de firma generada y polling marca la firma
  fireEvent.click(screen.getByTestId('checkin-step2-continue-button'));
  await waitFor(() => expect(screen.getByTestId('checkin-signature-url')).toBeInTheDocument(), { timeout: 5000 });
  await waitFor(() => expect(screen.getByTestId('checkin-signature-success')).toBeInTheDocument(), { timeout: 8000 });

  // Completar
  await waitFor(() => expect(screen.getByTestId('checkin-complete-button')).toBeEnabled());
  fireEvent.click(screen.getByTestId('checkin-complete-button'));
  await waitFor(() => expect(screen.getByTestId('checkin-success-screen')).toBeInTheDocument(), { timeout: 5000 });

  // QR de sesión de peregrino: URL firmada por la RPC (migración 007)
  await waitFor(() => expect(screen.getByTestId('checkin-qr')).toBeInTheDocument());
  expect(screen.getByTestId('checkin-peregrino-url')).toHaveTextContent(
    'https://pwa-hostaleria.miguezlopezia.workers.dev/peregrino?r=r1&t=tok-qr-123'
  );
}, 20000);

test('documento caducado → mensaje LEGAL específico y no avanza', async () => {
  mockFetchCon({
    '/api/policia/scan': {
      exito: false, alerta: 'LEGAL',
      etapas: { ocr: { exito: true, datos_mrz: { documento_caducado: true, mrz_checks: { vigente: false } } } },
    },
  });

  renderWithProviders(
    <Routes>
      <Route path="/checkin/:reservationId" element={<Checkin />} />
    </Routes>,
    { initialEntries: ['/checkin/r1'] }
  );

  await llegarAPaso2();
  subirArchivo();
  await waitFor(() => expect(screen.getByTestId('checkin-scan-error')).toHaveTextContent('Documento caducado'), { timeout: 5000 });
  expect(screen.getByTestId('checkin-step2-continue-button')).toBeDisabled();
}, 15000);

test('frontal sin MRZ → mensaje REVERSO; 2 fallos → verificación manual', async () => {
  let manualLlamada = null;
  mockFetchCon({
    '/api/policia/scan-manual': (url, opts) => {
      manualLlamada = JSON.parse(opts.body);
      return { exito: true, huesped_id: 'hue-manual' };
    },
    '/api/policia/scan': { exito: false, alerta: 'LEGAL', etapas: { ocr: { exito: false, error: 'No se detectaron líneas MRZ' } } },
  });

  renderWithProviders(
    <Routes>
      <Route path="/checkin/:reservationId" element={<Checkin />} />
    </Routes>,
    { initialEntries: ['/checkin/r1'] }
  );

  await llegarAPaso2();
  subirArchivo();
  await waitFor(() => expect(screen.getByTestId('checkin-scan-error')).toHaveTextContent('REVERSO'), { timeout: 5000 });

  // Segundo fallo → aparece la opción manual
  subirArchivo();
  await waitFor(() => expect(screen.getByTestId('checkin-manual-mode-button')).toBeInTheDocument(), { timeout: 5000 });
  fireEvent.click(screen.getByTestId('checkin-manual-mode-button'));

  await waitFor(() => expect(screen.getByTestId('checkin-manual-form')).toBeInTheDocument());
  fireEvent.change(screen.getByTestId('checkin-manual-document-input'), { target: { value: '45952104J' } });
  fireEvent.change(screen.getByTestId('checkin-manual-expiry-input'), { target: { value: '2027-02-22' } });
  fireEvent.click(screen.getByTestId('checkin-manual-submit-button'));

  await waitFor(() => expect(screen.getByTestId('checkin-scan-success')).toBeInTheDocument(), { timeout: 5000 });
  expect(manualLlamada.num_documento).toBe('45952104J');
  expect(manualLlamada.tipo_documento).toBe('D');
  expect(manualLlamada.hostal_id).toBe('h1');
}, 20000);

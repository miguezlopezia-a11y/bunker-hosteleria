/**
 * Tests de la sección "Check-in online verificados" del Dashboard
 * (componente inline CheckinOnlinePendientes). lib/supabase mockeado
 * siguiendo el patrón de Checkin.test.js: chain encadenable con fixtures
 * + estado mutable (prefijo mock*) para las filas de huespedes y la
 * respuesta de la RPC registrar_entrada_peregrino.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import Dashboard from './Dashboard';

let mockSignedIn = true;
let mockPreverificados = [];
let mockRpcResult = { data: { exito: true }, error: null };
const mockRpcCalls = [];
const mockFromTables = [];

jest.mock('../lib/supabase', () => {
  const HOSTAL = { id: 'h1', name: 'Albergue Demo Norte', slug: 'albergue-demo-norte', base_price: 15, modo_directo: false };
  const HOSTALERO = { id: 'u1', hostal_id: 'h1', email: 'd@demo.es', nombre: 'Demo', rol: 'Director' };
  const FIXTURES = {
    hostaleros: [HOSTALERO],
    hostales: [HOSTAL],
    rooms: [{ id: 'rm1', hostal_id: 'h1', name: 'Hab 1', capacity: 6 }],
    beds: [{ id: 'b1', hostal_id: 'h1', room_id: 'rm1', label: '1A', status: 'free' }],
    reservations: [],
  };
  const makeThenable = (result) => ({ then: (resolve) => Promise.resolve(result).then(resolve) });
  const chain = (table) => {
    mockFromTables.push(table);
    // 'huespedes' es dinámico por test; el resto, fixtures fijos.
    const rows = table === 'huespedes' ? mockPreverificados : FIXTURES[table] ?? [];
    const builder = {
      select: () => builder, eq: () => builder, neq: () => builder, not: () => builder,
      is: () => builder, in: () => builder, order: () => builder, limit: () => builder,
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
      rpc: (fn, params) => {
        mockRpcCalls.push([fn, params]);
        return makeThenable(
          fn === 'registrar_entrada_peregrino' ? mockRpcResult : { data: [], error: null }
        );
      },
    },
  };
});

const HUESPED_FIRMADO = {
  id: 'hue-1', nombre: 'Ana', apellidos: 'Camino Real', num_documento: '12345678Z',
  firma_digital_url: 'https://firmas.test/hue-1.png', verificado_otp_at: '2026-09-07T10:00:00Z',
  reservation_id: 'res-1', reservations: { checkin: '2026-09-08', checkout: '2026-09-10' },
};

const HUESPED_SIN_FIRMA = {
  ...HUESPED_FIRMADO,
  id: 'hue-2', nombre: 'Luis', apellidos: 'Sin Firma', num_documento: '87654321X',
  firma_digital_url: null, reservation_id: 'res-2',
};

beforeEach(() => {
  mockSignedIn = true;
  mockPreverificados = [];
  mockRpcResult = { data: { exito: true }, error: null };
  mockRpcCalls.length = 0;
  mockFromTables.length = 0;
  localStorage.clear();
});

test('sin pre-verificados: la sección no aparece (aunque la query sí se lanza)', async () => {
  renderWithProviders(<Dashboard />);

  await waitFor(() => expect(screen.getByTestId('dashboard-hostel-name')).toHaveTextContent('Albergue Demo Norte'), { timeout: 5000 });
  // La consulta a huespedes se ejecutó pero la respuesta vacía no pinta nada.
  await waitFor(() => expect(mockFromTables).toContain('huespedes'));
  expect(screen.queryByText('Check-in online verificados')).toBeNull();
});

test('pre-verificado firmado: badge "Firmado", aviso de documento físico y click registra la entrada y lo quita de la lista', async () => {
  mockPreverificados = [HUESPED_FIRMADO];
  mockRpcResult = { data: { exito: true }, error: null };

  renderWithProviders(<Dashboard />);

  await waitFor(() => expect(screen.getByTestId('preverificado-card-hue-1')).toBeInTheDocument(), { timeout: 5000 });
  expect(screen.getByTestId('preverificado-card-hue-1')).toHaveTextContent('Ana Camino Real');
  expect(screen.getByTestId('preverificado-card-hue-1')).toHaveTextContent('12345678Z');
  expect(screen.getByTestId('preverificado-card-hue-1')).toHaveTextContent('08/09/2026 → 10/09/2026');
  expect(screen.getByTestId('firma-badge-hue-1')).toHaveTextContent('Firmado');
  // Aviso legal por tarjeta: la verificación online no sustituye el documento físico.
  expect(screen.getByTestId('aviso-doc-hue-1')).toHaveTextContent('Comprueba el DNI/documento físico');
  expect(screen.getByTestId('checkin-online-aviso')).toHaveTextContent('la identidad se confirma');

  fireEvent.click(screen.getByTestId('registrar-entrada-button-hue-1'));

  await waitFor(() =>
    expect(mockRpcCalls).toContainEqual(['registrar_entrada_peregrino', { p_reservation_id: 'res-1' }])
  );
  await waitFor(() => expect(screen.queryByTestId('preverificado-card-hue-1')).toBeNull());
  expect(screen.getByTestId('toast-notification')).toHaveTextContent('Entrada registrada');
});

test('pre-verificado sin firmar: el click SÍ llama a la RPC (el servidor manda, no el badge) y su error de firma muestra el aviso inline', async () => {
  mockPreverificados = [HUESPED_SIN_FIRMA];
  mockRpcResult = { data: { exito: false, error: 'falta la firma del huésped' }, error: null };

  renderWithProviders(<Dashboard />);

  await waitFor(() => expect(screen.getByTestId('preverificado-card-hue-2')).toBeInTheDocument(), { timeout: 5000 });
  expect(screen.getByTestId('firma-badge-hue-2')).toHaveTextContent('Sin firmar');

  fireEvent.click(screen.getByTestId('registrar-entrada-button-hue-2'));

  // El botón siempre pregunta al servidor: la lista se cargó una vez al montar
  // y firma_digital_url puede estar obsoleto (el peregrino pudo firmar después).
  // Se espera el aviso (render post-resolución de la RPC), no solo la llamada.
  await waitFor(() => expect(screen.getByTestId('aviso-firma-hue-2')).toBeInTheDocument());
  expect(mockRpcCalls).toContainEqual(['registrar_entrada_peregrino', { p_reservation_id: 'res-2' }]);

  // Sin toast: el aviso accionable vive dentro de la tarjeta y no desaparece.
  expect(screen.queryByTestId('toast-notification')).toBeNull();
  const aviso = screen.getByTestId('aviso-firma-hue-2');
  expect(aviso).toHaveTextContent('El peregrino verificó su email pero no ha firmado todavía');
  // El enlace lleva al wizard presencial de esa reserva.
  expect(aviso.querySelector('a')).toHaveAttribute('href', '/checkin/res-2');
  // El item no se ha ido de la lista.
  expect(screen.getByTestId('preverificado-card-hue-2')).toBeInTheDocument();
});

test('badge "Firmado" pero la RPC responde falta de firma: mismo aviso inline, sin toast', async () => {
  mockPreverificados = [HUESPED_FIRMADO];
  mockRpcResult = { data: { exito: false, error: 'falta la firma del huésped' }, error: null };

  renderWithProviders(<Dashboard />);

  await waitFor(() => expect(screen.getByTestId('registrar-entrada-button-hue-1')).toBeInTheDocument(), { timeout: 5000 });
  fireEvent.click(screen.getByTestId('registrar-entrada-button-hue-1'));

  await waitFor(() => expect(screen.getByTestId('aviso-firma-hue-1')).toBeInTheDocument());
  expect(screen.queryByTestId('toast-notification')).toBeNull();
  expect(screen.getByTestId('preverificado-card-hue-1')).toBeInTheDocument();
});

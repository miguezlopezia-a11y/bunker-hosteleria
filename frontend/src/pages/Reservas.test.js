/**
 * Tests de la página de Reservas. lib/supabase mockeado con un hostal que
 * tiene un dormitorio (2 camas) y una habitación privada.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import Reservas from './Reservas';

jest.mock('../lib/supabase', () => {
  const HOSTAL = { id: 'h1', name: 'Albergue Demo Norte', slug: 'albergue-demo-norte', base_price: 15, modo_directo: false };
  const HOSTALERO = { id: 'u1', hostal_id: 'h1', email: 'd@demo.es', nombre: 'Demo', rol: 'Director' };
  const FIXTURES = {
    hostaleros: [HOSTALERO],
    hostales: [HOSTAL],
    rooms: [
      { id: 'rm1', hostal_id: 'h1', name: 'Dormitorio Norte', tipo: 'dormitorio', capacity: 2 },
      { id: 'rm2', hostal_id: 'h1', name: 'Doble', tipo: 'privada', price_per_night: 60, capacity: 2 },
    ],
    beds: [
      { id: 'b1', hostal_id: 'h1', room_id: 'rm1', label: '1A', status: 'free' },
      { id: 'b2', hostal_id: 'h1', room_id: 'rm1', label: '1B', status: 'free' },
    ],
    reservations: [],
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
          data: { session: { user: { id: 'u1' }, access_token: 'tok-test' } },
          error: null,
        }),
        signInWithPassword: async () => ({ data: { user: { id: 'u1' } }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: (table) => chain(table),
      rpc: () => makeThenable({ data: [], error: null }),
    },
  };
});

async function abrirModalNuevaReserva() {
  renderWithProviders(<Reservas />, { initialEntries: ['/reservas'] });
  await waitFor(() => expect(screen.getByTestId('reservas-page')).toBeInTheDocument(), { timeout: 5000 });
  fireEvent.click(screen.getByTestId('new-reservation-button'));
  return await waitFor(() => screen.getByTestId('new-reservation-bed-select'));
}

test('el desplegable de unidad separa camas y habitaciones privadas en dos optgroup', async () => {
  const select = await abrirModalNuevaReserva();

  const optgroups = select.querySelectorAll('optgroup');
  expect(optgroups).toHaveLength(2);
  expect(optgroups[0]).toHaveAttribute('label', 'Camas');
  expect(optgroups[1]).toHaveAttribute('label', 'Habitaciones privadas');

  const camas = [...optgroups[0].querySelectorAll('option')].map((o) => o.value);
  expect(camas).toEqual(['bed:1A', 'bed:1B']);

  const habitaciones = [...optgroups[1].querySelectorAll('option')].map((o) => o.value);
  expect(habitaciones).toEqual(['room:rm2']);
  expect(optgroups[1].querySelector('option').textContent).toBe('Habitación Doble (privada)');
});

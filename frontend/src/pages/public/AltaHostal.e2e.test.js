/**
 * Fase E — test de integración end-to-end del quiz de alta (/alta) contra un
 * mock de Supabase con ESTADO: el mock mantiene tablas en memoria
 * (auth.users → rpc crear_mi_hostal → hostales/hostaleros → update de
 * hostales → invitaciones). Verifica que, tras recorrer el quiz completo,
 * existen: un hostales nuevo, un hostaleros Director vinculado a él, y los
 * campos de página web guardados. Sin pasos manuales.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test-utils';
import AltaHostal from './AltaHostal';

// "Base de datos" en memoria del mock.
const DB = {
  authUsers: [],
  hostales: [],
  hostaleros: [],
  invites: [],
};

jest.mock('../../lib/supabase', () => {
  const makeThenable = (result) => ({ then: (resolve) => Promise.resolve(result).then(resolve) });
  const chain = (table) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      insert: () => builder,
      update: (updates) => {
        if (table === 'hostales') {
          const row = DB.hostales[DB.hostales.length - 1];
          if (row) Object.assign(row, updates);
        }
        return builder;
      },
      upsert: () => builder,
      delete: () => builder,
      single: () => makeThenable({ data: null, error: null }),
      then: (resolve) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return builder;
  };
  return {
    supabase: {
      auth: {
        signUp: async ({ email }) => {
          const user = { id: `u-${email}`, email };
          DB.authUsers.push(user);
          return { data: { user, session: { user } }, error: null };
        },
        signInWithPassword: async () => ({ data: { session: { user: DB.authUsers[0] } }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: (table) => chain(table),
      rpc: (fn, params) => {
        if (fn === 'crear_mi_hostal') {
          const hostalId = 'h-nuevo';
          DB.hostales.push({
            id: hostalId,
            name: params.p_nombre,
            slug: 'albergue-nuevo',
            address: params.p_direccion,
            phone: params.p_telefono,
            email: params.p_email,
            base_price: params.p_precio_base,
          });
          DB.hostaleros.push({
            id: DB.authUsers[0].id,
            hostal_id: hostalId,
            email: DB.authUsers[0].email,
            nombre: DB.authUsers[0].email,
            rol: 'Director',
          });
          return makeThenable({ data: hostalId, error: null });
        }
        return makeThenable({ data: [], error: null });
      },
      functions: {
        invoke: async (name, { body } = {}) => {
          DB.invites.push({ name, body });
          return { data: { invited: true }, error: null };
        },
      },
      storage: {
        from: () => ({
          upload: async (path) => ({ data: { path }, error: null }),
          remove: async () => ({ data: [], error: null }),
          getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
        }),
      },
    },
  };
});

beforeEach(() => {
  DB.authUsers.length = 0;
  DB.hostales.length = 0;
  DB.hostaleros.length = 0;
  DB.invites.length = 0;
});

test('flujo completo: al final existe hostal nuevo + Director + página web', async () => {
  renderWithProviders(
    <Routes>
      <Route path="/alta" element={<AltaHostal />} />
      <Route path="/dashboard" element={<div data-testid="dashboard-reached" />} />
    </Routes>,
    { initialEntries: ['/alta'] }
  );

  // Paso 1 — cuenta
  fireEvent.change(screen.getByTestId('alta-cuenta-email'), { target: { value: 'director@nuevo.es' } });
  fireEvent.change(screen.getByTestId('alta-cuenta-password'), { target: { value: 'secreto1' } });
  fireEvent.change(screen.getByTestId('alta-cuenta-confirm'), { target: { value: 'secreto1' } });
  fireEvent.click(screen.getByTestId('alta-cuenta-submit'));
  await waitFor(() => screen.getByTestId('alta-hostal-form'));

  // Paso 2 — hostal
  fireEvent.change(screen.getByTestId('alta-hostal-nombre'), { target: { value: 'Albergue Nuevo' } });
  fireEvent.change(screen.getByTestId('alta-hostal-direccion'), { target: { value: 'Calle del Camino 5' } });
  fireEvent.change(screen.getByTestId('alta-hostal-precio'), { target: { value: '14' } });
  fireEvent.click(screen.getByTestId('alta-hostal-submit'));
  await waitFor(() => screen.getByTestId('alta-empleados'));

  // Paso 3 — un empleado
  fireEvent.click(screen.getByTestId('alta-invite-add'));
  fireEvent.change(screen.getByTestId('alta-invite-email-0'), { target: { value: 'recepcion@nuevo.es' } });
  fireEvent.change(screen.getByTestId('alta-invite-nombre-0'), { target: { value: 'Laura' } });
  fireEvent.click(screen.getByTestId('alta-empleados-next'));
  await waitFor(() => screen.getByTestId('alta-web-form'));

  // Paso 4 — página web con preview en vivo
  fireEvent.click(screen.getByTestId('alta-web-activa'));
  fireEvent.change(screen.getByTestId('alta-web-descripcion'), {
    target: { value: 'A 200 m del Camino' },
  });
  fireEvent.change(screen.getByTestId('alta-web-plantilla'), { target: { value: 'piloto_b' } });
  expect(screen.getByTestId('pagina-hostal-preview')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('alta-finalizar'));
  await waitFor(() => expect(screen.getByTestId('dashboard-reached')).toBeInTheDocument());

  // Estado final: hostal nuevo + Director + campos de página web.
  expect(DB.authUsers).toHaveLength(1);
  expect(DB.hostales).toEqual([
    expect.objectContaining({
      id: 'h-nuevo',
      name: 'Albergue Nuevo',
      address: 'Calle del Camino 5',
      base_price: 14,
      descripcion_larga: 'A 200 m del Camino',
      plantilla: 'piloto_b',
      pagina_web_activa: true,
    }),
  ]);
  expect(DB.hostaleros).toEqual([
    expect.objectContaining({
      id: 'u-director@nuevo.es',
      hostal_id: 'h-nuevo',
      rol: 'Director',
    }),
  ]);
  expect(DB.invites).toEqual([
    {
      name: 'create-employee',
      body: { email: 'recepcion@nuevo.es', nombre: 'Laura', rol: 'Empleado' },
    },
  ]);
});

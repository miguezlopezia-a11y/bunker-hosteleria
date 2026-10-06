/**
 * Tests del quiz de alta autoservicio (/alta, Fase D) — un test por paso más
 * uno de flujo completo. lib/supabase mockeado siguiendo el patrón de
 * Configuracion.test.js: auth.signUp/signInWithPassword, rpc crear_mi_hostal,
 * functions.invoke (create-employee), storage (fotos) y update de hostales.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test-utils';
import AltaHostal from './AltaHostal';

let mockSignUpSession = true;
let mockSignUpError = null;
let mockLoginError = null;
let mockRpcError = null;
const mockRpcCalls = [];
const mockHostalUpdates = [];
const mockInvokes = [];

jest.mock('../../lib/supabase', () => {
  const makeThenable = (result) => ({ then: (resolve) => Promise.resolve(result).then(resolve) });
  const chain = (table) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      insert: () => builder,
      update: (updates) => {
        if (table === 'hostales') mockHostalUpdates.push(updates);
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
        signUp: async (payload) => {
          mockSignUpPayload = payload;
          if (mockSignUpError) return { data: null, error: mockSignUpError };
          return {
            data: {
              user: { id: 'u9' },
              session: mockSignUpSession ? { user: { id: 'u9' } } : null,
            },
            error: null,
          };
        },
        signInWithPassword: async () =>
          mockLoginError ? { data: null, error: mockLoginError } : { data: { session: { user: { id: 'u9' } } }, error: null },
        getSession: async () => ({ data: { session: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: (table) => chain(table),
      rpc: (fn, params) => {
        mockRpcCalls.push({ fn, params });
        if (fn === 'crear_mi_hostal') {
          return makeThenable(mockRpcError ? { data: null, error: mockRpcError } : { data: 'h9', error: null });
        }
        return makeThenable({ data: [], error: null });
      },
      functions: {
        invoke: async (name, { body } = {}) => {
          mockInvokes.push({ name, body });
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

let mockSignUpPayload = null;

function renderQuiz() {
  return renderWithProviders(
    <Routes>
      <Route path="/alta" element={<AltaHostal />} />
      <Route path="/dashboard" element={<div data-testid="dashboard-reached" />} />
    </Routes>,
    { initialEntries: ['/alta'] }
  );
}

function fillCuenta() {
  fireEvent.change(screen.getByTestId('alta-cuenta-email'), {
    target: { value: 'nuevo@hostal.es' },
  });
  fireEvent.change(screen.getByTestId('alta-cuenta-password'), {
    target: { value: 'secreto1' },
  });
  fireEvent.change(screen.getByTestId('alta-cuenta-confirm'), {
    target: { value: 'secreto1' },
  });
}

function fillHostal() {
  fireEvent.change(screen.getByTestId('alta-hostal-nombre'), {
    target: { value: 'Albergue Nuevo' },
  });
  fireEvent.change(screen.getByTestId('alta-hostal-precio'), {
    target: { value: '14' },
  });
}

beforeEach(() => {
  mockSignUpSession = true;
  mockSignUpError = null;
  mockLoginError = null;
  mockRpcError = null;
  mockSignUpPayload = null;
  mockRpcCalls.length = 0;
  mockHostalUpdates.length = 0;
  mockInvokes.length = 0;
});

test('paso 1: valida que las contraseñas coinciden', async () => {
  renderQuiz();
  fireEvent.change(screen.getByTestId('alta-cuenta-email'), {
    target: { value: 'nuevo@hostal.es' },
  });
  fireEvent.change(screen.getByTestId('alta-cuenta-password'), {
    target: { value: 'secreto1' },
  });
  fireEvent.change(screen.getByTestId('alta-cuenta-confirm'), {
    target: { value: 'otra' },
  });
  fireEvent.click(screen.getByTestId('alta-cuenta-submit'));
  await waitFor(() =>
    expect(screen.getByTestId('alta-error')).toHaveTextContent('Las contraseñas no coinciden')
  );
  expect(mockSignUpPayload).toBeNull();
});

test('paso 1: signup con sesión avanza al paso 2', async () => {
  renderQuiz();
  fillCuenta();
  fireEvent.click(screen.getByTestId('alta-cuenta-submit'));
  await waitFor(() => expect(screen.getByTestId('alta-hostal-form')).toBeInTheDocument());
  expect(mockSignUpPayload).toEqual({ email: 'nuevo@hostal.es', password: 'secreto1' });
});

test('paso 1: sin sesión pide confirmar email y continúa tras login', async () => {
  mockSignUpSession = false;
  renderQuiz();
  fillCuenta();
  fireEvent.click(screen.getByTestId('alta-cuenta-submit'));
  await waitFor(() => expect(screen.getByTestId('alta-confirm-email')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('alta-continuar-tras-confirm'));
  await waitFor(() => expect(screen.getByTestId('alta-hostal-form')).toBeInTheDocument());
});

test('paso 2: nombre obligatorio y RPC con los datos del formulario', async () => {
  renderQuiz();
  fillCuenta();
  fireEvent.click(screen.getByTestId('alta-cuenta-submit'));
  await waitFor(() => screen.getByTestId('alta-hostal-form'));

  fireEvent.click(screen.getByTestId('alta-hostal-submit'));
  await waitFor(() =>
    expect(screen.getByTestId('alta-error')).toHaveTextContent('obligatorio')
  );
  expect(mockRpcCalls).toHaveLength(0);

  fillHostal();
  fireEvent.click(screen.getByTestId('alta-hostal-submit'));
  await waitFor(() => expect(screen.getByTestId('alta-empleados')).toBeInTheDocument());
  expect(mockRpcCalls).toEqual([
    {
      fn: 'crear_mi_hostal',
      params: {
        p_nombre: 'Albergue Nuevo',
        p_direccion: null,
        p_telefono: null,
        p_email: null,
        p_precio_base: 14,
      },
    },
  ]);
});

test('pasos 3-4: se puede saltar empleados y finalizar sin página web', async () => {
  renderQuiz();
  fillCuenta();
  fireEvent.click(screen.getByTestId('alta-cuenta-submit'));
  await waitFor(() => screen.getByTestId('alta-hostal-form'));
  fillHostal();
  fireEvent.click(screen.getByTestId('alta-hostal-submit'));
  await waitFor(() => screen.getByTestId('alta-empleados'));
  fireEvent.click(screen.getByTestId('alta-empleados-skip'));
  await waitFor(() => screen.getByTestId('alta-web-form'));

  fireEvent.click(screen.getByTestId('alta-finalizar'));
  await waitFor(() => expect(screen.getByTestId('dashboard-reached')).toBeInTheDocument());
  expect(mockHostalUpdates).toHaveLength(0); // web vacía: nada que guardar
  expect(mockInvokes).toHaveLength(0);
});

test('paso 4: guarda página web (con plantilla) e invita empleados al finalizar', async () => {
  renderQuiz();
  fillCuenta();
  fireEvent.click(screen.getByTestId('alta-cuenta-submit'));
  await waitFor(() => screen.getByTestId('alta-hostal-form'));
  fillHostal();
  fireEvent.click(screen.getByTestId('alta-hostal-submit'));
  await waitFor(() => screen.getByTestId('alta-empleados'));

  fireEvent.click(screen.getByTestId('alta-invite-add'));
  fireEvent.change(screen.getByTestId('alta-invite-email-0'), {
    target: { value: 'empleada@hostal.es' },
  });
  fireEvent.change(screen.getByTestId('alta-invite-nombre-0'), {
    target: { value: 'Laura' },
  });
  fireEvent.click(screen.getByTestId('alta-empleados-next'));
  await waitFor(() => screen.getByTestId('alta-web-form'));

  fireEvent.click(screen.getByTestId('alta-web-activa'));
  fireEvent.change(screen.getByTestId('alta-web-descripcion'), {
    target: { value: 'A 200 m del Camino, cena de peregrino' },
  });
  fireEvent.change(screen.getByTestId('alta-web-plantilla'), {
    target: { value: 'piloto_b' },
  });

  // Vista previa en vivo refleja el estado del formulario.
  expect(screen.getByTestId('pagina-hostal-preview')).toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByTestId('pagina-hostal-descripcion')).toHaveTextContent(
      'A 200 m del Camino, cena de peregrino'
    )
  );

  fireEvent.click(screen.getByTestId('alta-finalizar'));
  await waitFor(() => expect(screen.getByTestId('dashboard-reached')).toBeInTheDocument());
  expect(mockHostalUpdates).toEqual([
    {
      descripcion_larga: 'A 200 m del Camino, cena de peregrino',
      color_acento: 'ocre',
      fotos: [],
      pagina_web_activa: true,
      plantilla: 'piloto_b',
    },
  ]);
  expect(mockInvokes).toEqual([
    {
      name: 'create-employee',
      body: { email: 'empleada@hostal.es', nombre: 'Laura', rol: 'Empleado' },
    },
  ]);
});

/**
 * Suite de integración de la app (versión Supabase recuperada).
 * Mockea lib/supabase con un cliente falso: auth con estado + from()/rpc()
 * encadenables que devuelven fixtures. Los tests ejercitan la app real.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from './test-utils';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fidelizacion from './pages/Fidelizacion';
import Marketplace from './pages/Marketplace';
import Web from './pages/public/Web';
import Directorio from './pages/public/Directorio';

const MANAGER_ROLES = ['Director', 'Recepción'];

// Estado del mock de auth (el prefijo mock* es obligatorio para que Jest
// permita referenciarlo desde la factory de jest.mock).
let mockSignedIn = false;

jest.mock('./lib/supabase', () => {
  const HOSTALERO = {
    id: 'u1', hostal_id: 'h1', email: 'director@demo.es', nombre: 'Demo Director', rol: 'Director',
  };
  const HOSTAL = {
    id: 'h1', name: 'Albergue Demo Norte', slug: 'albergue-demo-norte',
    base_price: 15, modo_directo: false, address: 'Calle Demo 1', phone: '', email: '',
  };
  const FIXTURES = {
    hostaleros: [HOSTALERO],
    hostales: [HOSTAL],
    loyalty_members: Array.from({ length: 5 }, (_, i) => ({
      id: `lm${i}`, hostal_id: 'h1', name: `Peregrino ${i}`, email: '',
      points: 100 - i * 10, routes_completed: i, last_camino: 'Francés',
    })),
    marketplace_services: [
      { id: 'm1', hostal_id: 'h1', name: 'Taxi Demo', category: 'transporte', description: '', phone: '600111222', discount: '10%', active: true },
      { id: 'm2', hostal_id: 'h1', name: 'Bar Demo', category: 'comida', description: '', phone: '600333444', discount: '', active: true },
    ],
  };

  const makeThenable = (result) => ({ then: (resolve) => Promise.resolve(result).then(resolve) });

  const chain = (table) => {
    const rows = FIXTURES[table] ?? [];
    const builder = {
      select: () => builder,
      eq: () => builder,
      neq: () => builder,
      is: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      insert: () => builder,
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      single: () => makeThenable({ data: rows[0] ?? null, error: null }),
      then: (resolve) => Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return builder;
  };

  return {
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: mockSignedIn ? { user: { id: 'u1' } } : null },
          error: null,
        }),
        signInWithPassword: async () => {
          mockSignedIn = true;
          return { data: { user: { id: 'u1' }, session: { user: { id: 'u1' } } }, error: null };
        },
        signOut: async () => {
          mockSignedIn = false;
          return { error: null };
        },
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: (table) => chain(table),
      rpc: (fn) => {
        if (fn === 'get_hostal_by_slug') {
          return { single: () => makeThenable({ data: { name: 'Albergue Demo Norte', base_price: 15, modo_directo: false }, error: null }) };
        }
        return makeThenable({ data: [], error: null });
      },
    },
  };
});

beforeEach(() => {
  mockSignedIn = false;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('renderiza la pantalla de login', async () => {
  renderWithProviders(<Login />);
  await waitFor(() => expect(screen.getByTestId('login-title')).toHaveTextContent('BunkerHostal'));
});

test('login como Director muestra el dashboard', async () => {
  renderWithProviders(
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={MANAGER_ROLES}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );

  await waitFor(() => expect(screen.getByTestId('login-form')).toBeInTheDocument());
  fireEvent.change(screen.getByTestId('login-email-input'), { target: { value: 'director@demo.es' } });
  fireEvent.change(screen.getByTestId('login-password-input'), { target: { value: 'secreto' } });
  fireEvent.click(screen.getByTestId('login-submit-button'));

  await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument(), { timeout: 5000 });
});

test('la web pública muestra el nombre del albergue', async () => {
  renderWithProviders(
    <Routes>
      <Route path="/web" element={<Web />} />
    </Routes>,
    { initialEntries: ['/web?hostel=albergue-demo-norte'] }
  );

  await waitFor(() => expect(screen.getByTestId('public-booking-title')).toHaveTextContent('Albergue Demo Norte'));
});

test('Fidelización muestra el ranking de peregrinos', async () => {
  mockSignedIn = true; // sesión activa para que AppContext cargue los datos del hostal
  renderWithProviders(
    <Routes>
      <Route path="/fidelizacion" element={<Fidelizacion />} />
    </Routes>,
    { initialEntries: ['/fidelizacion'] }
  );

  await waitFor(() => expect(screen.getByTestId('fidelizacion-page')).toBeInTheDocument());
  await waitFor(() => expect(screen.getAllByTestId(/^loyalty-ranking-row-/)).toHaveLength(5), { timeout: 5000 });
});

test('Marketplace lista servicios y abre el modal', async () => {
  mockSignedIn = true;
  renderWithProviders(
    <Routes>
      <Route path="/marketplace" element={<Marketplace />} />
    </Routes>,
    { initialEntries: ['/marketplace'] }
  );

  await waitFor(() => expect(screen.getByTestId('marketplace-page')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByTestId('marketplace-services-list')).toBeInTheDocument(), { timeout: 5000 });
  fireEvent.click(screen.getByTestId('add-service-button'));
  expect(screen.getByTestId('service-form-modal')).toBeInTheDocument();
});

test('Directorio muestra albergues', () => {
  renderWithProviders(
    <Routes>
      <Route path="/directorio" element={<Directorio />} />
    </Routes>,
    { initialEntries: ['/directorio'] }
  );

  expect(screen.getByTestId('directorio-page')).toBeInTheDocument();
  expect(screen.getByTestId('directorio-hostel-list')).toBeInTheDocument();
  expect(screen.getByTestId('directorio-hostel-card-albergue-demo-norte')).toBeInTheDocument();
});

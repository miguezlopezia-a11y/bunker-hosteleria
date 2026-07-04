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

test('renderiza la pantalla de login', () => {
  renderWithProviders(<Login />);
  expect(screen.getByTestId('login-title')).toHaveTextContent('BunkerHostal');
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

  fireEvent.change(screen.getByTestId('login-pin-input'), { target: { value: '1234' } });
  fireEvent.click(screen.getByTestId('login-submit-button'));

  await waitFor(() => expect(screen.getByTestId('dashboard-page')).toBeInTheDocument());
});

test('la web pública muestra el nombre del albergue', () => {
  renderWithProviders(
    <Routes>
      <Route path="/web" element={<Web />} />
    </Routes>,
    { initialEntries: ['/web?hostel=albergue-el-camino'] }
  );

  expect(screen.getByTestId('public-booking-title')).toHaveTextContent('Albergue El Camino');
});

test('Fase 3: Fidelización muestra el ranking de peregrinos', () => {
  renderWithProviders(
    <Routes>
      <Route path="/fidelizacion" element={<Fidelizacion />} />
    </Routes>,
    { initialEntries: ['/fidelizacion'] }
  );

  expect(screen.getByTestId('fidelizacion-page')).toBeInTheDocument();
  expect(screen.getByTestId('loyalty-ranking-table')).toBeInTheDocument();
  expect(screen.getAllByTestId(/^loyalty-ranking-row-/)).toHaveLength(5);
});

test('Fase 3: Marketplace lista servicios y abre el modal', () => {
  renderWithProviders(
    <Routes>
      <Route path="/marketplace" element={<Marketplace />} />
    </Routes>,
    { initialEntries: ['/marketplace'] }
  );

  expect(screen.getByTestId('marketplace-page')).toBeInTheDocument();
  expect(screen.getByTestId('marketplace-services-list')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('add-service-button'));
  expect(screen.getByTestId('service-form-modal')).toBeInTheDocument();
});

test('Fase 3: Directorio muestra albergues verificados', () => {
  renderWithProviders(
    <Routes>
      <Route path="/directorio" element={<Directorio />} />
    </Routes>,
    { initialEntries: ['/directorio'] }
  );

  expect(screen.getByTestId('directorio-page')).toBeInTheDocument();
  expect(screen.getByTestId('directorio-hostel-list')).toBeInTheDocument();
  expect(screen.getByTestId('directorio-hostel-card-albergue-el-camino')).toBeInTheDocument();
});

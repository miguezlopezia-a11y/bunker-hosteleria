import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reservas from './pages/Reservas';
import Checkin from './pages/Checkin';
import Huespedes from './pages/Huespedes';
import Comunicaciones from './pages/Comunicaciones';
import Fichaje from './pages/Fichaje';
import Limpieza from './pages/Limpieza';
import Informes from './pages/Informes';
import Configuracion from './pages/Configuracion';
import MaiaPanel from './pages/MaiaPanel';
import Fidelizacion from './pages/Fidelizacion';
import Marketplace from './pages/Marketplace';
import EmployeePortal from './pages/employee/EmployeePlaceholder';
import EmployeeHistorial from './pages/employee/EmployeeHistorial';
import Web from './pages/public/Web';
import Directorio from './pages/public/Directorio';
import NotFound from './pages/NotFound';

const MANAGER_ROLES = ['Director', 'Recepción'];

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/web" element={<Web />} />
            <Route path="/directorio" element={<Directorio />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservas"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Reservas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkin/:reservationId"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Checkin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/huespedes"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Huespedes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/comunicaciones"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Comunicaciones />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fichaje"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Fichaje />
                </ProtectedRoute>
              }
            />
            <Route
              path="/limpieza"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Limpieza />
                </ProtectedRoute>
              }
            />
            <Route
              path="/informes"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Informes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracion"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Configuracion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/maia"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <MaiaPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fidelizacion"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Fidelizacion />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace"
              element={
                <ProtectedRoute allowedRoles={MANAGER_ROLES}>
                  <Marketplace />
                </ProtectedRoute>
              }
            />

            <Route
              path="/empleado"
              element={
                <ProtectedRoute allowedRoles={['Empleado']}>
                  <EmployeePortal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empleado/historial"
              element={
                <ProtectedRoute allowedRoles={['Empleado']}>
                  <EmployeeHistorial />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}

export default App;

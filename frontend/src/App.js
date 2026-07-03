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
import EmployeePlaceholder from './pages/employee/EmployeePlaceholder';
import Web from './pages/public/Web';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/web" element={<Web />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['Director', 'Recepción']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservas"
              element={
                <ProtectedRoute allowedRoles={['Director', 'Recepción']}>
                  <Reservas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkin/:reservationId"
              element={
                <ProtectedRoute allowedRoles={['Director', 'Recepción']}>
                  <Checkin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/huespedes"
              element={
                <ProtectedRoute allowedRoles={['Director', 'Recepción']}>
                  <Huespedes />
                </ProtectedRoute>
              }
            />

            <Route
              path="/empleado"
              element={
                <ProtectedRoute allowedRoles={['Empleado']}>
                  <EmployeePlaceholder />
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

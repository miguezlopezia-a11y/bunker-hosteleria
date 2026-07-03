import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session } = useApp();

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to={session.role === 'Empleado' ? '/empleado' : '/dashboard'} replace />;
  }

  return children;
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Button from '../../components/Button';

export default function EmployeePlaceholder() {
  const { session, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md" data-testid="employee-placeholder-page">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Hola, {session?.employeeName} · {session?.hostel?.name}
        </h1>
        <p className="text-slate-600 mb-6">
          Portal de empleado completo disponible en la Fase 2.
        </p>
        <Button variant="secondary" onClick={handleLogout} data-testid="employee-logout-button">
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

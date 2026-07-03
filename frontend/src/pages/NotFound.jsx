import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center" data-testid="not-found-page">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <p className="text-slate-600 mb-6">Página no encontrada.</p>
        <Link
          to="/"
          data-testid="not-found-home-link"
          className="text-blue-600 font-semibold hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

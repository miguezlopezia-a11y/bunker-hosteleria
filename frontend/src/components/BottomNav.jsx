import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Badge from './Badge';

const TABS = [
  {
    id: 'hoy',
    label: 'Hoy',
    to: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    id: 'reservas',
    label: 'Reservas',
    to: '/reservas',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    id: 'huespedes',
    label: 'Huéspedes',
    to: '/huespedes',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        <circle cx="17" cy="8" r="2.5" />
        <path d="M17 14c2.6.4 5 2.4 5 6" />
      </svg>
    ),
  },
];

const OPERATIONS_ITEMS = [
  'Comunicaciones',
  'Fichaje equipo',
  'Limpieza',
  'Informes',
  'Fidelización',
  'Marketplace',
  'Configuración',
];

export default function BottomNav() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (to) => location.pathname === to;

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-stretch z-30"
        data-testid="bottom-nav"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            to={tab.to}
            data-testid={`bottom-nav-${tab.id}`}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors duration-150 ${
              isActive(tab.to) ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          data-testid="bottom-nav-operaciones"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-slate-400"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Operaciones
        </button>
        <button
          type="button"
          disabled
          data-testid="bottom-nav-maia"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium text-slate-300 cursor-not-allowed"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.4 8.4 0 0 1-1.2 4.4L21 20l-4.3-1.2a8.5 8.5 0 1 1 4.3-7.3Z" />
          </svg>
          MaiA
        </button>
      </nav>

      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 flex items-end"
          onClick={() => setDrawerOpen(false)}
          data-testid="operations-drawer-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full rounded-t-2xl p-5 max-h-[70vh] overflow-y-auto"
            data-testid="operations-drawer"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Operaciones</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                data-testid="operations-drawer-close-button"
                className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                aria-label="Cerrar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {OPERATIONS_ITEMS.map((label) => (
                <div
                  key={label}
                  data-testid={`operations-drawer-item-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed"
                >
                  {label}
                  <Badge variant="proximamente">Próximamente</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

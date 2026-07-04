import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Badge from './Badge';

const NAV_ITEMS = [
  { id: 'hoy', label: 'Hoy', to: '/dashboard' },
];

const RESERVAS_SUBMENU = [
  { id: 'reservas-lista', label: 'Lista', to: '/reservas' },
  { id: 'reservas-calendario', label: 'Calendario', to: '/calendario' },
  { id: 'reservas-channel', label: 'Channel Manager', to: '/channel-manager' },
];

const ENABLED_ITEMS = [
  { id: 'comunicaciones', label: 'Comunicaciones', to: '/comunicaciones' },
  { id: 'fichaje', label: 'Fichaje equipo', to: '/fichaje' },
  { id: 'limpieza', label: 'Limpieza', to: '/limpieza' },
  { id: 'informes', label: 'Informes', to: '/informes' },
  { id: 'fidelizacion', label: 'Fidelización', to: '/fidelizacion' },
  { id: 'marketplace', label: 'Marketplace', to: '/marketplace' },
];

const PHASE3_ITEMS = [];

const FOOTER_ITEMS = [
  { id: 'maia', label: 'MaiA', to: '/maia' },
  { id: 'configuracion', label: 'Configuración', to: '/configuracion' },
];

export default function Sidebar() {
  const { session, logout } = useApp();
  const location = useLocation();

  const isActive = (to) => location.pathname === to;
  const webPublicaUrl = session?.hostel ? `/web?hostel=${session.hostel.slug}` : '/web';

  return (
    <aside
      className="hidden md:flex md:flex-col w-[260px] h-screen bg-white border-r border-gray-200 fixed left-0 top-0"
      data-testid="desktop-sidebar"
    >
      <div className="px-5 py-5 border-b border-gray-200">
        <p className="text-lg font-bold text-slate-900">BunkerHostal</p>
        <p className="text-xs text-slate-400 mt-0.5">{session?.hostel?.name}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            data-testid={`sidebar-link-${item.id}`}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 border-l-4 ${
              isActive(item.to)
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        ))}

        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Reservas</div>
        {RESERVAS_SUBMENU.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            data-testid={`sidebar-link-${item.id}`}
            className={`pl-6 pr-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 border-l-4 ${
              isActive(item.to)
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        ))}

        <Link
          to={webPublicaUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="sidebar-link-web-publica"
          className="px-3 py-2.5 rounded-lg text-sm font-medium border-l-4 border-transparent text-slate-600 hover:bg-gray-50 transition-colors duration-150"
        >
          Web pública
        </Link>

        <Link
          to="/directorio"
          data-testid="sidebar-link-directorio"
          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 border-l-4 ${
            isActive('/directorio')
              ? 'border-blue-600 text-blue-600 bg-blue-50'
              : 'border-transparent text-slate-600 hover:bg-gray-50'
          }`}
        >
          Directorio
        </Link>

        <Link
          to="/huespedes"
          data-testid="sidebar-link-huespedes"
          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 border-l-4 ${
            isActive('/huespedes')
              ? 'border-blue-600 text-blue-600 bg-blue-50'
              : 'border-transparent text-slate-600 hover:bg-gray-50'
          }`}
        >
          Huéspedes
        </Link>

        <div className="h-px bg-gray-200 my-2" />

        {ENABLED_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            data-testid={`sidebar-link-${item.id}`}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 border-l-4 ${
              isActive(item.to)
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        ))}

        {PHASE3_ITEMS.map((item) => (
          <div
            key={item.id}
            data-testid={`sidebar-link-${item.id}`}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 flex items-center justify-between cursor-not-allowed"
          >
            {item.label}
            <Badge variant="proximamente">Próximamente</Badge>
          </div>
        ))}

        <div className="h-px bg-gray-200 my-2" />

        {FOOTER_ITEMS.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            data-testid={`sidebar-link-${item.id}`}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 border-l-4 ${
              isActive(item.to)
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-600 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-200">
        <button
          type="button"
          onClick={logout}
          data-testid="sidebar-logout-button"
          className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

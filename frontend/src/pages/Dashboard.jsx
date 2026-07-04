import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { camino } from '../data/camino';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { formatDate, formatEuro, isSameDay } from '../utils/format';

export default function Dashboard() {
  const { session, reservations, guests, beds, notifications } = useApp();
  const navigate = useNavigate();
  const [caminoOpen, setCaminoOpen] = useState(true);
  const today = new Date();

  const llegadasPendientes = reservations.filter(
    (r) => r.status === 'pendiente' && isSameDay(r.checkin, today)
  );
  const salidasHoy = guests.filter((g) => isSameDay(g.checkout, today));
  const disponibles = beds.filter((b) => b.status === 'free');
  const occupiedCount = beds.filter((b) => b.status === 'occupied').length;

  const alertasMaia = notifications.filter((n) => n.alerta);
  const pagoPendiente = guests.find((g) => g.paymentStatus === 'pendiente');

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto" data-testid="dashboard-page">
        {(alertasMaia.length > 0 || pagoPendiente) && (
          <div className="flex flex-col gap-2 mb-5">
            {alertasMaia.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/maia')}
                data-testid="alert-maia"
                className="text-left bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {alertasMaia.length} alertas de MaiA — Ver panel →
              </button>
            )}
            {pagoPendiente && (
              <div
                className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg px-4 py-2.5 text-sm font-medium"
                data-testid="alert-pago-pendiente"
              >
                Pago pendiente: {pagoPendiente.name} — {formatEuro(pagoPendiente.price)}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
          <div>
            <p className="text-sm text-slate-400">{formatDate(today)}</p>
            <h1 className="text-2xl font-bold text-slate-900" data-testid="dashboard-hostel-name">
              {session?.hostel?.name}
            </h1>
          </div>
          <Badge variant="checkin_completado" data-testid="dashboard-occupancy-badge">
            {occupiedCount}/{beds.length} camas
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="text-center" data-testid="summary-llegadas-card">
            <p className="text-2xl font-bold text-blue-600">{llegadasPendientes.length}</p>
            <p className="text-xs text-slate-400 mt-1">Llegadas hoy</p>
          </Card>
          <Card className="text-center" data-testid="summary-salidas-card">
            <p className="text-2xl font-bold text-slate-600">{salidasHoy.length}</p>
            <p className="text-xs text-slate-400 mt-1">Salidas hoy</p>
          </Card>
          <Card className="text-center" data-testid="summary-disponibles-card">
            <p className="text-2xl font-bold text-green-600">{disponibles.length}</p>
            <p className="text-xs text-slate-400 mt-1">Disponibles</p>
          </Card>
        </div>

        <Card className="mb-6" data-testid="camino-widget">
          <button
            type="button"
            onClick={() => setCaminoOpen(!caminoOpen)}
            className="w-full flex items-center justify-between focus:outline-none"
            data-testid="camino-widget-toggle"
          >
            <h2 className="text-base font-semibold text-slate-900">Camino de Santiago</h2>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`text-slate-400 transition-transform duration-200 ${caminoOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {caminoOpen && (
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Etapa actual: </span>
                {camino.stage.from} → {camino.stage.to} · {camino.stage.km} km · {camino.stage.difficulty}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Tiempo hoy: </span>
                {camino.weatherToday.temp}°C · {camino.weatherToday.condition} · Viento {camino.weatherToday.wind} km/h
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Tiempo mañana: </span>
                {camino.weatherTomorrow.temp}°C · {camino.weatherTomorrow.condition} · {camino.weatherTomorrow.tip}
              </p>
            </div>
          )}
        </Card>

        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Llegadas pendientes</h2>
          {llegadasPendientes.length === 0 ? (
            <p className="text-center text-slate-400 py-6" data-testid="llegadas-empty-state">
              No hay llegadas pendientes.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {llegadasPendientes.map((r) => (
                <Card key={r.id} className="flex items-center justify-between gap-3" data-testid={`arrival-card-${r.id}`}>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {r.guestName} <span className="text-slate-400 font-normal">({r.nationality})</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cama {r.bed} · {r.estimatedTime}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/checkin/${r.id}`)}
                    data-testid={`arrival-checkin-button-${r.id}`}
                  >
                    Check-in
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">Huéspedes activos</h2>
          </div>
          {guests.length === 0 ? (
            <p className="text-center text-slate-400 py-6" data-testid="guests-empty-state">
              No hay huéspedes activos.
            </p>
          ) : (
            <Card padding={false} data-testid="active-guests-list">
              {guests.map((g, idx) => (
                <div
                  key={g.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    idx !== guests.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{g.name}</p>
                    <p className="text-xs text-slate-400">
                      Cama {g.bedId} · Sale el {formatDate(g.checkout)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/huespedes')}
                    data-testid={`guest-ver-link-${g.id}`}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                  >
                    Ver
                  </button>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </ManagerLayout>
  );
}

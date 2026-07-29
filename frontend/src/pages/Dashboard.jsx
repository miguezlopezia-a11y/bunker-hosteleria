import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
const CAMINO = {
  stage: { from: 'Pamplona', to: 'Logroño', km: 62, difficulty: 'Dificultad media' },
  weatherToday: { temp: 18, condition: 'Parcialmente nublado', wind: 12 },
  weatherTomorrow: { temp: 14, condition: 'Lluvia probable', tip: 'Llevar impermeable' },
};
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { formatDate, formatEuro, isSameDay } from '../utils/format';

function ShareDirectBookingCard({ hostel }) {
  const { showToast } = useToast();
  if (!hostel) return null;

  const bookingUrl = `${window.location.origin}/web?hostel=${hostel.slug}`;
  const shareMessage = `Reserva tu cama directamente en ${hostel.name}, sin comisiones: ${bookingUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      showToast('Enlace copiado');
    } catch (e) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = bookingUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Enlace copiado');
      } catch (fallbackError) {
        showToast('No se pudo copiar. Selecciona el enlace manualmente.', 'error');
      }
    }
  };

  const handleWhatsappShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="mb-6" data-testid="share-direct-booking-card">
      <h2 className="text-base font-semibold text-slate-900 mb-1">Compartir enlace de reserva directa</h2>
      <p className="text-xs text-slate-400 mb-3">
        Envía este enlace a huéspedes potenciales para que reserven sin comisiones.
      </p>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          readOnly
          value={bookingUrl}
          onFocus={(e) => e.target.select()}
          data-testid="direct-booking-link-input"
          aria-label="Enlace de reserva directa"
          className="flex-1 border border-gray-200 rounded-md px-3 py-2.5 text-sm text-slate-600 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={handleCopy} data-testid="copy-direct-link-button">
          Copiar enlace
        </Button>
        <Button onClick={handleWhatsappShare} data-testid="share-whatsapp-button">
          Enviar por WhatsApp
        </Button>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { session, reservations, guests, beds, notifications, modoDirecto } = useApp();
  const navigate = useNavigate();
  const [caminoOpen, setCaminoOpen] = useState(true);
  const today = new Date();

  const llegadasPendientes = reservations.filter(
    (r) => r.status === 'pendiente' && isSameDay(r.checkin, today)
  );
  const salidasHoy = guests.filter((g) => isSameDay(g.checkout, today));
  const disponibles = beds.filter((b) => b.status === 'free');
  const occupiedCount = beds.filter((b) => b.status === 'occupied').length;

  const unreadNotifications = notifications.filter((n) => !n.read);
  const alertaMasUrgente = unreadNotifications.find((n) => n.type === 'alerta') || unreadNotifications[0];
  const pagoPendiente = guests.find((g) => g.paymentStatus === 'pendiente');

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto" data-testid="dashboard-page">
        {modoDirecto && (
          <button
            type="button"
            onClick={() => navigate('/reservas')}
            data-testid="modo-directo-indicator"
            className="w-full text-left bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-2.5 text-sm font-medium mb-2 hover:bg-blue-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
            Modo Directo activo — canales externos en pausa, solo reservas directas · Gestionar →
          </button>
        )}

        {(alertaMasUrgente || pagoPendiente) && (
          <div className="flex flex-col gap-2 mb-5">
            {alertaMasUrgente && (
              <button
                type="button"
                onClick={() => navigate('/maia')}
                data-testid="alert-maia"
                className="text-left bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <span className="font-semibold">MaiA:</span> {alertaMasUrgente.message} — Ver panel →
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

        <ShareDirectBookingCard hostel={session?.hostel} />

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
                {CAMINO.stage.from} → {CAMINO.stage.to} · {CAMINO.stage.km} km · {CAMINO.stage.difficulty}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Tiempo hoy: </span>
                {CAMINO.weatherToday.temp}°C · {CAMINO.weatherToday.condition} · Viento {CAMINO.weatherToday.wind} km/h
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-900">Tiempo mañana: </span>
                {CAMINO.weatherTomorrow.temp}°C · {CAMINO.weatherTomorrow.condition} · {CAMINO.weatherTomorrow.tip}
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

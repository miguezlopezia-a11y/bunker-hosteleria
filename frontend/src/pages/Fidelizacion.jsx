import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Toggle from '../components/Toggle';
import { formatDate } from '../utils/format';

const HOW_IT_WORKS = [
  'El peregrino acumula 1 punto por cada noche',
  '10 puntos = 1 noche gratis en cualquier albergue BunkerHostal',
  'Descuento automático aplicado al reservar directamente',
];

function LoyaltyMemberModal({ member, onClose, onSave }) {
  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    points: member?.points ?? 0,
    routesCompleted: member?.routesCompleted ?? 0,
    lastCamino: member?.lastCamino || '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name) newErrors.name = 'Campo obligatorio';
    if (form.points === '' || Number(form.points) < 0) newErrors.points = 'Puntos inválidos';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({
      name: form.name,
      email: form.email,
      points: Number(form.points),
      routesCompleted: Number(form.routesCompleted || 0),
      lastCamino: form.lastCamino,
    });
  };

  return (
    <Modal isOpen onClose={onClose} title={member ? 'Editar peregrino' : 'Añadir peregrino'} testId="loyalty-member-modal" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="loyalty-member-form">
        <Input
          label="Nombre"
          required
          value={form.name}
          onChange={handleChange('name')}
          error={errors.name}
          data-testid="loyalty-member-name-input"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={handleChange('email')}
          data-testid="loyalty-member-email-input"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Puntos"
            type="number"
            min="0"
            required
            value={form.points}
            onChange={handleChange('points')}
            error={errors.points}
            data-testid="loyalty-member-points-input"
          />
          <Input
            label="Rutas completadas"
            type="number"
            min="0"
            value={form.routesCompleted}
            onChange={handleChange('routesCompleted')}
            data-testid="loyalty-member-routes-input"
          />
        </div>
        <Input
          label="Último Camino"
          value={form.lastCamino}
          onChange={handleChange('lastCamino')}
          data-testid="loyalty-member-camino-input"
        />
        <Button type="submit" fullWidth data-testid="loyalty-member-submit-button">
          Guardar
        </Button>
      </form>
    </Modal>
  );
}

function LoyaltyTab() {
  const { loyalty, addLoyaltyMember, updateLoyaltyMember, deleteLoyaltyMember } = useApp();
  const { showToast } = useToast();
  const [modalMember, setModalMember] = useState(null);
  const ranking = [...loyalty].sort((a, b) => b.points - a.points);

  const handleSave = async (data) => {
    const { error } = modalMember
      ? await updateLoyaltyMember(modalMember.id, data)
      : await addLoyaltyMember(data);
    if (error) {
      showToast(error, 'error');
      return;
    }
    showToast(modalMember ? 'Peregrino actualizado' : 'Peregrino añadido');
    setModalMember(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este miembro del programa?')) return;
    const { error } = await deleteLoyaltyMember(id);
    if (error) {
      showToast(error, 'error');
      return;
    }
    showToast('Peregrino eliminado');
  };

  return (
    <>
      <Card className="mb-6" data-testid="fidelizacion-status-card">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="pagado">ACTIVO</Badge>
        </div>
        <p className="text-sm text-slate-600">
          Gestiona el ranking de peregrinos frecuentes. Los puntos se acumulan automáticamente con cada check-in.
        </p>
      </Card>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">Ranking de peregrinos</h2>
        <Button onClick={() => setModalMember({})} data-testid="add-loyalty-member-button">
          Añadir peregrino
        </Button>
      </div>

      <h2 className="text-base font-semibold text-slate-900 mb-3">Cómo funciona</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {HOW_IT_WORKS.map((text, idx) => (
          <Card key={idx} className="text-center" data-testid={`fidelizacion-how-it-works-${idx}`}>
            <p className="text-sm font-semibold text-blue-600 mb-1">{idx + 1}</p>
            <p className="text-sm text-slate-600">{text}</p>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm" data-testid="loyalty-ranking-table">
          <thead>
            <tr className="text-left text-slate-400 border-b border-gray-200">
              <th scope="col" className="py-2 pr-3 font-medium">Nombre</th>
              <th scope="col" className="py-2 pr-3 font-medium">Rutas completadas</th>
              <th scope="col" className="py-2 pr-3 font-medium">Puntos</th>
              <th scope="col" className="py-2 pr-3 font-medium">Último Camino</th>
              <th scope="col" className="py-2 pr-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((p) => (
              <tr key={p.id} data-testid={`loyalty-ranking-row-${p.id}`} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-3 text-slate-900">{p.name}</td>
                <td className="py-2 pr-3 text-slate-600">{p.routesCompleted}</td>
                <td className="py-2 pr-3 text-slate-600">{p.points}</td>
                <td className="py-2 pr-3 text-slate-600">{p.lastCamino}</td>
                <td className="py-2 pr-3 text-right">
                  <button
                    type="button"
                    onClick={() => setModalMember(p)}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 mr-3"
                    data-testid={`loyalty-edit-button-${p.id}`}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="text-red-600 text-sm font-medium hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
                    data-testid={`loyalty-delete-button-${p.id}`}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalMember !== null && (
        <LoyaltyMemberModal
          member={modalMember.id ? modalMember : null}
          onClose={() => setModalMember(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}

function ReviewsTab() {
  const { session, reviewRequests, updateHostelInfo, markReviewManaged } = useApp();
  const { showToast } = useToast();
  const [googleUrl, setGoogleUrl] = useState(session?.hostelRaw?.google_review_url || '');
  const [bookingUrl, setBookingUrl] = useState(session?.hostelRaw?.booking_review_url || '');
  const [autoSend, setAutoSend] = useState(session?.hostel?.autoSendSurvey ?? true);
  const [saving, setSaving] = useState(false);

  const responded = reviewRequests.filter((r) => r.responded_at);
  const redirected = responded.filter((r) => r.score >= 4);
  const retained = responded.filter((r) => r.score <= 3);

  const handleSaveUrls = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateHostelInfo({
      googleReviewUrl: googleUrl,
      bookingReviewUrl: bookingUrl,
      autoSendSurvey: autoSend,
    });
    setSaving(false);
    showToast('Configuración de reseñas actualizada');
  };

  return (
    <div data-testid="reviews-tab">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card data-testid="reviews-metric-captadas">
          <p className="text-xs text-slate-400">Reseñas captadas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{responded.length}</p>
        </Card>
        <Card data-testid="reviews-metric-redirigidas">
          <p className="text-xs text-slate-400">Redirigidas a público (4-5★)</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{redirected.length}</p>
        </Card>
        <Card data-testid="reviews-metric-retenidas">
          <p className="text-xs text-slate-400">Retenidas internamente (1-3★)</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{retained.length}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Reseñas internas</h2>
        {retained.length === 0 ? (
          <p className="text-center text-slate-400 py-6" data-testid="reviews-internal-empty">
            No hay reseñas internas pendientes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="reviews-internal-table">
              <thead>
                <tr className="text-left text-slate-400 border-b border-gray-200">
                  <th className="py-2 pr-3 font-medium">Huésped</th>
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Puntuación</th>
                  <th className="py-2 pr-3 font-medium">Comentario</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {retained.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-0" data-testid={`review-internal-row-${r.id}`}>
                    <td className="py-2 pr-3 text-slate-900">{r.guest_name}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatDate(r.responded_at)}</td>
                    <td className="py-2 pr-3 text-slate-600">{r.score}★</td>
                    <td className="py-2 pr-3 text-slate-600">{r.feedback || '—'}</td>
                    <td className="py-2 pr-3">
                      {r.managed ? (
                        <Badge variant="pagado">Gestionado</Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            const { error } = await markReviewManaged(r.id);
                            if (error) {
                              showToast(error, 'error');
                            } else {
                              showToast('Marcado como gestionado');
                            }
                          }}
                          className="text-blue-600 text-sm font-medium hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                          data-testid={`review-manage-button-${r.id}`}
                        >
                          Marcar gestionado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Configuración</h2>
        <form onSubmit={handleSaveUrls} className="flex flex-col gap-4">
          <Input
            label="URL Google Reviews del albergue"
            type="url"
            value={googleUrl}
            onChange={(e) => setGoogleUrl(e.target.value)}
            data-testid="google-review-url-input"
          />
          <Input
            label="URL Booking.com del albergue"
            type="url"
            value={bookingUrl}
            onChange={(e) => setBookingUrl(e.target.value)}
            data-testid="booking-review-url-input"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Enviar encuesta automáticamente al hacer checkout</span>
            <Toggle
              label="Enviar encuesta automáticamente al hacer checkout"
              checked={autoSend}
              onChange={(value) => setAutoSend(value)}
              testId="auto-send-survey-toggle"
            />
          </div>
          <Button type="submit" loading={saving} data-testid="save-review-urls-button">
            Guardar configuración
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function Fidelizacion() {
  const [activeTab, setActiveTab] = useState('peregrinos');

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto" data-testid="fidelizacion-page">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Fidelización y reseñas</h1>

        <Tabs
          tabs={[
            { id: 'peregrinos', label: 'Programa Peregrino' },
            { id: 'resenas', label: 'Reseñas' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          testIdPrefix="fidelizacion-tab"
        />

        <div className="mt-4">
          {activeTab === 'peregrinos' ? <LoyaltyTab /> : <ReviewsTab />}
        </div>
      </div>
    </ManagerLayout>
  );
}

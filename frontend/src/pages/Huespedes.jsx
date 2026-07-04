import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { formatDate, formatEuro, isSameDay } from '../utils/format';

const CHANNEL_OPTIONS = [
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Email', label: 'Email' },
];

function PaymentLinkModal({ guest, onClose }) {
  const { sendPaymentLink } = useApp();
  const { showToast } = useToast();
  const [amount, setAmount] = useState(guest?.price || 0);
  const [channel, setChannel] = useState('WhatsApp');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (guest) setAmount(guest.price);
  }, [guest]);

  if (!guest) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('El importe debe ser mayor que 0');
      return;
    }
    setSending(true);
    setTimeout(() => {
      sendPaymentLink(guest.id);
      setSending(false);
      showToast('Enlace enviado');
      onClose();
    }, 700);
  };

  return (
    <Modal isOpen onClose={onClose} title={`Enviar enlace de pago a ${guest.name}`} testId="payment-link-modal" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="payment-link-form">
        <Input
          label="Importe"
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          data-testid="payment-link-amount-input"
        />
        <Select
          label="Canal"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          options={CHANNEL_OPTIONS}
          data-testid="payment-link-channel-select"
        />
        {error && <p className="text-red-600 text-sm" data-testid="payment-link-error">{error}</p>}
        <Button type="submit" fullWidth loading={sending} data-testid="payment-link-submit-button">
          Enviar
        </Button>
      </form>
    </Modal>
  );
}

function GuestDetailModal({ guest, onClose, onCheckout, onSendPaymentLink }) {
  if (!guest) return null;
  const checkoutToday = isSameDay(guest.checkout, new Date());

  return (
    <Modal isOpen onClose={onClose} title={guest.name} testId="guest-detail-modal">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Datos personales</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
            <p><span className="text-slate-400">Documento: </span>{guest.document || '—'}</p>
            <p><span className="text-slate-400">Nacionalidad: </span>{guest.nationality}</p>
            <p><span className="text-slate-400">Nacimiento: </span>{guest.dob ? formatDate(guest.dob) : '—'}</p>
            <p><span className="text-slate-400">Teléfono: </span>{guest.phone || '—'}</p>
            <p className="col-span-2"><span className="text-slate-400">Email: </span>{guest.email || '—'}</p>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Estancia</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
            <p><span className="text-slate-400">Cama: </span>{guest.bedId}</p>
            <p><span className="text-slate-400">Precio: </span>{formatEuro(guest.price)}</p>
            <p><span className="text-slate-400">Fechas: </span>{formatDate(guest.checkin)} — {formatDate(guest.checkout)}</p>
            <p><span className="text-slate-400">Origen: </span>{guest.origin}</p>
            <p className="col-span-2"><span className="text-slate-400">Puntos de fidelización: </span>{guest.loyaltyPoints}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Estado del pago</span>
          <Badge variant={guest.paymentStatus === 'pagado' ? 'pagado' : 'pendiente_pago'} data-testid="guest-payment-status-badge">
            {guest.paymentStatus === 'pagado' ? 'Pagado' : 'Pendiente'}
          </Badge>
        </div>

        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => onSendPaymentLink(guest)} data-testid="send-payment-link-button">
            Enviar enlace de pago
          </Button>
          {checkoutToday && (
            <Button variant="danger" onClick={() => onCheckout(guest.id)} data-testid="guest-checkout-button">
              Check-out
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function Huespedes() {
  const { guests, checkOutGuest } = useApp();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [paymentGuest, setPaymentGuest] = useState(null);

  const filtered = guests.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  const handleCheckout = (guestId) => {
    checkOutGuest(guestId);
    showToast('Check-out realizado');
    setSelectedGuest(null);
  };

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto" data-testid="huespedes-page">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Huéspedes activos</h1>

        <Input
          label="Buscar huésped"
          placeholder="Nombre del huésped"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
          data-testid="guests-search-input"
        />

        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-10" data-testid="guests-search-empty-state">
            No hay huéspedes activos.
          </p>
        ) : (
          <Card padding={false} data-testid="guests-list">
            {filtered.map((g, idx) => {
              const checkoutToday = isSameDay(g.checkout, new Date());
              return (
                <div
                  key={g.id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    idx !== filtered.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                  data-testid={`guest-row-${g.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{g.name}</p>
                      <span className="text-xs text-slate-400">({g.nationality})</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Cama {g.bedId} · {formatDate(g.checkin)} — {formatDate(g.checkout)}
                    </p>
                  </div>
                  <Badge variant={checkoutToday ? 'checkout_hoy' : 'activo'}>
                    {checkoutToday ? 'Check-out hoy' : 'Activo'}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setSelectedGuest(g)}
                    data-testid={`guest-detail-link-${g.id}`}
                    className="text-blue-600 text-sm font-medium hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                  >
                    Ver detalle
                  </button>
                </div>
              );
            })}
          </Card>
        )}

        <GuestDetailModal
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          onCheckout={handleCheckout}
          onSendPaymentLink={(g) => setPaymentGuest(g)}
        />
        <PaymentLinkModal guest={paymentGuest} onClose={() => setPaymentGuest(null)} />
      </div>
    </ManagerLayout>
  );
}

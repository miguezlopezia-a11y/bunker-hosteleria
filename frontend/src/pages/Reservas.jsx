import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Tabs from '../components/Tabs';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import { formatDate, formatEuro, addDays, isBetweenInclusive } from '../utils/format';

const ORIGIN_OPTIONS = [
  { value: 'Booking.com', label: 'Booking.com' },
  { value: 'Airbnb', label: 'Airbnb' },
  { value: 'Hostelworld', label: 'Hostelworld' },
  { value: 'Directo', label: 'Directo' },
];

function NewReservationModal({ isOpen, onClose }) {
  const { addReservation, beds } = useApp();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    guestName: '',
    checkin: '',
    checkout: '',
    bed: '',
    price: '',
    origin: 'Directo',
  });
  const [errors, setErrors] = useState({});

  const bedOptions = beds.map((b) => ({ value: b.id, label: `Cama ${b.id}` }));

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.guestName) newErrors.guestName = 'Campo obligatorio';
    if (!form.checkin) newErrors.checkin = 'Campo obligatorio';
    if (!form.checkout) newErrors.checkout = 'Campo obligatorio';
    if (form.checkin && form.checkout && new Date(form.checkout) <= new Date(form.checkin)) {
      newErrors.checkout = 'La fecha de salida debe ser posterior a la de entrada';
    }
    if (!form.bed) newErrors.bed = 'Campo obligatorio';
    if (!form.price || Number(form.price) <= 0) newErrors.price = 'El precio debe ser mayor que 0';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    addReservation({
      guestName: form.guestName,
      checkin: new Date(form.checkin),
      checkout: new Date(form.checkout),
      bed: form.bed,
      room: Number(form.bed.charAt(0)),
      price: Number(form.price),
      origin: form.origin,
      nationality: '',
    });
    showToast('Reserva creada correctamente');
    setForm({ guestName: '', checkin: '', checkout: '', bed: '', price: '', origin: 'Directo' });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva reserva" testId="new-reservation-modal">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="new-reservation-form">
        <Input
          label="Nombre completo"
          required
          value={form.guestName}
          onChange={handleChange('guestName')}
          error={errors.guestName}
          data-testid="new-reservation-name-input"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha entrada"
            required
            type="date"
            value={form.checkin}
            onChange={handleChange('checkin')}
            error={errors.checkin}
            data-testid="new-reservation-checkin-input"
          />
          <Input
            label="Fecha salida"
            required
            type="date"
            value={form.checkout}
            onChange={handleChange('checkout')}
            error={errors.checkout}
            data-testid="new-reservation-checkout-input"
          />
        </div>
        <Select
          label="Habitación / cama"
          required
          value={form.bed}
          onChange={handleChange('bed')}
          options={bedOptions}
          placeholder="Selecciona una cama"
          error={errors.bed}
          data-testid="new-reservation-bed-select"
        />
        <Input
          label="Precio"
          required
          type="number"
          min="0"
          value={form.price}
          onChange={handleChange('price')}
          error={errors.price}
          data-testid="new-reservation-price-input"
        />
        <Select
          label="Origen"
          required
          value={form.origin}
          onChange={handleChange('origin')}
          options={ORIGIN_OPTIONS}
          data-testid="new-reservation-origin-select"
        />
        <Button type="submit" fullWidth data-testid="new-reservation-submit-button">
          Guardar reserva
        </Button>
      </form>
    </Modal>
  );
}

function ReservationsList({ reservations, navigate }) {
  if (reservations.length === 0) {
    return (
      <p className="text-center text-slate-400 py-10" data-testid="reservations-empty-state">
        No hay reservas para este período.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2" data-testid="reservations-list">
      {reservations.map((r) => (
        <Card key={r.id} className="flex items-center justify-between gap-3 flex-wrap" data-testid={`reservation-card-${r.id}`}>
          <div className="flex-1 min-w-[180px]">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-slate-900">{r.guestName}</p>
              <Badge variant={r.origin}>{r.origin}</Badge>
            </div>
            <p className="text-xs text-slate-400">
              {formatDate(r.checkin)} — {formatDate(r.checkout)} · Cama {r.bed}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={r.status}>{r.status === 'pendiente' ? 'Pendiente' : 'Check-in hecho'}</Badge>
            <p className="text-sm font-semibold text-slate-900 w-16 text-right">{formatEuro(r.price)}</p>
            {r.status === 'pendiente' ? (
              <Button variant="primary" onClick={() => navigate(`/checkin/${r.id}`)} data-testid={`reservation-checkin-button-${r.id}`}>
                Check-in
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => navigate('/huespedes')} data-testid={`reservation-ver-button-${r.id}`}>
                Ver
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function CalendarCellModal({ cell, onClose }) {
  if (!cell) return null;
  return (
    <Modal isOpen onClose={onClose} title="Detalle de la cama" testId="calendar-cell-modal" size="sm">
      <div className="flex flex-col gap-2 text-sm">
        <p><span className="font-medium text-slate-900">Huésped: </span>{cell.guest.name}</p>
        <p><span className="font-medium text-slate-900">Nacionalidad: </span>{cell.guest.nationality}</p>
        <p><span className="font-medium text-slate-900">Fechas: </span>{formatDate(cell.guest.checkin)} — {formatDate(cell.guest.checkout)}</p>
        <p><span className="font-medium text-slate-900">Cama: </span>{cell.bed.id}</p>
      </div>
    </Modal>
  );
}

function CalendarTab({ beds, guests }) {
  const [dayOffset, setDayOffset] = useState(0);
  const [selectedCell, setSelectedCell] = useState(null);

  const allDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);
  const roomsMap = useMemo(() => {
    const map = {};
    beds.forEach((b) => {
      if (!map[b.room]) map[b.room] = [];
      map[b.room].push(b);
    });
    return map;
  }, [beds]);

  const getCell = (bed, day) => {
    if (bed.status === 'blocked') return { status: 'blocked' };
    const guest = guests.find(
      (g) => g.bedId === bed.id && isBetweenInclusive(day, g.checkin, g.checkout)
    );
    if (guest) return { status: 'occupied', guest, bed };
    return { status: 'available' };
  };

  const renderGrid = (days) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs" data-testid="calendar-grid">
        <thead>
          <tr>
            <th className="text-left text-slate-400 font-medium py-1.5 px-1 w-14">Cama</th>
            {days.map((d) => (
              <th key={d.toISOString()} className="text-slate-400 font-medium py-1.5 px-1 text-center min-w-[60px]">
                {formatDate(d).slice(0, 5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(roomsMap).sort().map((roomId) => (
            <React.Fragment key={roomId}>
              <tr>
                <td colSpan={days.length + 1} className="text-slate-600 font-semibold pt-2 pb-1 px-1">
                  Habitación {roomId}
                </td>
              </tr>
              {roomsMap[roomId].map((bed) => (
                <tr key={bed.id}>
                  <td className="py-1 px-1 font-medium text-slate-900">{bed.id}</td>
                  {days.map((d) => {
                    const cell = getCell(bed, d);
                    const cellClass =
                      cell.status === 'occupied'
                        ? 'bg-blue-600 cursor-pointer hover:bg-blue-700'
                        : cell.status === 'blocked'
                        ? 'bg-gray-200'
                        : 'bg-white border border-gray-200';
                    return (
                      <td key={d.toISOString()} className="p-1">
                        <button
                          type="button"
                          onClick={() => cell.status === 'occupied' && setSelectedCell(cell)}
                          data-testid={`calendar-cell-${bed.id}-${formatDate(d).replace(/\//g, '-')}`}
                          className={`w-full h-6 rounded ${cellClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          aria-label={`Cama ${bed.id} ${formatDate(d)} ${cell.status}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div data-testid="calendario-tab-content">
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Ocupada</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" /> Disponible</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Bloqueada</span>
      </div>

      <div className="hidden md:block">{renderGrid(allDays)}</div>

      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="secondary"
            onClick={() => setDayOffset((o) => Math.max(0, o - 3))}
            disabled={dayOffset === 0}
            data-testid="calendar-prev-button"
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDayOffset((o) => Math.min(4, o + 3))}
            disabled={dayOffset >= 4}
            data-testid="calendar-next-button"
          >
            Siguiente
          </Button>
        </div>
        {renderGrid(allDays.slice(dayOffset, dayOffset + 3))}
      </div>

      <CalendarCellModal cell={selectedCell} onClose={() => setSelectedCell(null)} />
    </div>
  );
}

export default function Reservas() {
  const { reservations, beds, guests } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('lista');
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto" data-testid="reservas-page">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Reservas</h1>
          <Button onClick={() => setModalOpen(true)} data-testid="new-reservation-button">
            + Nueva reserva
          </Button>
        </div>

        <Tabs
          tabs={[
            { id: 'lista', label: 'Lista' },
            { id: 'calendario', label: 'Calendario' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          testIdPrefix="reservas-tab"
        />

        <div className="mt-4">
          {activeTab === 'lista' ? (
            <ReservationsList reservations={reservations} navigate={navigate} />
          ) : (
            <CalendarTab beds={beds} guests={guests} />
          )}
        </div>

        <NewReservationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </ManagerLayout>
  );
}

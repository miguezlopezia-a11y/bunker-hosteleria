import React, { useState } from 'react';
import { publicService } from '../../services/publicService';
import Card from '../Card';
import Input from '../Input';
import Select from '../Select';
import Button from '../Button';
import { formatEuro, addDays } from '../../utils/format';

const PERSON_OPTIONS = Array.from({ length: 6 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}` }));

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function toDbDate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

// Flujo de reserva directa compartido por Web.jsx (/web?hostel=) y
// PaginaHostal.jsx (/sitio/:slug). El padre carga hostel y beds y decide qué
// hacer al confirmar (onSuccess): Web lo muestra a pantalla completa,
// PaginaHostal en línea.
export default function ReservaDirecta({ slug, hostel, beds, onSuccess }) {
  const [checkin, setCheckin] = useState(toDateInputValue(new Date()));
  const [checkout, setCheckout] = useState(toDateInputValue(addDays(new Date(), 1)));
  const [persons, setPersons] = useState('1');
  const [showAvailability, setShowAvailability] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedBed, setSelectedBed] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    nationality: '',
    paymentMethod: 'tarjeta',
    conditions: false,
  });
  const [errors, setErrors] = useState({});

  const availableBeds = beds.filter((b) => b.status === 'free');

  // El servidor cobra base_price × noches (migración 025); el botón muestra
  // ese mismo total para que lo que se ve sea lo que se cobra.
  const nights = Math.max(0, Math.round((new Date(checkout) - new Date(checkin)) / 86400000));
  const total = hostel && nights > 0 ? hostel.base_price * nights : null;

  // Al consultar disponibilidad se recargan las habitaciones privadas para la
  // fecha de entrada elegida. La RPC (migración 022) puede no existir aún en
  // prod: cualquier error se trata como "sin habitaciones" y no rompe la página.
  const handleCheckAvailability = async () => {
    setShowAvailability(true);
    setSelectedBed(null);
    setSelectedRoom(null);
    try {
      const { data, error } = await publicService.getRoomsByHostalSlug(slug, toDbDate(checkin));
      setRooms(error ? [] : data || []);
    } catch {
      setRooms([]);
    }
  };

  const handleFormChange = (field) => (e) => {
    const value = field === 'conditions' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name) newErrors.name = 'Campo obligatorio';
    if (!form.email) newErrors.email = 'Campo obligatorio';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = 'Email no válido';
    if (!form.phone) newErrors.phone = 'Campo obligatorio';
    else if (!/^\d+$/.test(form.phone)) newErrors.phone = 'Solo se permiten dígitos';
    if (!form.document) newErrors.document = 'Campo obligatorio';
    if (!form.nationality) newErrors.nationality = 'Campo obligatorio';
    if (!form.conditions) newErrors.conditions = 'Campo obligatorio';
    if (new Date(checkout) <= new Date(checkin)) {
      newErrors.dates = 'La salida debe ser posterior a la entrada';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    let data, error;
    try {
      ({ data, error } = await publicService.createPublicBooking({
        slug,
        bedLabel: selectedBed.label,
        guestName: form.name,
        guestEmail: form.email,
        guestPhone: form.phone,
        guestDocument: form.document,
        guestNationality: form.nationality,
        checkin: toDbDate(checkin),
        checkout: toDbDate(checkout),
        price: hostel.base_price,
      }));
    } catch (networkErr) {
      error = networkErr;
    }
    setSubmitting(false);

    if (error) {
      setErrors({ submit: 'Sin conexión con el servidor. Comprueba tu cobertura e inténtalo de nuevo.' });
      return;
    }
    if (!data?.exito) {
      setErrors({ submit: data?.error || 'No se pudo completar la reserva. Inténtalo de nuevo.' });
      return;
    }

    onSuccess();
  };

  // Reserva de habitación privada: la RPC no acepta precio (lo calcula el
  // servidor) ni teléfono/documento — solo nombre, email y nacionalidad.
  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name) newErrors.name = 'Campo obligatorio';
    if (!form.email) newErrors.email = 'Campo obligatorio';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = 'Email no válido';
    if (!form.nationality) newErrors.nationality = 'Campo obligatorio';
    if (!form.conditions) newErrors.conditions = 'Campo obligatorio';
    if (new Date(checkout) <= new Date(checkin)) {
      newErrors.dates = 'La salida debe ser posterior a la entrada';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    let data, error;
    try {
      ({ data, error } = await publicService.createPublicBookingRoom({
        slug,
        roomName: selectedRoom.name,
        guestName: form.name,
        guestEmail: form.email,
        guestNationality: form.nationality,
        checkin: toDbDate(checkin),
        checkout: toDbDate(checkout),
      }));
    } catch (networkErr) {
      error = networkErr;
    }
    setSubmitting(false);

    if (error) {
      setErrors({ submit: 'Sin conexión con el servidor. Comprueba tu cobertura e inténtalo de nuevo.' });
      return;
    }
    if (!data?.exito) {
      setErrors({ submit: data?.error || 'No se pudo completar la reserva. Inténtalo de nuevo.' });
      return;
    }

    onSuccess();
  };

  return (
    <>
      <Card className="mt-8">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Disponibilidad</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            label="Llegada"
            type="date"
            value={checkin}
            onChange={(e) => setCheckin(e.target.value)}
            data-testid="availability-checkin-input"
          />
          <Input
            label="Salida"
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
            data-testid="availability-checkout-input"
          />
          <Select
            label="Número de personas"
            value={persons}
            onChange={(e) => setPersons(e.target.value)}
            options={PERSON_OPTIONS}
            data-testid="availability-persons-select"
          />
          <div className="flex items-end">
            <Button
              fullWidth
              onClick={handleCheckAvailability}
              data-testid="availability-check-button"
            >
              Ver disponibilidad
            </Button>
          </div>
        </div>
        {errors.dates && (
          <p className="text-red-600 text-sm mt-2" data-testid="public-booking-dates-error">{errors.dates}</p>
        )}
      </Card>

      {showAvailability && !selectedBed && !selectedRoom && (
        <Card className="mt-4" data-testid="available-beds-list">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Camas disponibles</h2>
          {availableBeds.length === 0 ? (
            <p className="text-center text-slate-400 py-6" data-testid="available-beds-empty-state">
              No hay camas disponibles para estas fechas.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {availableBeds.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
                  data-testid={`available-bed-${b.label}`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">Cama {b.label}</p>
                    <p className="text-xs text-slate-400">{formatEuro(hostel.base_price)}/noche</p>
                  </div>
                  <Button onClick={() => setSelectedBed(b)} data-testid={`reserve-bed-button-${b.label}`}>
                    Reservar esta cama
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {showAvailability && !selectedBed && !selectedRoom && rooms.length > 0 && (
        <Card className="mt-4" data-testid="available-rooms-list">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Habitaciones privadas</h2>
          <div className="flex flex-col gap-2">
            {rooms.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
                data-testid={`available-room-${r.name}`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">Habitación {r.name}</p>
                  <p className="text-xs text-slate-400">
                    Capacidad: {r.capacity} personas · {formatEuro(r.price_per_night)}/noche
                  </p>
                </div>
                {r.status === 'free' ? (
                  <Button onClick={() => setSelectedRoom(r)} data-testid={`reserve-room-button-${r.name}`}>
                    Reservar esta habitación
                  </Button>
                ) : (
                  <p className="text-xs text-slate-400" data-testid={`room-occupied-${r.name}`}>
                    Ocupada en estas fechas
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {selectedBed && (
        <Card className="mt-4" data-testid="public-booking-form-card">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Completa tu reserva · Cama {selectedBed.label}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="public-booking-form">
            <Input label="Nombre completo" required value={form.name} onChange={handleFormChange('name')} error={errors.name} data-testid="public-booking-name-input" />
            <Input label="Email" required type="email" value={form.email} onChange={handleFormChange('email')} error={errors.email} data-testid="public-booking-email-input" />
            <Input label="Teléfono" required type="tel" value={form.phone} onChange={handleFormChange('phone')} error={errors.phone} data-testid="public-booking-phone-input" />
            <Input label="Documento" required value={form.document} onChange={handleFormChange('document')} error={errors.document} data-testid="public-booking-document-input" />
            <Input label="Nacionalidad" required value={form.nationality} onChange={handleFormChange('nationality')} error={errors.nationality} placeholder="ES" data-testid="public-booking-nationality-input" />

            <div>
              <p className="text-sm font-medium text-slate-900 mb-2">Método de pago</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={form.paymentMethod === 'tarjeta'}
                    onChange={() => setForm((prev) => ({ ...prev, paymentMethod: 'tarjeta' }))}
                    data-testid="payment-method-tarjeta-radio"
                  />
                  Pagar ahora con tarjeta
                </label>
                <label className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={form.paymentMethod === 'albergue'}
                    onChange={() => setForm((prev) => ({ ...prev, paymentMethod: 'albergue' }))}
                    data-testid="payment-method-albergue-radio"
                  />
                  Reservar con tarjeta, pagar en el albergue
                </label>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.conditions}
                onChange={handleFormChange('conditions')}
                data-testid="public-booking-conditions-checkbox"
                className="mt-0.5"
              />
              Acepto las condiciones
            </label>
            {errors.conditions && <p className="text-red-600 text-xs">{errors.conditions}</p>}
            {errors.submit && <p className="text-red-600 text-sm" role="alert">{errors.submit}</p>}

            <Button type="submit" fullWidth loading={submitting} data-testid="public-booking-submit-button">
              {form.paymentMethod === 'tarjeta'
                ? `Confirmar y pagar ${formatEuro(total ?? hostel.base_price)}`
                : 'Reservar y garantizar con tarjeta'}
            </Button>
          </form>
        </Card>
      )}

      {selectedRoom && (
        <Card className="mt-4" data-testid="public-room-booking-form-card">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Completa tu reserva · Habitación {selectedRoom.name}
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            {formatEuro(selectedRoom.price_per_night)}/noche · El precio total se calcula al confirmar
          </p>
          <form onSubmit={handleRoomSubmit} className="flex flex-col gap-4" data-testid="public-room-booking-form">
            <Input label="Nombre completo" required value={form.name} onChange={handleFormChange('name')} error={errors.name} data-testid="public-room-booking-name-input" />
            <Input label="Email" required type="email" value={form.email} onChange={handleFormChange('email')} error={errors.email} data-testid="public-room-booking-email-input" />
            <Input label="Nacionalidad" required value={form.nationality} onChange={handleFormChange('nationality')} error={errors.nationality} placeholder="ES" data-testid="public-room-booking-nationality-input" />

            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.conditions}
                onChange={handleFormChange('conditions')}
                data-testid="public-room-booking-conditions-checkbox"
                className="mt-0.5"
              />
              Acepto las condiciones
            </label>
            {errors.conditions && <p className="text-red-600 text-xs">{errors.conditions}</p>}
            {errors.submit && <p className="text-red-600 text-sm" role="alert">{errors.submit}</p>}

            <Button type="submit" fullWidth loading={submitting} data-testid="public-room-booking-submit-button">
              Reservar esta habitación
            </Button>
          </form>
        </Card>
      )}
    </>
  );
}

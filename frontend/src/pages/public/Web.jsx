import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatEuro, addDays, formatPhone } from '../../utils/format';

const PERSON_OPTIONS = Array.from({ length: 6 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}` }));

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function toDbDate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export default function Web() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('hostel');

  const [hostel, setHostel] = useState(null);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [checkin, setCheckin] = useState(toDateInputValue(new Date()));
  const [checkout, setCheckout] = useState(toDateInputValue(addDays(new Date(), 1)));
  const [persons, setPersons] = useState('1');
  const [showAvailability, setShowAvailability] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [success, setSuccess] = useState(false);
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

  useEffect(() => {
    if (!slug) {
      setPageError('Falta el slug del albergue');
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const [{ data: hostelData, error: hostelError }, { data: bedsData, error: bedsError }] = await Promise.all([
          publicService.getHostalBySlug(slug),
          publicService.getBedsByHostalSlug(slug),
        ]);

        if (hostelError || !hostelData) {
          setPageError('No se encontró el albergue.');
        } else {
          setHostel(hostelData);
          setBeds(bedsData || []);
        }
      } catch (err) {
        setPageError('Error cargando la página.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  const availableBeds = beds.filter((b) => b.status === 'free');

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
    const { error } = await publicService.createPublicBooking({
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
    });
    setSubmitting(false);

    if (error) {
      setErrors({ submit: 'No se pudo completar la reserva. Inténtalo de nuevo.' });
      return;
    }

    setSuccess(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (pageError || !hostel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <p className="text-red-600">{pageError || 'Albergue no disponible'}</p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md text-center" data-testid="public-booking-success-screen">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" className="mx-auto mb-3">
            <circle cx="12" cy="12" r="10" />
            <path d="m8 12 3 3 5-6" />
          </svg>
          <p className="text-lg font-semibold text-slate-900">
            Reserva confirmada. Recibirás confirmación por email.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="public-booking-page">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900 text-center" data-testid="public-booking-title">
          {hostel.name} — Reserva directa sin comisiones
        </h1>
        <p className="text-center text-slate-400 text-sm mt-1">Precio desde {formatEuro(hostel.base_price)}/noche</p>

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
                onClick={() => setShowAvailability(true)}
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

        {showAvailability && !selectedBed && (
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
                  ? `Confirmar y pagar ${formatEuro(hostel.base_price)}`
                  : 'Reservar y garantizar con tarjeta'}
              </Button>
            </form>
          </Card>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 text-center">
          {[
            'Sin comisiones — precio directo',
            'Pago seguro Stripe',
            'Confirmación inmediata por email',
            'Cancelación gratuita hasta 48h antes',
          ].map((signal) => (
            <p key={signal} className="text-xs text-slate-400">
              {signal}
            </p>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400 mt-10">
          ¿Eres propietario de un albergue?{' '}
          <a
            href="https://bunkerhostal.com"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="public-booking-owner-link"
            className="text-blue-600 font-medium hover:text-blue-700"
          >
            → bunkerhostal.com
          </a>
        </p>
      </div>
    </div>
  );
}

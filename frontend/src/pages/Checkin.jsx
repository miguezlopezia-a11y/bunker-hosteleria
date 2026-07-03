import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';

export default function Checkin() {
  const { reservationId } = useParams();
  const { reservations, checkInReservation } = useApp();
  const navigate = useNavigate();
  const reservation = reservations.find((r) => String(r.id) === String(reservationId));

  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [signed, setSigned] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: reservation?.guestName || '',
    document: '',
    nationality: reservation?.nationality || '',
    dob: '',
    phone: reservation?.phone || '',
    email: reservation?.email || '',
  });

  if (!reservation) {
    return (
      <ManagerLayout>
        <div className="p-4 md:p-8 max-w-lg mx-auto text-center" data-testid="checkin-not-found">
          <p className="text-slate-600">Reserva no encontrada.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/dashboard')}>
            Volver al dashboard
          </Button>
        </div>
      </ManagerLayout>
    );
  }

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleStep1Submit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name) newErrors.name = 'Campo obligatorio';
    if (!form.document) newErrors.document = 'Campo obligatorio';
    if (!form.nationality) newErrors.nationality = 'Campo obligatorio';
    if (!form.dob) newErrors.dob = 'Campo obligatorio';
    if (!form.phone) newErrors.phone = 'Campo obligatorio';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setStep(2);
  };

  const handleComplete = () => {
    checkInReservation(reservation.id, form);
    setCompleted(true);
  };

  if (completed) {
    return (
      <ManagerLayout>
        <div className="p-4 md:p-8 max-w-lg mx-auto text-center" data-testid="checkin-success-screen">
          <Card>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" className="mx-auto mb-3">
              <circle cx="12" cy="12" r="10" />
              <path d="m8 12 3 3 5-6" />
            </svg>
            <p className="text-lg font-semibold text-slate-900">
              Check-in completado · Cama {reservation.bed} asignada
            </p>
            <Button className="mt-5" fullWidth onClick={() => navigate('/dashboard')} data-testid="checkin-success-dashboard-button">
              Volver al dashboard
            </Button>
          </Card>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-lg mx-auto" data-testid="checkin-page">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Check-in · {reservation.guestName}</h1>
        <p className="text-sm text-slate-400 mb-4">Cama asignada: {reservation.bed}</p>
        <ProgressBar percentage={(step / 3) * 100} />

        {step === 1 && (
          <Card className="mt-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">1. Datos del huésped</h2>
            <form onSubmit={handleStep1Submit} className="flex flex-col gap-4" data-testid="checkin-step1-form">
              <Input label="Nombre completo" required value={form.name} onChange={handleChange('name')} error={errors.name} data-testid="checkin-name-input" />
              <Input label="Documento (DNI/Pasaporte)" required value={form.document} onChange={handleChange('document')} error={errors.document} data-testid="checkin-document-input" />
              <Input label="Nacionalidad" required value={form.nationality} onChange={handleChange('nationality')} error={errors.nationality} data-testid="checkin-nationality-input" placeholder="ES" />
              <Input label="Fecha de nacimiento" required type="date" value={form.dob} onChange={handleChange('dob')} error={errors.dob} data-testid="checkin-dob-input" />
              <Input label="Teléfono" required type="tel" value={form.phone} onChange={handleChange('phone')} error={errors.phone} data-testid="checkin-phone-input" />
              <Input label="Email (opcional)" type="email" value={form.email} onChange={handleChange('email')} data-testid="checkin-email-input" />
              <Button type="submit" fullWidth data-testid="checkin-step1-continue-button">
                Continuar
              </Button>
            </form>
          </Card>
        )}

        {step === 2 && (
          <Card className="mt-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">2. Escanear documento</h2>
            <div className="border-2 border-dashed border-gray-200 rounded-lg py-10 flex flex-col items-center justify-center gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {scanned ? (
                <p className="text-green-600 font-medium flex items-center gap-1.5" data-testid="checkin-scan-success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m8 12 3 3 5-6" />
                  </svg>
                  Documento escaneado
                </p>
              ) : (
                <p className="text-slate-400 text-sm">Área de escaneo de documento</p>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-3">Enviado a SES Hospedajes (Ministerio del Interior)</p>
            {!scanned && (
              <Button variant="secondary" fullWidth className="mt-4" onClick={() => setScanned(true)} data-testid="checkin-simulate-scan-button">
                Simular escaneo
              </Button>
            )}
            <Button fullWidth className="mt-3" disabled={!scanned} onClick={() => setStep(3)} data-testid="checkin-step2-continue-button">
              Continuar
            </Button>
          </Card>
        )}

        {step === 3 && (
          <Card className="mt-5">
            <h2 className="text-base font-semibold text-slate-900 mb-2">3. Firma digital</h2>
            <p className="text-sm text-slate-600 mb-3">El huésped debe firmar el registro de entrada</p>
            <div className="border-2 border-dashed border-gray-200 rounded-lg h-32 flex items-center justify-center bg-white">
              <p className="text-slate-400 text-sm">
                {signed ? (
                  <span className="text-green-600 font-medium" data-testid="checkin-signature-success">
                    Firma recibida
                  </span>
                ) : (
                  'Área de firma'
                )}
              </p>
            </div>
            {!signed && (
              <Button variant="secondary" fullWidth className="mt-4" onClick={() => setSigned(true)} data-testid="checkin-simulate-signature-button">
                Simular firma
              </Button>
            )}
            <Button fullWidth className="mt-3" disabled={!signed} onClick={handleComplete} data-testid="checkin-complete-button">
              Completar check-in
            </Button>
          </Card>
        )}
      </div>
    </ManagerLayout>
  );
}

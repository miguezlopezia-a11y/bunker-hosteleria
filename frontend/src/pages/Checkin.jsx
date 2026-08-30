import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getToken = async () => {
  const { data: { session: s } } = await supabase.auth.getSession();
  return s?.access_token || '';
};

// Didit/Tesseract devuelven YYYY-MM-DD; se acepta también YYMMDD por robustez
const normalizeDate = (v) => {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (/^\d{6}$/.test(v)) {
    const yy = parseInt(v.slice(0, 2), 10);
    const yyyy = yy > 30 ? 1900 + yy : 2000 + yy;
    return `${yyyy}-${v.slice(2, 4)}-${v.slice(4, 6)}`;
  }
  return '';
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const TIPOS_DOC = [
  { value: 'D', label: 'DNI' },
  { value: 'N', label: 'NIE' },
  { value: 'P', label: 'Pasaporte' },
  { value: 'I', label: 'Doc. identidad extranjero' },
  { value: 'X', label: 'Permiso de residencia' },
];

// Mientras el alta en SES.HOSPEDAJES no esté configurada (ver
// shared/BLOQUEOS_CREDENCIALES.md), el scan se ejecuta en dry-run:
// mismo pipeline (OCR→validación→Supabase→XML) pero sin enviar a la policía.
// Al activar el SES real, quitar la env var y reconstruir.
const SES_DRY_RUN = process.env.REACT_APP_SES_DRY_RUN === 'true';

// URL pública real de la PWA "Cama del Camino" (verificada viva 2026-08-30).
// El QR de check-in apunta aquí; la sesión de peregrino la valida la RPC
// verify_peregrino_session (migración 007).
const PWA_BASE_URL = 'https://pwa-hostaleria.miguezlopezia.workers.dev';

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function Checkin() {
  const { reservationId } = useParams();
  const { session, reservations, checkInReservation } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const reservation = reservations.find((r) => String(r.id) === String(reservationId));
  const hostalId = session?.hostelRaw?.id;

  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [errors, setErrors] = useState({});
  const [peregrinoUrl, setPeregrinoUrl] = useState('');

  // Paso 2 — escaneo
  const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | ok | error
  const [scanData, setScanData] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanFailures, setScanFailures] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [huespedId, setHuespedId] = useState(null);

  // Paso 3 — firma
  const [signed, setSigned] = useState(false);
  const [firmaUrl, setFirmaUrl] = useState('');
  const [firmaError, setFirmaError] = useState('');

  const [form, setForm] = useState({
    name: reservation?.guestName || '',
    document: '',
    docType: 'D',
    docSupport: '',
    docExpiry: '',
    sex: '',
    nationality: reservation?.nationality || 'ESP',
    dob: '',
    phone: reservation?.phone || '',
    email: reservation?.email || '',
    address: '',
    city: '',
    residenceCountry: 'ESP',
    numTravelers: 1,
    kinship: '',
  });

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // La reserva puede llegar DESPUÉS del primer render (carga async o refresh
  // directo en /checkin/:id): inicializar el form cuando esté disponible,
  // sin pisar lo que el recepcionista haya escrito.
  useEffect(() => {
    if (!reservation) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || reservation.guestName || '',
      phone: prev.phone || reservation.phone || '',
      email: prev.email || reservation.email || '',
    }));
  }, [reservation]);

  // ---- Paso 3: firma real (hook ANTES de cualquier return condicional) -------

  useEffect(() => {
    if (step !== 3 || !huespedId || signed) return undefined;
    let cancelled = false;
    let interval;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/firma/generar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ huesped_id: huespedId, hostal_id: hostalId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.exito || !data.url) {
          setFirmaError('No se pudo generar el enlace de firma. Inténtalo de nuevo.');
          return;
        }
        setFirmaUrl(data.url);
        interval = setInterval(async () => {
          try {
            const r = await fetch(
              `/api/firma/estado?huesped_id=${huespedId}&hostal_id=${hostalId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const est = await r.json();
            if (est.tiene_firma) {
              clearInterval(interval);
              if (!cancelled) setSigned(true);
            }
          } catch { /* se reintenta en el próximo tick */ }
        }, 3000);
      } catch {
        if (!cancelled) setFirmaError('Error de red al generar el enlace de firma.');
      }
    })();
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [step, huespedId, signed, hostalId]);

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

  const fechaSalida = reservation.checkout
    ? new Date(reservation.checkout).toISOString().slice(0, 10)
    : '';

  const camposContacto = () => ({
    direccion: form.address,
    localidad: form.city,
    pais_residencia: form.residenceCountry,
    telefono: form.phone,
    email: form.email,
    num_viajeros: Number(form.numTravelers) || 1,
    parentesco_menores: form.kinship,
    referencia_contrato: String(reservation.id),
    tipo_pago: reservation.paymentMethod || '',
  });

  // ---- Paso 1 --------------------------------------------------------------

  const handleStep1Submit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name) newErrors.name = 'Campo obligatorio';
    if (!form.nationality) newErrors.nationality = 'Campo obligatorio';
    if (!form.dob) newErrors.dob = 'Campo obligatorio';
    if (!form.phone) newErrors.phone = 'Campo obligatorio';
    if (!form.address) newErrors.address = 'Campo obligatorio (RD 933/2021)';
    if (!form.city) newErrors.city = 'Campo obligatorio (RD 933/2021)';
    if (!form.residenceCountry) newErrors.residenceCountry = 'Campo obligatorio';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setStep(2);
  };

  // ---- Paso 2: escaneo real -------------------------------------------------

  const mensajeErrorScan = (data) => {
    const mrz = data?.etapas?.ocr?.datos_mrz || {};
    if (mrz.documento_caducado || data?.etapas?.ocr?.datos_mrz?.mrz_checks?.vigente === false) {
      return 'Documento caducado — no se puede hacer el check-in con este documento.';
    }
    if (data?.etapas?.validacion?.error?.includes('caducado')) {
      return 'Documento caducado — no se puede hacer el check-in con este documento.';
    }
    if (data?.alerta === 'LEGAL') {
      if (data?.etapas?.ocr?.error) {
        return 'No se detectó la zona de lectura — fotografía el REVERSO del documento, plano y con buena luz.';
      }
      return 'Lectura incorrecta — limpia la lente e inténtalo de nuevo.';
    }
    return 'Error de comunicación. Inténtalo de nuevo.';
  };

  const handleScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanStatus('scanning');
    setScanError('');
    try {
      const b64 = await fileToBase64(file);
      const token = await getToken();
      const res = await fetch('/api/policia/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          hostal_id: hostalId,
          imagen_b64: b64.split(',')[1],
          fecha_salida: fechaSalida,
          datos_extra: camposContacto(),
          dry_run: SES_DRY_RUN,
        }),
      });
      const data = await res.json();
      if (data.exito) {
        const mrz = data.etapas?.ocr?.datos_mrz || {};
        setScanData(mrz);
        setHuespedId(data.huesped_id || null);
        setScanStatus('ok');
        setForm((prev) => ({
          ...prev,
          name: [mrz.nombre, mrz.apellidos].filter(Boolean).join(' ') || prev.name,
          document: mrz.num_documento || prev.document,
          docType: mrz.tipo_documento || prev.docType,
          docSupport: mrz.num_soporte_doc || prev.docSupport,
          docExpiry: normalizeDate(mrz.fecha_caducidad_doc) || prev.docExpiry,
          sex: mrz.sexo || prev.sex,
          nationality: mrz.pais_nacionalidad || prev.nationality,
          dob: normalizeDate(mrz.fecha_nacimiento) || prev.dob,
        }));
      } else {
        setScanStatus('error');
        setScanError(mensajeErrorScan(data));
        setScanFailures((n) => n + 1);
      }
    } catch {
      setScanStatus('error');
      setScanError('Error de red. Inténtalo de nuevo.');
      setScanFailures((n) => n + 1);
    }
  };

  // ---- Paso 2b: verificación manual -----------------------------------------

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualSubmitting(true);
    setScanError('');
    try {
      const token = await getToken();
      const [nombre, ...apellidos] = form.name.trim().split(' ');
      const res = await fetch('/api/policia/scan-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          hostal_id: hostalId,
          nombre: nombre || form.name,
          apellidos: apellidos.join(' ') || '-',
          tipo_documento: form.docType,
          num_documento: form.document,
          num_soporte_doc: form.docSupport || undefined,
          fecha_nacimiento: form.dob,
          fecha_caducidad_doc: form.docExpiry || undefined,
          pais_nacionalidad: form.nationality,
          sexo: form.sex || undefined,
          fecha_salida: fechaSalida,
          dry_run: SES_DRY_RUN,
          ...camposContacto(),
        }),
      });
      const data = await res.json();
      if (data.exito) {
        setHuespedId(data.huesped_id || null);
        setScanData({ nombre: form.name, apellidos: '' });
        setScanStatus('ok');
        setManualMode(false);
        showToast('Registro manual completado — revisar contra documento físico', 'info');
      } else {
        setScanError(data?.etapas?.validacion?.error || data?.error || 'Error en el registro manual.');
      }
    } catch {
      setScanError('Error de red. Inténtalo de nuevo.');
    } finally {
      setManualSubmitting(false);
    }
  };

  // ---- Completar ---------------------------------------------------------------

  const handleComplete = async () => {
    const { error } = await checkInReservation(reservation.id, form);
    if (error) {
      showToast(error, 'error');
      return;
    }
    // QR de sesión de peregrino: el token lo firma la RPC (migración 007),
    // nunca el navegador. Si falla, el check-in ya está completado igualmente.
    try {
      const { data } = await supabase.rpc('generate_peregrino_token', {
        p_reservation_id: reservation.id,
      });
      if (data?.exito && data?.token) {
        setPeregrinoUrl(
          `${PWA_BASE_URL}/peregrino?r=${reservation.id}&t=${data.token}`,
        );
      }
    } catch {
      // sin QR: no bloquea el check-in
    }
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
            {peregrinoUrl && (
              <div className="mt-5 flex flex-col items-center gap-2" data-testid="checkin-qr">
                <p className="text-sm text-slate-600">
                  El huésped puede escanear este QR para abrir su sesión en la PWA
                </p>
                <QRCodeSVG value={peregrinoUrl} size={180} />
                <p className="text-xs text-slate-400 break-all text-center" data-testid="checkin-peregrino-url">
                  {peregrinoUrl}
                </p>
              </div>
            )}
            <Button className="mt-5" fullWidth onClick={() => navigate('/dashboard')} data-testid="checkin-success-dashboard-button">
              Volver al dashboard
            </Button>
          </Card>
        </div>
      </ManagerLayout>
    );
  }

  const labelBtn = 'cursor-pointer inline-flex items-center justify-center rounded-lg py-3 px-4 text-sm font-semibold bg-white text-slate-900 border border-gray-200 hover:bg-gray-50';

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
              <Input label="Nacionalidad (código país)" required value={form.nationality} onChange={handleChange('nationality')} error={errors.nationality} data-testid="checkin-nationality-input" placeholder="ESP" />
              <Input label="Fecha de nacimiento" required type="date" value={form.dob} onChange={handleChange('dob')} error={errors.dob} data-testid="checkin-dob-input" />
              <Input label="Teléfono móvil" required type="tel" value={form.phone} onChange={handleChange('phone')} error={errors.phone} data-testid="checkin-phone-input" />
              <Input label="Email" type="email" value={form.email} onChange={handleChange('email')} data-testid="checkin-email-input" />
              <Input label="Dirección habitual" required value={form.address} onChange={handleChange('address')} error={errors.address} placeholder="Calle, número, piso" data-testid="checkin-address-input" />
              <Input label="Localidad de residencia" required value={form.city} onChange={handleChange('city')} error={errors.city} data-testid="checkin-city-input" />
              <Input label="País de residencia" required value={form.residenceCountry} onChange={handleChange('residenceCountry')} error={errors.residenceCountry} placeholder="ESP" data-testid="checkin-residence-country-input" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nº de viajeros" type="number" min="1" value={form.numTravelers} onChange={handleChange('numTravelers')} data-testid="checkin-num-travelers-input" />
                <Input label="Parentesco (menores)" value={form.kinship} onChange={handleChange('kinship')} placeholder="H=Hijo…" data-testid="checkin-kinship-input" />
              </div>
              <Button type="submit" fullWidth data-testid="checkin-step1-continue-button">
                Continuar
              </Button>
            </form>
          </Card>
        )}

        {step === 2 && !manualMode && (
          <Card className="mt-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">2. Escanear documento</h2>
            <div className="border-2 border-dashed border-gray-200 rounded-lg py-8 flex flex-col items-center gap-3">
              {scanStatus === 'idle' && (
                <>
                  <p className="text-slate-400 text-sm text-center px-4">
                    Fotografía el <strong>REVERSO</strong> del documento (donde está la zona de lectura mecánica)
                  </p>
                  <label htmlFor="checkin-scan-input" className={labelBtn}>
                    Escanear DNI / Pasaporte
                  </label>
                </>
              )}
              {scanStatus === 'scanning' && (
                <p className="text-slate-500 text-sm" data-testid="checkin-scan-progress">Procesando documento...</p>
              )}
              {scanStatus === 'ok' && (
                <p className="text-green-600 font-medium" data-testid="checkin-scan-success">
                  Documento verificado — {scanData?.nombre} {scanData?.apellidos}
                </p>
              )}
              {scanStatus === 'error' && (
                <>
                  <p className="text-red-600 text-sm text-center px-4" data-testid="checkin-scan-error">{scanError}</p>
                  <label htmlFor="checkin-scan-input" className={labelBtn}>
                    Reintentar
                  </label>
                </>
              )}
            </div>
            <input id="checkin-scan-input" type="file" accept="image/*" capture="environment"
              className="hidden" onChange={handleScan} data-testid="checkin-scan-input" />
            <p className="text-xs text-slate-400 mt-3">Enviado a SES Hospedajes (Ministerio del Interior)</p>
            {scanFailures >= 2 && scanStatus !== 'ok' && (
              <Button variant="secondary" fullWidth className="mt-3" onClick={() => setManualMode(true)} data-testid="checkin-manual-mode-button">
                Introducir datos manualmente
              </Button>
            )}
            <Button fullWidth className="mt-3" disabled={scanStatus !== 'ok'} onClick={() => setStep(3)} data-testid="checkin-step2-continue-button">
              Continuar
            </Button>
          </Card>
        )}

        {step === 2 && manualMode && (
          <Card className="mt-5">
            <h2 className="text-base font-semibold text-slate-900 mb-1">2. Verificación manual</h2>
            <p className="text-xs text-slate-500 mb-4">
              Introduce los datos leyéndolos del documento físico. El parte se envía igualmente
              y queda marcado para revisión.
            </p>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4" data-testid="checkin-manual-form">
              <Input label="Nombre completo" required value={form.name} onChange={handleChange('name')} data-testid="checkin-manual-name-input" />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Tipo de documento</label>
                  <select className="rounded-lg border border-gray-200 py-3 px-3 text-sm" value={form.docType} onChange={handleChange('docType')} data-testid="checkin-manual-doctype-select">
                    {TIPOS_DOC.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <Input label="Número de documento" required value={form.document} onChange={handleChange('document')} data-testid="checkin-manual-document-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nº soporte (DNI/NIE)" value={form.docSupport} onChange={handleChange('docSupport')} data-testid="checkin-manual-support-input" />
                <Input label="Caducidad doc." type="date" value={form.docExpiry} onChange={handleChange('docExpiry')} data-testid="checkin-manual-expiry-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Fecha de nacimiento" required type="date" value={form.dob} onChange={handleChange('dob')} data-testid="checkin-manual-dob-input" />
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-slate-700">Sexo</label>
                  <select className="rounded-lg border border-gray-200 py-3 px-3 text-sm" value={form.sex} onChange={handleChange('sex')} data-testid="checkin-manual-sex-select">
                    <option value="">—</option>
                    <option value="M">Hombre</option>
                    <option value="F">Mujer</option>
                  </select>
                </div>
              </div>
              {scanError && (
                <p className="text-red-600 text-sm" data-testid="checkin-manual-error">{scanError}</p>
              )}
              <Button type="submit" fullWidth loading={manualSubmitting} data-testid="checkin-manual-submit-button">
                Registrar manualmente
              </Button>
              <Button variant="ghost" fullWidth onClick={() => { setManualMode(false); setScanError(''); }} data-testid="checkin-manual-back-button">
                Volver al escaneo
              </Button>
            </form>
          </Card>
        )}

        {step === 3 && (
          <Card className="mt-5">
            <h2 className="text-base font-semibold text-slate-900 mb-2">3. Firma digital</h2>
            <p className="text-sm text-slate-600 mb-3">Envía este enlace al huésped para que firme desde su móvil</p>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center gap-3 bg-white">
              {signed ? (
                <p className="text-green-600 font-medium" data-testid="checkin-signature-success">Firma recibida</p>
              ) : firmaError ? (
                <p className="text-red-600 text-sm" data-testid="checkin-signature-error">{firmaError}</p>
              ) : firmaUrl ? (
                <>
                  <p className="text-xs text-slate-500 break-all text-center" data-testid="checkin-signature-url">{firmaUrl}</p>
                  <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(firmaUrl)} data-testid="checkin-signature-copy-button">
                    Copiar enlace
                  </Button>
                  <p className="text-xs text-slate-400" data-testid="checkin-signature-waiting">Esperando firma del huésped...</p>
                </>
              ) : (
                <p className="text-slate-500 text-sm" data-testid="checkin-signature-loading">Generando enlace de firma...</p>
              )}
            </div>
            <Button fullWidth className="mt-3" disabled={!signed} onClick={handleComplete} data-testid="checkin-complete-button">
              Completar check-in
            </Button>
          </Card>
        )}
      </div>
    </ManagerLayout>
  );
}

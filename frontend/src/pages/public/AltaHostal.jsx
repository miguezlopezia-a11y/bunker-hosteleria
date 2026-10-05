import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { hostalesService } from '../../services/hostalesService';
import { employeesService } from '../../services/employeesService';
import { PALETA_OPCIONES } from '../../utils/paleta';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Toggle from '../../components/Toggle';
import PaginaHostalView from '../../components/public/PaginaHostalView';

const ROL_OPCIONES = [
  { value: 'Recepción', label: 'Recepción' },
  { value: 'Empleado', label: 'Empleado' },
];

// Quiz de alta autoservicio (Fase D, tarea onboarding-autoservicio).
// Pasos: 1) cuenta (Supabase Auth estándar) → 2) datos del hostal (RPC
// crear_mi_hostal, migración 032) → 3) invitar empleados (opcional, Fase C)
// → 4) página web pública (opcional, reutiliza subida de fotos de
// Configuracion + vista previa en vivo con PaginaHostalView). Al terminar se
// guarda todo de una vez: hostal (update), invitaciones (create-employee).
export default function AltaHostal() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Paso 1 — cuenta
  const [cuenta, setCuenta] = useState({ email: '', password: '', confirm: '' });
  const [needsConfirm, setNeedsConfirm] = useState(false);

  // Paso 2 — hostal
  const [hostal, setHostal] = useState({ nombre: '', direccion: '', telefono: '', email: '', precio: '' });
  const [hostalId, setHostalId] = useState(null);
  const [slug, setSlug] = useState('');

  // Paso 3 — empleados
  const [invites, setInvites] = useState([]);

  // Paso 4 — página web
  const [web, setWeb] = useState({ activa: false, descripcion: '', color: 'ocre', fotos: [] });
  const [uploading, setUploading] = useState(false);

  const set = (setter) => (field) => (e) =>
    setter((prev) => ({ ...prev, [field]: e.target.value }));

  // --- Paso 1 ---
  const handleCuenta = async (e) => {
    e.preventDefault();
    setError(null);
    if (cuenta.password.length < 6) return setError('La contraseña necesita al menos 6 caracteres');
    if (cuenta.password !== cuenta.confirm) return setError('Las contraseñas no coinciden');
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cuenta.email.trim(),
      password: cuenta.password,
    });
    setSubmitting(false);
    if (signUpError) return setError(signUpError.message);
    if (data.session) return setStep(2);
    // Confirmación de email activa: el usuario confirma y vuelve a entrar.
    setNeedsConfirm(true);
  };

  const handleContinuarTrasConfirm = async () => {
    setError(null);
    setSubmitting(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: cuenta.email.trim(),
      password: cuenta.password,
    });
    setSubmitting(false);
    if (loginError) return setError('Aún no confirmas tu email (revisa tu bandeja) o las credenciales no valen');
    if (data.session) setStep(2);
  };

  // --- Paso 2 ---
  const handleHostal = async (e) => {
    e.preventDefault();
    setError(null);
    if (!hostal.nombre.trim()) return setError('El nombre del establecimiento es obligatorio');
    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc('crear_mi_hostal', {
      p_nombre: hostal.nombre.trim(),
      p_direccion: hostal.direccion.trim() || null,
      p_telefono: hostal.telefono.trim() || null,
      p_email: hostal.email.trim() || null,
      p_precio_base: hostal.precio ? Number(hostal.precio) : null,
    });
    setSubmitting(false);
    if (rpcError) return setError(rpcError.message);
    setHostalId(data);
    setSlug(hostal.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    setStep(3);
  };

  // --- Paso 3 ---
  const addInvite = () =>
    setInvites((prev) => [...prev, { email: '', nombre: '', rol: 'Empleado' }]);
  const setInvite = (i, field, value) =>
    setInvites((prev) => prev.map((inv, j) => (j === i ? { ...inv, [field]: value } : inv)));
  const removeInvite = (i) => setInvites((prev) => prev.filter((_, j) => j !== i));

  // --- Paso 4 ---
  const handleUploadFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !hostalId) return;
    setUploading(true);
    const { publicUrl, error: upError } = await hostalesService.uploadFoto(hostalId, file);
    setUploading(false);
    if (upError) return setError('No se pudo subir la foto');
    setWeb((prev) => ({ ...prev, fotos: [...prev.fotos, publicUrl] }));
  };

  const removeFoto = (url) => {
    setWeb((prev) => ({ ...prev, fotos: prev.fotos.filter((f) => f !== url) }));
    hostalesService.deleteFoto(url);
  };

  // --- Finalizar ---
  const handleFinish = async () => {
    setError(null);
    setSubmitting(true);
    if (web.activa || web.descripcion || web.fotos.length > 0) {
      const { error: upError } = await hostalesService.update(hostalId, {
        descripcion_larga: web.descripcion || null,
        color_acento: web.color,
        fotos: web.fotos,
        pagina_web_activa: web.activa,
      });
      if (upError) {
        setSubmitting(false);
        return setError('No se pudieron guardar los datos de la página web');
      }
    }
    for (const inv of invites) {
      if (!inv.email.trim()) continue;
      await employeesService.create({
        email: inv.email.trim(),
        nombre: inv.nombre.trim() || inv.email.trim(),
        rol: inv.rol,
      });
    }
    setSubmitting(false);
    navigate('/dashboard');
  };

  const paginaPreview = {
    name: hostal.nombre || 'Tu albergue',
    address: hostal.direccion || '',
    base_price: hostal.precio ? Number(hostal.precio) : null,
    descripcion_larga: web.descripcion,
    color_acento: web.color,
    fotos: web.fotos,
    slug,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" data-testid="alta-hostal-page">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" data-testid="alta-title">Da de alta tu albergue</h1>
          <p className="text-sm text-slate-500 mt-1">Paso {step} de 4</p>
        </div>

        {error && (
          <p className="text-sm text-red-600" data-testid="alta-error" role="alert">{error}</p>
        )}

        {step === 1 && !needsConfirm && (
          <Card>
            <form onSubmit={handleCuenta} className="flex flex-col gap-4" data-testid="alta-cuenta-form">
              <Input label="Email" type="email" required value={cuenta.email} onChange={set(setCuenta)('email')} data-testid="alta-cuenta-email" />
              <Input label="Contraseña" type="password" required value={cuenta.password} onChange={set(setCuenta)('password')} data-testid="alta-cuenta-password" />
              <Input label="Repite la contraseña" type="password" required value={cuenta.confirm} onChange={set(setCuenta)('confirm')} data-testid="alta-cuenta-confirm" />
              <Button type="submit" fullWidth loading={submitting} data-testid="alta-cuenta-submit">Crear cuenta</Button>
            </form>
          </Card>
        )}

        {step === 1 && needsConfirm && (
          <Card data-testid="alta-confirm-email">
            <p className="text-slate-900 font-medium">Revisa tu email</p>
            <p className="text-sm text-slate-600 mt-2">
              Te hemos enviado un enlace de confirmación a {cuenta.email}. Confírmalo y pulsa continuar.
            </p>
            {error && null}
            <Button fullWidth loading={submitting} onClick={handleContinuarTrasConfirm} data-testid="alta-continuar-tras-confirm">
              Ya confirmé, continuar
            </Button>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <form onSubmit={handleHostal} className="flex flex-col gap-4" data-testid="alta-hostal-form">
              <Input label="Nombre del establecimiento" required value={hostal.nombre} onChange={set(setHostal)('nombre')} data-testid="alta-hostal-nombre" />
              <Input label="Dirección" value={hostal.direccion} onChange={set(setHostal)('direccion')} data-testid="alta-hostal-direccion" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Teléfono" type="tel" value={hostal.telefono} onChange={set(setHostal)('telefono')} data-testid="alta-hostal-telefono" />
                <Input label="Email del albergue" type="email" value={hostal.email} onChange={set(setHostal)('email')} data-testid="alta-hostal-email" />
              </div>
              <Input label="Precio base por noche (€)" type="number" value={hostal.precio} onChange={set(setHostal)('precio')} data-testid="alta-hostal-precio" />
              <Button type="submit" fullWidth loading={submitting} data-testid="alta-hostal-submit">Crear mi albergue</Button>
            </form>
          </Card>
        )}

        {step === 3 && (
          <Card data-testid="alta-empleados">
            <h2 className="text-base font-semibold text-slate-900 mb-2">Invita a tu equipo (opcional)</h2>
            <p className="text-sm text-slate-600 mb-4">Recibirán un email para crear su contraseña. Puedes hacerlo luego desde Configuración.</p>
            <div className="flex flex-col gap-3">
              {invites.map((inv, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end" data-testid={`alta-invite-row-${i}`}>
                  <Input label="Nombre" value={inv.nombre} onChange={(e) => setInvite(i, 'nombre', e.target.value)} data-testid={`alta-invite-nombre-${i}`} />
                  <Input label="Email" type="email" value={inv.email} onChange={(e) => setInvite(i, 'email', e.target.value)} data-testid={`alta-invite-email-${i}`} />
                  <Select label="Rol" value={inv.rol} onChange={(e) => setInvite(i, 'rol', e.target.value)} options={ROL_OPCIONES} data-testid={`alta-invite-rol-${i}`} />
                  <Button variant="danger" onClick={() => removeInvite(i)} data-testid={`alta-invite-remove-${i}`}>Quitar</Button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" onClick={addInvite} data-testid="alta-invite-add">+ Añadir</Button>
              <Button variant="secondary" onClick={() => setStep(4)} data-testid="alta-empleados-skip">Continuar sin empleados</Button>
            </div>
            {invites.length > 0 && (
              <Button className="mt-3" onClick={() => setStep(4)} data-testid="alta-empleados-next">Continuar</Button>
            )}
          </Card>
        )}

        {step === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="alta-web-form">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">Tu página web (opcional)</h2>
                <Toggle checked={web.activa} onChange={(v) => setWeb((prev) => ({ ...prev, activa: v }))} testId="alta-web-activa" label="Página activa" />
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="alta-web-descripcion" className="block text-sm font-medium text-slate-900 mb-1.5">Descripción</label>
                  <textarea
                    id="alta-web-descripcion"
                    rows={4}
                    value={web.descripcion}
                    onChange={(e) => setWeb((prev) => ({ ...prev, descripcion: e.target.value }))}
                    data-testid="alta-web-descripcion"
                    className="w-full border border-gray-200 rounded-md px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Cómo es tu albergue, a qué distancia está del Camino, qué ofrece..."
                  />
                </div>
                <Select label="Color de acento" value={web.color} onChange={(e) => setWeb((prev) => ({ ...prev, color: e.target.value }))} options={PALETA_OPCIONES} data-testid="alta-web-color" />
                <div>
                  <p className="text-sm font-medium text-slate-900 mb-2">Fotos</p>
                  {web.fotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {web.fotos.map((url, i) => (
                        <div key={url} className="relative" data-testid={`alta-web-foto-${i}`}>
                          <img src={url} alt={`Foto ${i + 1}`} className="w-full h-20 object-cover rounded-md" />
                          <button type="button" onClick={() => removeFoto(url)} data-testid={`alta-web-foto-remove-${i}`} aria-label={`Eliminar foto ${i + 1}`} className="absolute top-1 right-1 bg-white/90 text-red-600 rounded-full w-6 h-6 text-xs font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleUploadFoto} data-testid="alta-web-foto-upload" disabled={uploading} className="text-sm text-slate-600" />
                </div>
                <Button fullWidth loading={submitting} onClick={handleFinish} data-testid="alta-finalizar">Finalizar alta</Button>
              </div>
            </Card>
            <div data-testid="alta-web-preview">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Vista previa en vivo</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <PaginaHostalView pagina={paginaPreview} preview />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

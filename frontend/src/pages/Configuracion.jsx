import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ManagerLayout from '../components/ManagerLayout';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';

const ROLE_OPTIONS = [
  { value: 'Director', label: 'Director' },
  { value: 'Recepción', label: 'Recepción' },
  { value: 'Empleado', label: 'Empleado' },
];

const INTEGRATION_LABELS = {
  bookingcom: 'Booking.com',
  airbnb: 'Airbnb',
  stripe: 'Stripe',
  sesHospedajes: 'SES Hospedajes',
};

function AddEmployeeModal({ isOpen, onClose }) {
  const { addEmployee } = useApp();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', role: 'Empleado', pin: '' });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.name) newErrors.name = 'Campo obligatorio';
    if (!form.pin || form.pin.length !== 4) newErrors.pin = 'Campo obligatorio';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    addEmployee(form);
    showToast('Empleado añadido');
    setForm({ name: '', role: 'Empleado', pin: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir empleado" testId="add-employee-modal" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="add-employee-form">
        <Input
          label="Nombre"
          required
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          error={errors.name}
          data-testid="add-employee-name-input"
        />
        <Select
          label="Rol"
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          options={ROLE_OPTIONS}
          data-testid="add-employee-role-select"
        />
        <Input
          label="PIN de 4 dígitos"
          required
          type="tel"
          maxLength={4}
          value={form.pin}
          onChange={(e) => setForm((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
          error={errors.pin}
          data-testid="add-employee-pin-input"
        />
        <Button type="submit" fullWidth data-testid="add-employee-submit-button">
          Añadir
        </Button>
      </form>
    </Modal>
  );
}

export default function Configuracion() {
  const { session, employees, integrations, disconnectIntegration, updateHostelInfo, logout } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isDirector = session?.role === 'Director';

  const [hostelForm, setHostelForm] = useState({
    name: session?.hostel?.name || '',
    address: session?.hostel?.address || '',
    phone: session?.hostel?.phone || '',
    email: session?.hostel?.email || '',
    capacity: session?.hostel?.capacity || '',
  });
  const [radius, setRadius] = useState(150);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);

  const handleSaveHostel = (e) => {
    e.preventDefault();
    updateHostelInfo(hostelForm);
    showToast('Datos del albergue actualizados');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <ManagerLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col gap-6" data-testid="configuracion-page">
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>

        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Datos del albergue</h2>
          <form onSubmit={handleSaveHostel} className="flex flex-col gap-4" data-testid="hostel-settings-form">
            <Input
              label="Nombre"
              value={hostelForm.name}
              onChange={(e) => setHostelForm((prev) => ({ ...prev, name: e.target.value }))}
              data-testid="hostel-name-input"
            />
            <Input
              label="Dirección"
              value={hostelForm.address}
              onChange={(e) => setHostelForm((prev) => ({ ...prev, address: e.target.value }))}
              data-testid="hostel-address-input"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Teléfono"
                type="tel"
                value={hostelForm.phone}
                onChange={(e) => setHostelForm((prev) => ({ ...prev, phone: e.target.value }))}
                data-testid="hostel-phone-input"
              />
              <Input
                label="Email"
                type="email"
                value={hostelForm.email}
                onChange={(e) => setHostelForm((prev) => ({ ...prev, email: e.target.value }))}
                data-testid="hostel-email-input"
              />
            </div>
            <Input
              label="Capacidad"
              type="number"
              value={hostelForm.capacity}
              onChange={(e) => setHostelForm((prev) => ({ ...prev, capacity: e.target.value }))}
              data-testid="hostel-capacity-input"
            />
            <Button type="submit" data-testid="hostel-settings-save-button">
              Guardar cambios
            </Button>
          </form>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Gestión de empleados</h2>
            {isDirector && (
              <Button variant="secondary" onClick={() => setAddEmployeeOpen(true)} data-testid="add-employee-button">
                + Añadir empleado
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {employees.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-gray-100 last:border-0 py-2" data-testid={`employee-settings-row-${e.id}`}>
                <p className="text-sm text-slate-900">{e.name}</p>
                <Badge variant="default">{e.role}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-4">Integraciones</h2>
          <div className="flex flex-col gap-2">
            {Object.keys(INTEGRATION_LABELS).map((key) => (
              <div key={key} className="flex items-center justify-between border-b border-gray-100 last:border-0 py-2" data-testid={`integration-row-${key}`}>
                <p className="text-sm text-slate-900">{INTEGRATION_LABELS[key]}</p>
                <div className="flex items-center gap-3">
                  <Badge variant={integrations[key] ? 'pagado' : 'default'}>
                    {integrations[key] ? 'Conectado' : 'Desconectado'}
                  </Badge>
                  {isDirector && integrations[key] && (
                    <button
                      type="button"
                      onClick={() => {
                        disconnectIntegration(key);
                        showToast(`${INTEGRATION_LABELS[key]} desconectado`);
                      }}
                      data-testid={`disconnect-integration-${key}`}
                      className="text-red-600 text-sm font-medium hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-1"
                    >
                      Desconectar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-slate-900 mb-3">Zona geográfica</h2>
          <label htmlFor="fichaje-radius" className="block text-sm text-slate-600 mb-2">
            Radio de fichaje: {radius} metros
          </label>
          <input
            id="fichaje-radius"
            type="range"
            min="50"
            max="500"
            step="10"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            data-testid="fichaje-radius-slider"
            className="w-full"
          />
        </Card>

        <Button variant="danger" onClick={handleLogout} data-testid="configuracion-logout-button">
          Cerrar sesión
        </Button>

        <AddEmployeeModal isOpen={addEmployeeOpen} onClose={() => setAddEmployeeOpen(false)} />
      </div>
    </ManagerLayout>
  );
}

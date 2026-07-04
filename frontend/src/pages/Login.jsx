import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hostels } from '../data/hostels';
import { employees } from '../data/employees';
import { useApp } from '../context/AppContext';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import Card from '../components/Card';

const ROLE_OPTIONS = [
  { value: 'Director', label: 'Director' },
  { value: 'Recepción', label: 'Recepción' },
  { value: 'Empleado', label: 'Empleado' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [hostelSlug, setHostelSlug] = useState(hostels[0].slug);
  const [pin, setPin] = useState('');
  const [role, setRole] = useState('Director');
  const [employeeId, setEmployeeId] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const empleadoOptions = employees
    .filter((e) => e.role === 'Empleado')
    .map((e) => ({ value: String(e.id), label: e.name }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!hostelSlug) newErrors.hostel = 'Campo obligatorio';
    if (!pin || pin.length !== 4) newErrors.pin = 'Campo obligatorio';
    if (!role) newErrors.role = 'Campo obligatorio';
    if (role === 'Empleado' && !employeeId) newErrors.employeeId = 'Campo obligatorio';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    const hostel = hostels.find((h) => h.slug === hostelSlug);
    let employeeName = '';
    if (role === 'Empleado') {
      employeeName = employees.find((e) => String(e.id) === employeeId)?.name || '';
    } else if (role === 'Director') {
      employeeName = employees.find((e) => e.role === 'Director')?.name || '';
    } else {
      employeeName = employees.find((e) => e.role === 'Recepción')?.name || '';
    }

    login(hostel, role, employeeName);
    setTimeout(() => {
      setLoading(false);
      navigate(role === 'Empleado' ? '/empleado' : '/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-6" data-testid="login-title">
          BunkerHostal
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="login-form">
          <Select
            label="Albergue"
            required
            value={hostelSlug}
            onChange={(e) => setHostelSlug(e.target.value)}
            options={hostels.map((h) => ({ value: h.slug, label: h.name }))}
            error={errors.hostel}
            data-testid="login-hostel-select"
          />

          <Input
            label="PIN"
            required
            type="tel"
            maxLength={4}
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="****"
            error={errors.pin}
            data-testid="login-pin-input"
          />

          <Select
            label="Rol"
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={ROLE_OPTIONS}
            error={errors.role}
            data-testid="login-role-select"
          />

          {role === 'Empleado' && (
            <Select
              label="Empleado"
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              options={empleadoOptions}
              placeholder="Selecciona un empleado"
              error={errors.employeeId}
              data-testid="login-employee-select"
            />
          )}

          <Button type="submit" fullWidth loading={loading} data-testid="login-submit-button" className="mt-2">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, loading: appLoading } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Campo obligatorio';
    if (!password) newErrors.password = 'Campo obligatorio';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    setFormError('');
    const { error } = await signIn({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      setFormError('Credenciales incorrectas. Inténtalo de nuevo.');
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  if (appLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-6" data-testid="login-title">
          BunkerHostal
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="login-form">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            error={errors.email}
            data-testid="login-email-input"
          />

          <Input
            label="Contraseña"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={errors.password}
            data-testid="login-password-input"
          />

          {formError && (
            <p className="text-sm text-red-600" role="alert" data-testid="login-error">
              {formError}
            </p>
          )}

          <Button type="submit" fullWidth loading={loading} data-testid="login-submit-button" className="mt-2">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}

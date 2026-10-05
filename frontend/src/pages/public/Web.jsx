import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReservaDirecta from '../../components/public/ReservaDirecta';
import { formatEuro } from '../../utils/format';

export default function Web() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('hostel');

  const [hostel, setHostel] = useState(null);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [success, setSuccess] = useState(false);

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

        <ReservaDirecta slug={slug} hostel={hostel} beds={beds} onSuccess={() => setSuccess(true)} />

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

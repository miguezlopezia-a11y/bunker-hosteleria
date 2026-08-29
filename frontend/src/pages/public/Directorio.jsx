import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { formatEuro } from '../../utils/format';
import { publicService } from '../../services/publicService';

const DEFAULT_TITLE = 'BunkerHostal';
const DEFAULT_DESCRIPTION = 'BunkerHostal — Gestión y reservas directas para albergues del Camino de Santiago';

export default function Directorio() {
  const [search, setSearch] = useState('');
  const [hostales, setHostales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Albergues del Camino de Santiago — Red BunkerHostal';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Directorio de albergues del Camino de Santiago verificados por BunkerHostal. Reserva directamente, sin comisiones.'
      );
    }
    return () => {
      document.title = DEFAULT_TITLE;
      if (meta) meta.setAttribute('content', DEFAULT_DESCRIPTION);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    publicService.listPublicHostales().then(({ data, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) {
        setError('No se pudo cargar el directorio de albergues.');
      } else {
        setHostales(data || []);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      hostales.filter((h) => {
        const term = search.toLowerCase();
        return (
          !term ||
          h.name.toLowerCase().includes(term) ||
          (h.address || '').toLowerCase().includes(term)
        );
      }),
    [hostales, search]
  );

  return (
    <div className="min-h-screen bg-gray-50" data-testid="directorio-page">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900 text-center" data-testid="directorio-title">
          Albergues del Camino de Santiago — Red BunkerHostal
        </h1>
        <p className="text-center text-slate-600 mt-2 mb-8">
          Reserva directamente con los albergues. Sin comisiones.
        </p>

        <Card className="mb-6">
          <Input
            label="Buscar por etapa o ciudad"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pamplona, Logroño..."
            data-testid="directorio-search-input"
          />
        </Card>

        {loading ? (
          <p className="text-center text-slate-400 py-10" data-testid="directorio-loading">
            Cargando albergues...
          </p>
        ) : error ? (
          <p className="text-center text-red-500 py-10" data-testid="directorio-error">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-10" data-testid="directorio-empty-state">
            No se encontraron albergues para esta búsqueda.
          </p>
        ) : (
          <div className="flex flex-col gap-3 mb-8" data-testid="directorio-hostel-list">
            {filtered.map((h) => (
              <Card key={h.slug} className="flex items-center justify-between gap-4 flex-wrap" data-testid={`directorio-hostel-card-${h.slug}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900">{h.name}</p>
                    <Badge variant="pagado">Verificado BunkerHostal</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{h.address}</p>
                  <p className="text-sm text-slate-600 mt-1">Desde {formatEuro(h.base_price)}/noche</p>
                </div>
                <Link to={`/web?hostel=${h.slug}`} data-testid={`directorio-book-button-${h.slug}`}>
                  <Button>Reservar directamente</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}

        <div
          className="w-full h-40 bg-gray-200 rounded-xl flex items-center justify-center text-slate-400 text-sm mb-8"
          data-testid="directorio-map-placeholder"
        >
          Mapa de albergues — próximamente
        </div>

        <p className="text-center text-sm text-slate-400">
          ¿Tu albergue no está aquí?{' '}
          <a
            href="https://bunkerhostal.com/contacto"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="directorio-join-link"
            className="text-blue-600 font-medium hover:text-blue-700"
          >
            Únete a la red → Contacto
          </a>
        </p>
      </div>
    </div>
  );
}

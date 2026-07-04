import React, { useEffect, useMemo, useState } from 'react';
import { hostels } from '../../data/hostels';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Select from '../../components/Select';
import { formatEuro } from '../../utils/format';

const COMUNIDAD_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'Navarra', label: 'Navarra' },
  { value: 'La Rioja', label: 'La Rioja' },
  { value: 'Castilla y León', label: 'Castilla y León' },
  { value: 'Galicia', label: 'Galicia' },
];

const CAPACIDAD_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'hasta20', label: 'Hasta 20 plazas' },
  { value: 'hasta50', label: 'Hasta 50 plazas' },
  { value: 'mas50', label: 'Más de 50 plazas' },
];

function matchesCapacidad(capacity, filter) {
  if (!filter) return true;
  if (filter === 'hasta20') return capacity <= 20;
  if (filter === 'hasta50') return capacity <= 50;
  if (filter === 'mas50') return capacity > 50;
  return true;
}

export default function Directorio() {
  const [search, setSearch] = useState('');
  const [comunidad, setComunidad] = useState('');
  const [capacidad, setCapacidad] = useState('');

  useEffect(() => {
    document.title = 'Albergues del Camino de Santiago — Red BunkerHostal';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        'Directorio de albergues del Camino de Santiago verificados por BunkerHostal. Reserva directamente, sin comisiones.'
      );
    }
  }, []);

  const filtered = useMemo(
    () =>
      hostels.filter((h) => {
        const term = search.toLowerCase();
        const matchesSearch = !term || h.name.toLowerCase().includes(term) || h.address.toLowerCase().includes(term);
        const matchesComunidad = !comunidad || h.comunidad === comunidad;
        return matchesSearch && matchesComunidad && matchesCapacidad(h.capacity, capacidad);
      }),
    [search, comunidad, capacidad]
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Buscar por etapa o ciudad"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pamplona, Logroño..."
              data-testid="directorio-search-input"
            />
            <Select
              label="Comunidad"
              value={comunidad}
              onChange={(e) => setComunidad(e.target.value)}
              options={COMUNIDAD_OPTIONS}
              data-testid="directorio-comunidad-select"
            />
            <Select
              label="Capacidad"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              options={CAPACIDAD_OPTIONS}
              data-testid="directorio-capacidad-select"
            />
          </div>
        </Card>

        {filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-10" data-testid="directorio-empty-state">
            No se encontraron albergues para esta búsqueda.
          </p>
        ) : (
          <div className="flex flex-col gap-3 mb-8" data-testid="directorio-hostel-list">
            {filtered.map((h) => (
              <Card key={h.id} className="flex items-center justify-between gap-4 flex-wrap" data-testid={`directorio-hostel-card-${h.slug}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900">{h.name}</p>
                    <Badge variant="pagado">Verificado BunkerHostal</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {h.address} · {h.capacity} plazas · {h.rating.toFixed(1)}★
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Desde {formatEuro(h.basePrice)}/noche</p>
                </div>
                <a href={`/web?hostel=${h.slug}`} data-testid={`directorio-book-button-${h.slug}`}>
                  <Button>Reservar directamente</Button>
                </a>
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

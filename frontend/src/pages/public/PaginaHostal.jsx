import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import ReservaDirecta from '../../components/public/ReservaDirecta';
import { formatEuro } from '../../utils/format';
import { colorAcento } from '../../utils/paleta';

const DEFAULT_TITLE = 'BunkerHostal';

// Plantilla 'piloto_a': hero (foto + nombre + color de acento), descripción,
// galería y reserva directa (componente compartido con Web.jsx). Nuevas
// plantillas = componente de presentación nuevo + valor nuevo en el check
// constraint de la migración 023.
export default function PaginaHostal() {
  const { slug } = useParams();

  const [pagina, setPagina] = useState(null);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: paginaData, error: paginaError }, { data: bedsData }] = await Promise.all([
          publicService.getPaginaHostal(slug),
          publicService.getBedsByHostalSlug(slug),
        ]);

        // Anti-enumeración: slug inexistente y página desactivada llegan
        // ambos como 0 filas -> mismo 404, nunca una página vacía.
        if (paginaError || !paginaData || paginaData.length === 0) {
          setNotFound(true);
        } else {
          setPagina(paginaData[0]);
          setBeds(bedsData || []);
        }
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  useEffect(() => {
    if (pagina) document.title = `${pagina.name} — Reserva directa`;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [pagina]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (notFound || !pagina) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" data-testid="pagina-hostal-404">
        <Card className="max-w-md text-center">
          <p className="text-lg font-semibold text-slate-900">Página no encontrada</p>
          <p className="text-sm text-slate-500 mt-2">
            Este albergue no tiene página pública activa o el enlace no es correcto.
          </p>
        </Card>
      </div>
    );
  }

  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="pagina-hostal-page">
      <div
        className="w-full h-56 sm:h-72 bg-gray-300 bg-cover bg-center"
        style={hero ? { backgroundImage: `url(${hero})` } : { backgroundColor: acento }}
        data-testid="pagina-hostal-hero"
      />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="border-l-4 pl-4 mb-6" style={{ borderColor: acento }}>
          <h1 className="text-3xl font-bold text-slate-900" data-testid="pagina-hostal-title">
            {pagina.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {pagina.address} · Desde {formatEuro(pagina.base_price)}/noche
          </p>
        </div>

        {pagina.descripcion_larga && (
          <p className="text-slate-700 whitespace-pre-line mb-8" data-testid="pagina-hostal-descripcion">
            {pagina.descripcion_larga}
          </p>
        )}

        {galeria.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8" data-testid="pagina-hostal-galeria">
            {galeria.map((url) => (
              <img
                key={url}
                src={url}
                alt={`${pagina.name}`}
                className="w-full h-32 object-cover rounded-lg"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {success ? (
          <Card className="text-center" data-testid="public-booking-success-screen">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" className="mx-auto mb-3">
              <circle cx="12" cy="12" r="10" />
              <path d="m8 12 3 3 5-6" />
            </svg>
            <p className="text-lg font-semibold text-slate-900">
              Reserva confirmada. Recibirás confirmación por email.
            </p>
          </Card>
        ) : (
          <ReservaDirecta slug={slug} hostel={pagina} beds={beds} onSuccess={() => setSuccess(true)} />
        )}
      </div>
    </div>
  );
}

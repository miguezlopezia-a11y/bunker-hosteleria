import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/LoadingSpinner';
import PaginaHostalView from '../../components/public/PaginaHostalView';

const DEFAULT_TITLE = 'BunkerHostal';

// Plantilla 'piloto_a': carga los datos públicos por slug y los pinta con
// PaginaHostalView (compartida con la vista previa en vivo del quiz de alta).
export default function PaginaHostal() {
  const { slug } = useParams();

  const [pagina, setPagina] = useState(null);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  return <PaginaHostalView pagina={pagina} beds={beds} slug={slug} />;
}

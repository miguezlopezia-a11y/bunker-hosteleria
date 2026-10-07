import React from 'react';
import Card from '../../Card';
import ReservaDirecta from '../ReservaDirecta';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

// Adaptación de Tailblocks "hero/light/a" (MIT — github.com/mertJF/tailblocks).
// El original usa bg-${theme}-500 dinámico, que la purga JIT de Tailwind
// elimina: el color de acento va inline desde la paleta acotada.
export default function TailblocksHeroA({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="tb_hero_a" className="text-gray-600">
      <section className="container mx-auto flex px-5 py-24 md:flex-row flex-col items-center">
        <div className="lg:flex-grow md:w-1/2 lg:pr-24 md:pr-16 flex flex-col md:items-start md:text-left mb-16 md:mb-0 items-center text-center">
          <h1 className="sm:text-4xl text-3xl mb-4 font-medium text-gray-900" data-testid="pagina-hostal-title">
            {pagina.name}
          </h1>
          <p className="mb-8 text-sm text-gray-500">
            {pagina.address} · Desde {formatEuro(pagina.base_price)}/noche
          </p>
          {pagina.descripcion_larga && (
            <p className="mb-8 leading-relaxed" data-testid="pagina-hostal-descripcion">
              {pagina.descripcion_larga}
            </p>
          )}
          <div className="flex justify-center">
            <a
              href="#reserva"
              className="inline-flex text-white border-0 py-2 px-6 focus:outline-none rounded text-lg"
              style={{ backgroundColor: acento }}
            >
              Ver disponibilidad
            </a>
            <span className="ml-4 inline-flex items-center text-gray-700 bg-gray-100 border-0 py-2 px-6 rounded text-lg">
              Desde {formatEuro(pagina.base_price)}/noche
            </span>
          </div>
        </div>
        <div className="lg:max-w-lg lg:w-full md:w-1/2 w-5/6" data-testid="pagina-hostal-hero">
          {hero ? (
            <img className="object-cover object-center rounded" alt={pagina.name} src={hero} />
          ) : (
            <div className="w-full h-72 rounded" style={{ backgroundColor: acento }} />
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 pb-8">
        {preview ? null : success ? (
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
          <div id="reserva">
            <ReservaDirecta slug={slug ?? pagina.slug} hostel={pagina} beds={beds} onSuccess={onSuccess} />
          </div>
        )}
      </div>

      {galeria.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="pagina-hostal-galeria">
            {galeria.map((url) => (
              <img
                key={url}
                src={url}
                alt={pagina.name}
                className="w-full h-28 object-cover rounded-lg"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

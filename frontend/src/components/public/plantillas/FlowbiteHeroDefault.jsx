import React from 'react';
import Card from '../../Card';
import ReservaDirecta from '../ReservaDirecta';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

// Adaptación de Flowbite Blocks "Default hero section"
// (https://flowbite.com/blocks/marketing/hero/ — gratis, requiresJs: false).
// Cambios respecto al original: bg-primary-* (no existe en Tailwind por
// defecto) → acento inline desde la paleta acotada; variantes dark:
// eliminadas (la app no usa dark mode); logos "FEATURED IN" de terceros
// sustituidos por la galería del hostal.
export default function FlowbiteHeroDefault({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="flowbite_hero_default">
      <section className="bg-white" data-testid="pagina-hostal-hero">
        <div className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12">
          <span className="inline-flex items-center py-1 pr-4 mb-7 text-sm text-gray-700 bg-gray-100 rounded-full">
            <span
              className="text-xs rounded-full text-white px-4 py-1.5 mr-3"
              style={{ backgroundColor: acento }}
              data-testid="flowbite-hero-badge"
            >
              Reserva directa
            </span>
            <span className="text-sm font-medium">Sin comisiones</span>
          </span>
          <h1
            className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl lg:text-6xl"
            data-testid="pagina-hostal-title"
          >
            {pagina.name}
          </h1>
          <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 xl:px-48">
            {pagina.address} · Desde {formatEuro(pagina.base_price)}/noche
          </p>
          <div className="flex flex-col mb-8 lg:mb-16 space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
            <a
              href="#reserva"
              className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg"
              style={{ backgroundColor: acento }}
            >
              Ver disponibilidad
            </a>
            <a
              href="#galeria"
              className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              Ver fotos
            </a>
          </div>

          {galeria.length > 0 && (
            <div id="galeria" className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="pagina-hostal-galeria">
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
          )}
        </div>
      </section>

      {pagina.descripcion_larga && (
        <p
          className="max-w-3xl mx-auto px-4 py-8 text-gray-700 whitespace-pre-line"
          data-testid="pagina-hostal-descripcion"
        >
          {pagina.descripcion_larga}
        </p>
      )}

      <div className="max-w-3xl mx-auto px-4 pb-10">
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
    </div>
  );
}

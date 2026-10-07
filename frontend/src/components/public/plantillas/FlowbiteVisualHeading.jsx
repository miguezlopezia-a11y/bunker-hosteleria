import React from 'react';
import PieReservaGaleria from './PieReservaGaleria';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

// Adaptación de Flowbite Blocks "Visual image with heading"
// (https://flowbite.com/blocks/marketing/hero/ — gratis, requiresJs: false):
// grid de 12 columnas con texto (col-span-7) a la izquierda e imagen
// (col-span-5) a la derecha. Cambios: bg-primary-* (no existe en Tailwind
// por defecto) → acento inline; variantes dark: eliminadas; el mockup de
// móvil del original se sustituye por pagina.fotos.
export default function FlowbiteVisualHeading({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="flowbite_visual_heading">
      <section className="bg-white">
        <div className="grid max-w-screen-xl px-4 py-8 mx-auto lg:gap-8 xl:gap-0 lg:py-16 lg:grid-cols-12">
          <div className="mr-auto place-self-center lg:col-span-7">
            <h1
              className="max-w-2xl mb-4 text-4xl font-extrabold tracking-tight leading-none text-gray-900 md:text-5xl xl:text-6xl"
              data-testid="pagina-hostal-title"
            >
              {pagina.name}
            </h1>
            <p className="max-w-2xl mb-6 font-light text-gray-500 lg:mb-8 md:text-lg lg:text-xl">
              {pagina.address} · Desde {formatEuro(pagina.base_price)}/noche
            </p>
            {pagina.descripcion_larga && (
              <p className="max-w-2xl mb-6 font-light text-gray-500 md:text-lg" data-testid="pagina-hostal-descripcion">
                {pagina.descripcion_larga}
              </p>
            )}
            <a
              href="#reserva"
              className="inline-flex items-center justify-center px-5 py-3 mr-3 text-base font-medium text-center text-white rounded-lg"
              style={{ backgroundColor: acento }}
            >
              Ver disponibilidad
            </a>
            <a
              href="#galeria"
              className="inline-flex items-center justify-center px-5 py-3 text-base font-medium text-center text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Ver fotos
            </a>
          </div>
          <div className="hidden lg:mt-0 lg:col-span-5 lg:flex" data-testid="pagina-hostal-hero">
            {hero ? (
              <img src={hero} alt={pagina.name} className="rounded-lg w-full object-cover" />
            ) : (
              <div className="w-full h-72 rounded-lg" style={{ backgroundColor: acento }} />
            )}
          </div>
        </div>
      </section>
      <PieReservaGaleria pagina={pagina} slug={slug} beds={beds} preview={preview} success={success} onSuccess={onSuccess} galeria={galeria} />
    </div>
  );
}

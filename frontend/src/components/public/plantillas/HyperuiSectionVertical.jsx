import React from 'react';
import PieReservaGaleria from './PieReservaGaleria';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

// Adaptación de HyperUI "Content with image, vertical split"
// (https://www.hyperui.dev/components/marketing/sections — gratis, sin JS):
// texto arriba e imagen a todo lo ancho debajo (space-y, sin grid).
// La imagen de stock del original se sustituye por pagina.fotos.
export default function HyperuiSectionVertical({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="hyperui_section_vertical">
      <section>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-4 md:space-y-8">
            <div className="max-w-prose">
              <p className="text-sm text-gray-500">
                {pagina.address} · Desde {formatEuro(pagina.base_price)}/noche
              </p>
              <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl" data-testid="pagina-hostal-title">
                {pagina.name}
              </h1>
              {pagina.descripcion_larga && (
                <p className="mt-4 text-pretty text-gray-700" data-testid="pagina-hostal-descripcion">
                  {pagina.descripcion_larga}
                </p>
              )}
            </div>
            {hero ? (
              <img src={hero} alt={pagina.name} className="rounded w-full" data-testid="pagina-hostal-hero" />
            ) : (
              <div className="w-full h-64 rounded" style={{ backgroundColor: acento }} data-testid="pagina-hostal-hero" />
            )}
          </div>
        </div>
      </section>
      <PieReservaGaleria pagina={pagina} slug={slug} beds={beds} preview={preview} success={success} onSuccess={onSuccess} galeria={galeria} imgClassName="rounded" />
    </div>
  );
}

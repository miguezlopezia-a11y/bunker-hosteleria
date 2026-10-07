import React from 'react';
import PieReservaGaleria from './PieReservaGaleria';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

// Adaptación de HyperUI "Content with image, 2/3 grid"
// (https://www.hyperui.dev/components/marketing/sections — gratis, sin JS):
// texto estrecho (col-span-1) + imagen dominante (col-span-3) a la derecha.
// La imagen de stock del original se sustituye por pagina.fotos.
export default function HyperuiSection23({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="hyperui_section_23">
      <section>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:items-center md:gap-8">
            <div className="md:col-span-1">
              <div className="max-w-prose md:max-w-none">
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
            </div>
            <div className="md:col-span-3">
              {hero ? (
                <img src={hero} alt={pagina.name} className="rounded w-full" data-testid="pagina-hostal-hero" />
              ) : (
                <div className="w-full h-64 rounded" style={{ backgroundColor: acento }} data-testid="pagina-hostal-hero" />
              )}
            </div>
          </div>
        </div>
      </section>
      <PieReservaGaleria pagina={pagina} slug={slug} beds={beds} preview={preview} success={success} onSuccess={onSuccess} galeria={galeria} imgClassName="rounded" />
    </div>
  );
}

import React from 'react';
import Card from '../../Card';
import ReservaDirecta from '../ReservaDirecta';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

// Adaptación de HyperUI "Content with image, 1/2 grid"
// (https://www.hyperui.dev/components/marketing/sections, gratis, sin JS).
// La imagen de stock del original se sustituye por pagina.fotos.
export default function HyperuiSectionMedia({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="hyperui_section_12">
      <section>
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-center md:gap-8">
            <div>
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
            <div>
              {hero ? (
                <img src={hero} alt={pagina.name} className="rounded" data-testid="pagina-hostal-hero" />
              ) : (
                <div className="w-full h-64 rounded" style={{ backgroundColor: acento }} data-testid="pagina-hostal-hero" />
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-4">
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
          <ReservaDirecta slug={slug ?? pagina.slug} hostel={pagina} beds={beds} onSuccess={onSuccess} />
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
                className="w-full h-28 object-cover rounded"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

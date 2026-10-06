import React from 'react';
import Card from '../../Card';
import ReservaDirecta from '../ReservaDirecta';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

export default function HeroDividido({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="piloto_b" className="min-h-screen bg-white">
      <div
        className="relative w-full min-h-[80vh] bg-gray-300 bg-cover bg-center flex items-end"
        style={hero ? { backgroundImage: `url(${hero})` } : { backgroundColor: acento }}
        data-testid="pagina-hostal-hero"
      >
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10"
          data-testid="pagina-hostal-hero-overlay"
        />
        <div className="relative px-6 pb-10 md:px-12 md:pb-14 w-full max-w-5xl mx-auto">
          <h1
            className="font-serif text-4xl md:text-5xl font-bold text-white"
            data-testid="pagina-hostal-title"
          >
            {pagina.name}
          </h1>
          <p className="text-white/90 mt-2">{pagina.address}</p>
          <div className="inline-block mt-4 bg-white text-slate-900 rounded-2xl shadow-lg px-5 py-3">
            <p className="text-sm font-semibold">
              Desde {formatEuro(pagina.base_price)}
              <span className="font-normal text-slate-500">/noche</span>
            </p>
          </div>
        </div>
      </div>

      {pagina.descripcion_larga && (
        <section style={{ backgroundColor: acento }}>
          <p
            className="max-w-3xl mx-auto px-6 py-10 text-white whitespace-pre-line"
            data-testid="pagina-hostal-descripcion"
          >
            {pagina.descripcion_larga}
          </p>
        </section>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
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
                className="w-full h-28 object-cover rounded-2xl shadow-md"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

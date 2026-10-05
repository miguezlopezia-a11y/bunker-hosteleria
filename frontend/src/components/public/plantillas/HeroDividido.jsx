import React from 'react';
import Card from '../../Card';
import ReservaDirecta from '../ReservaDirecta';
import { formatEuro } from '../../../utils/format';

export default function HeroDividido({ pagina, acento, hero, galeria, slug, beds, success, onSuccess }) {
  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="piloto_b" className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-0 md:gap-8 md:items-stretch">
        <div
          className="w-full h-64 md:h-auto md:min-h-[480px] bg-gray-300 bg-cover bg-center order-1 md:order-2"
          style={hero ? { backgroundImage: `url(${hero})` } : { backgroundColor: acento }}
          data-testid="pagina-hostal-hero"
        />
        <div className="px-4 py-8 md:py-12 order-2 md:order-1 flex flex-col">
          <div className="pl-4 mb-6" style={{ borderLeftWidth: 4, borderColor: acento }}>
            <h1 className="text-3xl font-bold text-slate-900" data-testid="pagina-hostal-title">
              {pagina.name}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {pagina.address} · Desde {formatEuro(pagina.base_price)}/noche
            </p>
          </div>

          {pagina.descripcion_larga && (
            <p className="text-slate-700 whitespace-pre-line mb-6" data-testid="pagina-hostal-descripcion">
              {pagina.descripcion_larga}
            </p>
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
            <ReservaDirecta slug={slug} hostel={pagina} beds={beds} onSuccess={onSuccess} />
          )}
        </div>
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

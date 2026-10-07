import React from 'react';
import Card from '../../Card';
import ReservaDirecta from '../ReservaDirecta';

// Pie común de las plantillas de librerías: bloque de reserva directa
// (con guard de preview y pantalla de éxito) + galería. Extraído a un
// helper para no duplicarlo en cada variante; la piel de cada plantilla
// solo define la cabecera/hero.
export default function PieReservaGaleria({
  pagina,
  slug,
  beds,
  preview,
  success,
  onSuccess,
  galeria,
  imgClassName = 'rounded-lg',
}) {
  return (
    <>
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
                className={`w-full h-28 object-cover ${imgClassName}`}
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

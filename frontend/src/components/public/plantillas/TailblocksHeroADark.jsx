import React from 'react';
import PieReservaGaleria from './PieReservaGaleria';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

// Adaptación de Tailblocks hero/dark/a (MIT — github.com/mertJF/tailblocks).
// El bg-${theme}-500 dinámico del original no sobrevive a la purga JIT:
// el acento va inline desde la paleta acotada.
export default function TailblocksHeroADark({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="tb_hero_a_dark">
      <section className="text-gray-400">
        <div className="container mx-auto flex px-5 py-24 bg-gray-900 md:flex-row flex-col items-center text-gray-400 bg-gray-900" data-testid="pagina-hostal-hero">
          <div className="lg:flex-grow md:w-1/2 lg:pr-24 md:pr-16 flex flex-col md:items-start md:text-left mb-16 md:mb-0 items-center text-center">
            <h1 className="sm:text-4xl text-3xl mb-4 font-medium text-white" data-testid="pagina-hostal-title">
              {pagina.name}
            </h1>
            <p className="mb-8 text-sm">{pagina.address} · Desde {formatEuro(pagina.base_price)}/noche</p>
            {pagina.descripcion_larga && (
              <p className="mb-8 leading-relaxed" data-testid="pagina-hostal-descripcion">{pagina.descripcion_larga}</p>
            )}
            <div className="flex justify-center">
              <a href="#reserva" className="inline-flex text-white border-0 py-2 px-6 focus:outline-none rounded text-lg" style={{ backgroundColor: acento }}>
                Ver disponibilidad
              </a>
              <span className="ml-4 inline-flex items-center text-gray-400 bg-gray-800 border-0 py-2 px-6 rounded text-lg">
                Desde {formatEuro(pagina.base_price)}/noche
              </span>
            </div>
          </div>
          <div className="lg:max-w-lg lg:w-full md:w-1/2 w-5/6">
            {hero ? (
              <img className="object-cover object-center rounded w-full" alt={pagina.name} src={hero} />
            ) : (
              <div className="w-full h-72 rounded" style={{ backgroundColor: acento }} />
            )}
          </div>
        </div>
      </section>
      <PieReservaGaleria pagina={pagina} slug={slug} beds={beds} preview={preview} success={success} onSuccess={onSuccess} galeria={galeria} />
    </div>
  );
}

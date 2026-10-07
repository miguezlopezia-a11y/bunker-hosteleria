import React from 'react';
import PieReservaGaleria from './PieReservaGaleria';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';

// Adaptación de Tailblocks hero (MIT — github.com/mertJF/tailblocks).
// El bg-${'theme'}-500 dinámico del original no sobrevive a la purga
// JIT: el acento va inline desde la paleta acotada.
export default function TailblocksHeroFDark({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  return (
    <div data-testid="pagina-hostal-layout" data-plantilla="tb_hero_f_dark">
      <section className="text-gray-400 bg-gray-900">
        <div className="container mx-auto flex flex-col px-5 py-24 bg-gray-900 justify-center items-center" data-testid="pagina-hostal-hero">
          <img className="lg:w-2/6 md:w-3/6 w-5/6 mb-10 object-cover object-center rounded" alt={pagina.name} src={hero} />
          <div className="w-full md:w-2/3 flex flex-col mb-16 items-center text-center">
          <h1 className="sm:text-4xl text-3xl mb-4 font-medium text-white" data-testid="pagina-hostal-title">{pagina.name}</h1>
          {pagina.descripcion_larga && (
            <p className="mb-8 leading-relaxed" data-testid="pagina-hostal-descripcion">{pagina.descripcion_larga}</p>
          )}
          <div className="flex w-full md:justify-start justify-center items-end">
            <a href="#reserva" className="inline-flex text-white border-0 py-2 px-6 focus:outline-none rounded text-lg" style={{ backgroundColor: acento }}>Ver disponibilidad</a>
            <span className="ml-4 inline-flex items-center border-0 py-2 px-6 rounded text-lg text-gray-400 bg-gray-800">Desde {formatEuro(pagina.base_price)}/noche</span>
          </div>
          <p className="text-sm mt-2 text-gray-500 mb-8 w-full">{pagina.address}</p>
          </div>
        </div>
      </section>
      <PieReservaGaleria pagina={pagina} slug={slug} beds={beds} preview={preview} success={success} onSuccess={onSuccess} galeria={galeria} />
    </div>
  );
}

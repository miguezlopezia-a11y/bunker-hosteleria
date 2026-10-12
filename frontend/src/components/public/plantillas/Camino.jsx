import React, { useEffect } from 'react';
import PieReservaGaleria from './PieReservaGaleria';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';
import './Camino.css';

// Camino — tema premium editorial, evolución de piloto_b: foto a sangre
// con overlay en gradiente, serif de sistema a gran tamaño, acento como
// banda de sección (descripción) y ficha de precio flotante que se
// monta sobre el borde del hero. Motion: zoom suave del hero + revelado
// por scroll (IntersectionObserver, nativo) en desktop; móvil fijo.
// Paleta única gray. La reserva compartida se adapta con la skin
// .camino-form (Camino.css), sin tocar Card/ReservaDirecta.

function oscurecer(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.round(v * factor));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]:not([data-reveal="shown"])');
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.setAttribute('data-reveal', 'shown'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal', 'shown');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function Camino({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  useScrollReveal();

  return (
    <div
      data-testid="pagina-hostal-layout"
      data-plantilla="camino"
      className="bg-white text-gray-900"
      style={{ '--camino-acento': acento, '--camino-acento-oscuro': oscurecer(acento, 0.85) }}
    >
      <section
        className="relative h-[520px] md:h-[640px] flex items-end overflow-hidden bg-gray-950"
        data-testid="pagina-hostal-hero"
        data-reveal
      >
        {hero ? (
          <img
            src={hero}
            alt={pagina.name}
            className="camino-hero-img absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: acento }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <div className="relative w-full max-w-5xl mx-auto px-6 pb-16 md:pb-20">
          <p className="text-xs uppercase tracking-widest text-white/70 mb-3">{pagina.address}</p>
          <h1
            className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight"
            data-testid="pagina-hostal-title"
          >
            {pagina.name}
          </h1>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 relative" data-reveal>
        <div
          className="bg-white rounded-2xl shadow-xl ring-1 ring-gray-100 px-6 py-5 md:px-8 md:py-6 -mt-10 md:-mt-12 inline-block"
          data-testid="camino-price-card"
        >
          <p className="text-xs uppercase tracking-widest text-gray-500">Desde</p>
          <p className="font-serif text-3xl md:text-4xl font-bold" style={{ color: acento }}>
            {formatEuro(pagina.base_price)}
            <span className="text-base font-normal text-gray-500">/noche</span>
          </p>
        </div>
      </div>

      {pagina.descripcion_larga && (
        <section className="mt-12 md:mt-16" style={{ backgroundColor: acento }} data-reveal>
          <p
            className="camino-desc max-w-3xl mx-auto px-6 py-14 md:py-20 font-serif text-xl md:text-2xl text-white leading-relaxed whitespace-pre-line"
            data-testid="pagina-hostal-descripcion"
          >
            {pagina.descripcion_larga}
          </p>
        </section>
      )}

      <div className="mt-12 md:mt-16" data-reveal>
        {!preview && (
          <p
            className="max-w-5xl mx-auto px-4 text-xs uppercase tracking-widest pb-2"
            style={{ color: acento }}
          >
            Reserva directa
          </p>
        )}
        <PieReservaGaleria
          pagina={pagina}
          slug={slug}
          beds={beds}
          preview={preview}
          success={success}
          onSuccess={onSuccess}
          galeria={galeria}
          imgClassName="rounded-2xl camino-img camino-img-hover"
          reservaClassName="camino-form"
          galeriaTitulo="Galería"
        />
      </div>

      <footer
        className="border-t mt-10 py-8 text-center"
        style={{ borderTopColor: acento }}
        data-testid="camino-footer"
      >
        <p className="text-xs uppercase tracking-widest text-gray-400">
          {pagina.name} · Reserva directa, sin comisiones
        </p>
      </footer>
    </div>
  );
}

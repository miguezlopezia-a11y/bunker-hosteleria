import React, { useEffect } from 'react';
import PieReservaGaleria from './PieReservaGaleria';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';
import './Norte.css';

// Norte — tema premium oscuro con duotone: la foto del hostal se funde
// con el color de acento (mix-blend-multiply) sobre fondo carbón.
// Motion en dos niveles: desktop/tablet lleva Ken Burns en el hero y
// revelado por scroll (IntersectionObserver, nativo); móvil se queda con
// estructura fija. Nada de dependencias externas; se respeta
// prefers-reduced-motion.
//
// La reserva compartida (ReservaDirecta, sin tocar) se "enquista" en el
// tema con la skin .norte-form definida en Norte.css: selectores
// descendientes que oscurecen Card/Input/Select/Button y tiñen los
// botones con el acento (vía variables CSS inyectadas en la raíz).

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

export default function Norte({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  useScrollReveal();

  return (
    <div
      data-testid="pagina-hostal-layout"
      data-plantilla="norte"
      className="bg-gray-950 text-gray-200"
      style={{ '--norte-acento': acento, '--norte-acento-oscuro': oscurecer(acento, 0.85) }}
    >
      <section
        className="relative min-h-[540px] md:min-h-[620px] flex items-end overflow-hidden bg-gray-950"
        data-testid="pagina-hostal-hero"
      >
        {hero ? (
          <img
            src={hero}
            alt={pagina.name}
            className="norte-kb absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'contrast(1.05) saturate(0.85)' }}
          />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: acento }} />
        )}
        {hero && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: acento, mixBlendMode: 'multiply', opacity: 0.75 }}
            data-testid="norte-duotone"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/30 to-transparent" />

        <div
          className="norte-scroll-hint absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 hidden md:block"
          aria-hidden="true"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <div className="relative w-full max-w-5xl mx-auto px-6 pb-14 md:pb-20 pt-40">
          <span
            className="inline-block text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-5 shadow-lg ring-1 ring-black/30"
            style={{ backgroundColor: acento }}
            data-testid="norte-price-badge"
          >
            Desde {formatEuro(pagina.base_price)}/noche
          </span>
          <h1
            className="font-serif text-4xl md:text-6xl font-bold text-white leading-tight"
            data-testid="pagina-hostal-title"
          >
            {pagina.name}
          </h1>
          <p className="mt-3 text-xs md:text-sm uppercase tracking-widest text-white/70">
            {pagina.address}
          </p>
        </div>
      </section>

      {pagina.descripcion_larga && (
        <section className="max-w-3xl mx-auto px-6 py-14" data-reveal>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: acento }}>
            El albergue
          </p>
          <p
            className="norte-desc font-serif text-xl md:text-2xl text-gray-100 leading-relaxed whitespace-pre-line border-l-4 pl-6"
            style={{ borderColor: acento }}
            data-testid="pagina-hostal-descripcion"
          >
            {pagina.descripcion_larga}
          </p>
        </section>
      )}

      <div data-reveal>
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
          imgClassName="rounded-xl norte-foto-hover"
          reservaClassName="norte-form"
          galeriaTitulo="Galería"
        />
      </div>

      <footer
        className="border-t mt-6 py-8 text-center"
        style={{ borderColor: acento }}
        data-testid="norte-footer"
      >
        <p className="text-xs uppercase tracking-widest text-gray-400">
          {pagina.name} · Reserva directa, sin comisiones
        </p>
      </footer>
    </div>
  );
}

import React, { useEffect } from 'react';
import PieReservaGaleria from './PieReservaGaleria';
import { formatEuro } from '../../../utils/format';
import { colorAcento } from '../../../utils/paleta';
import './Huella.css';

// Huella — tema premium claro minimal: mucho aire, acento solo en
// microdetalles (labels, precio, focos, botones) y precios en pila
// mono. Imagen a todo lo ancho bajo el bloque de texto. Motion:
// revelado por scroll (IntersectionObserver, nativo) con zoom suave de
// la imagen en desktop; móvil fijo. Paleta única gray. La reserva
// compartida se eleva con la skin .huella-form (Huella.css), sin tocar
// Card/ReservaDirecta.

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

export default function Huella({ pagina, slug, beds = [], preview = false, success, onSuccess }) {
  const acento = colorAcento(pagina.color_acento);
  const fotos = pagina.fotos || [];
  const hero = fotos[0];
  const galeria = fotos.slice(1);

  useScrollReveal();

  return (
    <div
      data-testid="pagina-hostal-layout"
      data-plantilla="huella"
      className="bg-white text-gray-900"
      style={{ '--huella-acento': acento, '--huella-acento-oscuro': oscurecer(acento, 0.85) }}
    >
      <section className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-10 md:pb-14" data-reveal>
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: acento }}>
          Albergue
        </p>
        <div className="max-w-prose">
          <h1
            className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900"
            data-testid="pagina-hostal-title"
          >
            {pagina.name}
          </h1>
          <p className="mt-3 text-gray-500">{pagina.address}</p>
          <p className="huella-precio mt-6 font-mono text-lg" style={{ color: acento }} data-testid="huella-price">
            Desde {formatEuro(pagina.base_price)}/noche
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6" data-reveal>
        {hero ? (
          <img
            src={hero}
            alt={pagina.name}
            className="huella-img w-full h-64 md:h-[480px] object-cover rounded-2xl"
            data-testid="pagina-hostal-hero"
          />
        ) : (
          <div
            className="w-full h-64 md:h-[480px] rounded-2xl"
            style={{ backgroundColor: acento }}
            data-testid="pagina-hostal-hero"
          />
        )}
      </section>

      {pagina.descripcion_larga && (
        <section className="max-w-prose mx-auto px-6 py-14 md:py-20" data-reveal>
          <p
            className="text-lg md:text-xl text-gray-700 leading-relaxed whitespace-pre-line"
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
          imgClassName="rounded-2xl huella-img huella-img-hover"
          reservaClassName="huella-form"
          galeriaTitulo="Galería"
        />
      </div>

      <footer className="border-t border-gray-200 mt-10 py-8 text-center" data-testid="huella-footer">
        <p className="text-xs uppercase tracking-widest text-gray-400">
          {pagina.name} · Reserva directa, sin comisiones
        </p>
      </footer>
    </div>
  );
}

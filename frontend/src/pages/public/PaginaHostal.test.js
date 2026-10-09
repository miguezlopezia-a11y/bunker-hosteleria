/**
 * Tests de la página web pública por hostal (/sitio/:slug) — TDD de la
 * migración 023 (campos de contenido + RPC get_pagina_hostal).
 *
 * Propiedad clave (anti-enumeración): slug inexistente y página desactivada
 * (pagina_web_activa=false) producen EXACTAMENTE el mismo observable — la RPC
 * devuelve 0 filas y la página muestra el 404, nunca una página vacía ni un
 * error distinto.
 */
import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test-utils';
import PaginaHostal from './PaginaHostal';
import PaginaHostalView from '../../components/public/PaginaHostalView';
import Norte from '../../components/public/plantillas/Norte';
import Huella from '../../components/public/plantillas/Huella';

// Controla lo que devuelve el mock de get_pagina_hostal (el prefijo mock* es
// obligatorio para que Jest permita referenciarlo desde la factory).
let mockPaginaHostalRows = [];

const PAGINA_ACTIVA = {
  name: 'Albergue Demo Galicia',
  slug: 'albergue-demo-galicia',
  address: 'Calle Demo 3, Santiago',
  base_price: 14,
  descripcion_larga: 'Albergue de peregrinos junto a la catedral.',
  fotos: ['https://ejemplo.test/fachada.jpg', 'https://ejemplo.test/comedor.jpg'],
  color_acento: 'ocre',
  plantilla: 'piloto_a',
};

jest.mock('../../lib/supabase', () => {
  const makeThenable = (result) => ({ then: (resolve) => Promise.resolve(result).then(resolve) });
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: () => {
        throw new Error('PaginaHostal no debe hacer SELECT directo: solo RPCs públicas');
      },
      rpc: (fn) => {
        if (fn === 'get_pagina_hostal') {
          return makeThenable({ data: mockPaginaHostalRows, error: null });
        }
        if (fn === 'get_beds_by_hostal_slug') {
          return makeThenable({
            data: [
              { label: '1A', status: 'free' },
              { label: '1B', status: 'free' },
            ],
            error: null,
          });
        }
        if (fn === 'get_rooms_by_hostal_slug') {
          return makeThenable({ data: [], error: null });
        }
        if (fn === 'create_public_booking') {
          return makeThenable({ data: { exito: true }, error: null });
        }
        return makeThenable({ data: [], error: null });
      },
    },
  };
});

beforeEach(() => {
  mockPaginaHostalRows = [];
});

function renderPagina(slug) {
  return renderWithProviders(
    <Routes>
      <Route path="/sitio/:slug" element={<PaginaHostal />} />
    </Routes>,
    { initialEntries: [`/sitio/${slug}`] }
  );
}

test('página desactivada (pagina_web_activa=false) muestra 404, nunca una página vacía', async () => {
  // La RPC devuelve 0 filas cuando el slug existe pero la página está
  // desactivada — mismo observable que si el slug no existiera.
  mockPaginaHostalRows = [];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-404')).toBeInTheDocument());
  expect(screen.queryByTestId('pagina-hostal-page')).not.toBeInTheDocument();
});

test('slug inexistente muestra el mismo 404 (anti-enumeración)', async () => {
  mockPaginaHostalRows = [];
  renderPagina('slug-que-no-existe');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-404')).toBeInTheDocument());
  expect(screen.queryByTestId('pagina-hostal-page')).not.toBeInTheDocument();
});

test('página activa muestra nombre, descripción, galería y la reserva directa', async () => {
  mockPaginaHostalRows = [PAGINA_ACTIVA];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-title')).toHaveTextContent('Albergue Demo Galicia');
  expect(screen.getByTestId('pagina-hostal-descripcion')).toHaveTextContent(
    'Albergue de peregrinos junto a la catedral.'
  );
  expect(screen.getByTestId('pagina-hostal-galeria')).toBeInTheDocument();
  // El flujo de reserva es el componente compartido, no una reimplementación.
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'piloto_a');
});

test('plantilla piloto_b renderiza el layout hero dividido, no el de piloto_a', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'piloto_b' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'piloto_b');
  expect(screen.getByTestId('pagina-hostal-title')).toHaveTextContent('Albergue Demo Galicia');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('piloto_b: hero a pantalla completa con overlay y título serif encima de la foto', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'piloto_b' }];
  renderPagina('albergue-demo-galicia');

  const hero = await screen.findByTestId('pagina-hostal-hero');
  expect(screen.getByTestId('pagina-hostal-hero-overlay')).toBeInTheDocument();
  // El título va DENTRO del hero (encima de la foto), no en una columna aparte.
  expect(hero).toContainElement(screen.getByTestId('pagina-hostal-title'));
  // Tipografía distinta de piloto_a: pila serif de sistema.
  expect(screen.getByTestId('pagina-hostal-title')).toHaveClass('font-serif');
});

test('piloto_a: el título NO usa serif (distinción tipográfica real entre plantillas)', async () => {
  mockPaginaHostalRows = [PAGINA_ACTIVA];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-title')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-title')).not.toHaveClass('font-serif');
});

test('piloto_b: la descripción va sobre fondo de color de acento, no como borde fino', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'piloto_b', color_acento: 'ocre' }];
  renderPagina('albergue-demo-galicia');

  const descripcion = await screen.findByTestId('pagina-hostal-descripcion');
  // colorAcento('ocre') === '#b45309' (paleta acotada).
  expect(descripcion.parentElement).toHaveStyle({ backgroundColor: '#b45309' });
  expect(descripcion).toHaveClass('text-white');
});

test('plantilla desconocida o null cae en piloto_a (default seguro)', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: null }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'piloto_a');
});

test('tb_hero_a: columnas texto+imagen, CTA "Ver disponibilidad" con fondo de acento', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'tb_hero_a' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'tb_hero_a');
  expect(screen.getByTestId('pagina-hostal-title')).toHaveTextContent('Albergue Demo Galicia');
  const cta = screen.getByRole('link', { name: /ver disponibilidad/i });
  expect(cta).toHaveStyle({ backgroundColor: '#b45309' });
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('hyperui_section_12: título dentro de max-w-prose e imagen a la derecha', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'hyperui_section_12' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'hyperui_section_12');
  const title = screen.getByTestId('pagina-hostal-title');
  expect(title.closest('.max-w-prose')).not.toBeNull();
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.tagName).toBe('IMG');
  expect(hero).toHaveClass('rounded');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('flowbite_hero_default: cabecera centrada con badge pill y título extrabold', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'flowbite_hero_default' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'flowbite_hero_default');
  const badge = screen.getByTestId('flowbite-hero-badge');
  expect(badge).toHaveClass('rounded-full');
  expect(badge).toHaveStyle({ backgroundColor: '#b45309' });
  const title = screen.getByTestId('pagina-hostal-title');
  expect(title).toHaveClass('font-extrabold');
  expect(title.closest('.text-center')).not.toBeNull();
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('regresión: el mapa de layouts es el mismo en página pública y en la preview del quiz', () => {
  // Antes el LAYOUTS de PaginaHostalView estaba duplicado y una variante
  // nueva caía al default (piloto_a) en la vista previa del quiz /alta.
  renderWithProviders(
    <PaginaHostalView pagina={{ ...PAGINA_ACTIVA, plantilla: 'tb_hero_a' }} beds={[]} preview slug="albergue-demo-galicia" />
  );
  expect(screen.getByTestId('pagina-hostal-preview')).toBeInTheDocument();
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'tb_hero_a');
  expect(screen.queryByTestId('availability-check-button')).not.toBeInTheDocument();
});

// Adaptaciones de las variantes restantes: el rasgo distintivo de cada una
// (leído del código fuente original) + la reserva directa presente.

async function renderVariante(plantilla) {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla }];
  renderPagina('albergue-demo-galicia');
  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', plantilla);
}

test('tb_hero_b: centrado con la imagen estrecha arriba (lg:w-2/6)', async () => {
  await renderVariante('tb_hero_b');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.className).toContain('justify-center flex-col');
  expect(hero.querySelector('img')).toHaveClass('lg:w-2/6');
  expect(screen.getByTestId('pagina-hostal-title').closest('.text-center')).not.toBeNull();
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_c: imagen a la izquierda y texto a la derecha (lg:pl-24)', async () => {
  await renderVariante('tb_hero_c');
  const img = screen.getByTestId('pagina-hostal-hero').querySelector('img');
  expect(img.parentElement.className).toContain('md:mb-0');
  expect(screen.getByTestId('pagina-hostal-title').parentElement.className).toContain('lg:pl-24');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_d: texto a la izquierda, imagen a la derecha y línea pequeña de nota', async () => {
  await renderVariante('tb_hero_d');
  expect(screen.getByTestId('pagina-hostal-title').parentElement.className).toContain('lg:pr-24');
  expect(screen.getByText(/calle demo 3/i)).toHaveClass('text-sm', 'mt-2');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_e: imagen a la izquierda con nota pequeña bajo el CTA', async () => {
  await renderVariante('tb_hero_e');
  const img = screen.getByTestId('pagina-hostal-hero').querySelector('img');
  expect(img.parentElement.className).toContain('mb-10');
  expect(screen.getByText(/calle demo 3/i)).toHaveClass('text-sm', 'mt-2');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_f: centrado con contenedor md:w-2/3 y nota', async () => {
  await renderVariante('tb_hero_f');
  expect(screen.getByTestId('pagina-hostal-title').parentElement.className).toContain('md:w-2/3');
  expect(screen.getByText(/calle demo 3/i)).toHaveClass('text-sm', 'mt-2');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_a_dark: mismo layout que A pero sobre fondo oscuro bg-gray-900', async () => {
  await renderVariante('tb_hero_a_dark');
  const seccion = screen.getByTestId('pagina-hostal-hero');
  expect(seccion.className).toContain('bg-gray-900');
  expect(seccion.querySelector('.bg-gray-800')).not.toBeNull();
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_b_dark: centrado oscuro con imagen estrecha arriba', async () => {
  await renderVariante('tb_hero_b_dark');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.className).toContain('bg-gray-900');
  expect(hero.querySelector('img')).toHaveClass('lg:w-2/6');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_c_dark: imagen izquierda + texto derecha en oscuro', async () => {
  await renderVariante('tb_hero_c_dark');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.className).toContain('bg-gray-900');
  expect(screen.getByTestId('pagina-hostal-title').parentElement.className).toContain('lg:pl-24');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_d_dark: texto izquierda + imagen derecha + nota en oscuro', async () => {
  await renderVariante('tb_hero_d_dark');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.className).toContain('bg-gray-900');
  expect(screen.getByTestId('pagina-hostal-title').parentElement.className).toContain('lg:pr-24');
  expect(screen.getByText(/calle demo 3/i)).toHaveClass('text-sm', 'mt-2');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_e_dark: imagen izquierda + nota en oscuro', async () => {
  await renderVariante('tb_hero_e_dark');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.className).toContain('bg-gray-900');
  const img = hero.querySelector('img');
  expect(img.parentElement.className).toContain('mb-10');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('tb_hero_f_dark: centrado oscuro con md:w-2/3 y nota', async () => {
  await renderVariante('tb_hero_f_dark');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.className).toContain('bg-gray-900');
  expect(screen.getByTestId('pagina-hostal-title').parentElement.className).toContain('md:w-2/3');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('hyperui_section_23: grid 4 columnas con imagen dominante (col-span-3) a la derecha', async () => {
  await renderVariante('hyperui_section_23');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.closest('.md\\:grid-cols-4')).not.toBeNull();
  expect(hero.parentElement.className).toContain('md:col-span-3');
  const title = screen.getByTestId('pagina-hostal-title');
  expect(title.parentElement.parentElement.className).toContain('md:col-span-1');
  // La imagen va DESPUÉS del texto en el DOM (a la derecha).
  expect(title.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('hyperui_section_32: imagen dominante a la IZQUIERDA del texto', async () => {
  await renderVariante('hyperui_section_32');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.parentElement.className).toContain('md:col-span-3');
  const title = screen.getByTestId('pagina-hostal-title');
  expect(title.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('hyperui_section_vertical: texto arriba e imagen a todo lo ancho debajo', async () => {
  await renderVariante('hyperui_section_vertical');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.tagName).toBe('IMG');
  expect(hero.closest('.space-y-4')).not.toBeNull();
  const title = screen.getByTestId('pagina-hostal-title');
  expect(title.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('flowbite_visual_heading: grid 12 columnas, texto 7 + imagen 5', async () => {
  await renderVariante('flowbite_visual_heading');
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.querySelector('img')).not.toBeNull();
  expect(hero.className).toContain('lg:col-span-5');
  expect(hero.closest('.lg\\:grid-cols-12')).not.toBeNull();
  const title = screen.getByTestId('pagina-hostal-title');
  expect(title.parentElement.className).toContain('lg:col-span-7');
  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('norte: tema oscuro duotone — hero carbón, overlay multiply del acento, título serif', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'norte', color_acento: 'ocre' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'norte');

  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.className).toContain('bg-gray-950');

  // Duotone: overlay con blend multiply del color de acento sobre la foto.
  const duotone = screen.getByTestId('norte-duotone');
  expect(duotone).toHaveStyle({ backgroundColor: '#b45309', mixBlendMode: 'multiply' });

  const title = screen.getByTestId('pagina-hostal-title');
  expect(title).toHaveClass('font-serif', 'text-white');
  expect(hero).toContainElement(title);

  // Ficha de precio tipo pill sobre el hero.
  const badge = screen.getByTestId('norte-price-badge');
  expect(badge).toHaveClass('rounded-full');
  expect(badge).toHaveStyle({ backgroundColor: '#b45309' });

  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('norte: el contenido bajo el hero lleva data-reveal (motion por revelado)', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'norte' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  // El atributo data-reveal está en el section contenedor; el observer
  // (o su fallback) lo marca como "shown" al entrar en viewport.
  expect(screen.getByTestId('pagina-hostal-descripcion').closest('[data-reveal]')).not.toBeNull();
  expect(screen.getByTestId('pagina-hostal-galeria').closest('[data-reveal]')).not.toBeNull();
});

test('norte: la preview del quiz no muestra la reserva', () => {
  renderWithProviders(
    <PaginaHostalView pagina={{ ...PAGINA_ACTIVA, plantilla: 'norte' }} beds={[]} preview slug="albergue-demo-galicia" />
  );
  expect(screen.getByTestId('pagina-hostal-preview')).toBeInTheDocument();
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'norte');
  expect(screen.queryByTestId('availability-check-button')).not.toBeInTheDocument();
});

test('norte: skin oscura — la reserva compartida va dentro de .norte-form y el tema inyecta el CSS', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'norte', color_acento: 'ocre' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  // La caja de Disponibilidad (Card compartida, sin tocar) queda enquistada
  // en el contenedor con la skin oscura descendiente (Norte.css).
  expect(screen.getByTestId('availability-check-button').closest('.norte-form')).not.toBeNull();
  // La raíz del tema inyecta el acento y su tono hover como variables CSS
  // que Norte.css consume (botones, focos, filetes).
  const layout = screen.getByTestId('pagina-hostal-layout');
  expect(layout.getAttribute('style')).toContain('--norte-acento: #b45309');
});

test('norte: la pantalla de éxito también va dentro de la skin oscura', () => {
  renderWithProviders(
    <Norte pagina={{ ...PAGINA_ACTIVA, plantilla: 'norte' }} beds={[]} success onSuccess={() => {}} slug="albergue-demo-galicia" />
  );
  const success = screen.getByTestId('public-booking-success-screen');
  expect(success.closest('.norte-form')).not.toBeNull();
  expect(screen.queryByTestId('availability-check-button')).not.toBeInTheDocument();
});

test('norte: footer con filete de acento y etiquetas de sección', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'norte', color_acento: 'ocre' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  const footer = screen.getByTestId('norte-footer');
  expect(footer).toHaveStyle({ borderTopColor: '#b45309' });
  expect(screen.getByText(/sin comisiones/i)).toBeInTheDocument();
  expect(screen.getByText('El albergue')).toBeInTheDocument();
  expect(screen.getByText('Galería')).toBeInTheDocument();
  // La galería lleva el mismo filtro de foto que el hero.
  expect(screen.getByTestId('pagina-hostal-galeria').querySelector('img').className).toContain('norte-foto-hover');
});

test('huella: minimal claro — label de acento, título sans, precio mono, imagen ancha debajo', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'huella', color_acento: 'ocre' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'huella');

  const layout = screen.getByTestId('pagina-hostal-layout');
  expect(layout.className).toContain('bg-white');
  expect(layout.getAttribute('style')).toContain('--huella-acento: #b45309');

  // Precio en pila mono (huella distintivo frente a serif de Norte).
  const price = screen.getByTestId('huella-price');
  expect(price).toHaveClass('font-mono');
  expect(price).toHaveStyle({ color: '#b45309' });

  // Hero = imagen a todo lo ancho DEBAJO del bloque de texto (vertical split).
  const hero = screen.getByTestId('pagina-hostal-hero');
  expect(hero.tagName).toBe('IMG');
  expect(hero).toHaveClass('rounded-2xl');
  const title = screen.getByTestId('pagina-hostal-title');
  expect(title.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  await waitFor(() => expect(screen.getByTestId('availability-check-button')).toBeInTheDocument());
});

test('huella: la reserva compartida va dentro de .huella-form (skin clara premium)', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'huella' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  expect(screen.getByTestId('availability-check-button').closest('.huella-form')).not.toBeNull();
});

test('huella: preview del quiz sin reserva y con reveal', () => {
  renderWithProviders(
    <PaginaHostalView pagina={{ ...PAGINA_ACTIVA, plantilla: 'huella' }} beds={[]} preview slug="albergue-demo-galicia" />
  );
  expect(screen.getByTestId('pagina-hostal-preview')).toBeInTheDocument();
  expect(screen.getByTestId('pagina-hostal-layout')).toHaveAttribute('data-plantilla', 'huella');
  expect(screen.queryByTestId('availability-check-button')).not.toBeInTheDocument();
  expect(screen.getByTestId('pagina-hostal-hero').closest('[data-reveal]')).not.toBeNull();
});

test('huella: la pantalla de éxito también va dentro de la skin clara', () => {
  renderWithProviders(
    <Huella pagina={{ ...PAGINA_ACTIVA, plantilla: 'huella' }} beds={[]} success onSuccess={() => {}} slug="albergue-demo-galicia" />
  );
  const success = screen.getByTestId('public-booking-success-screen');
  expect(success.closest('.huella-form')).not.toBeNull();
  expect(screen.queryByTestId('availability-check-button')).not.toBeInTheDocument();
});

test('huella: footer con filete sutil y galería con el filtro del tema', async () => {
  mockPaginaHostalRows = [{ ...PAGINA_ACTIVA, plantilla: 'huella', color_acento: 'ocre' }];
  renderPagina('albergue-demo-galicia');

  await waitFor(() => expect(screen.getByTestId('pagina-hostal-page')).toBeInTheDocument());
  const footer = screen.getByTestId('huella-footer');
  expect(footer.className).toContain('border-gray-200');
  expect(screen.getByText(/sin comisiones/i)).toBeInTheDocument();
  const img = screen.getByTestId('pagina-hostal-galeria').querySelector('img');
  expect(img.className).toContain('huella-img');
});

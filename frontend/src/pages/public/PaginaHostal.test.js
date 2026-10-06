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

/**
 * Tests de la sección "Página web pública" de Configuracion.jsx — TDD de la
 * parte de dashboard de la tarea plantilla-piloto (migración 023).
 * lib/supabase mockeado siguiendo el patrón de Dashboard.test.js, más un
 * mock de storage para la subida de fotos al bucket hostales-fotos.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import Configuracion from './Configuracion';

let mockSignedIn = true;
let mockHostalUpdateResult = null;
const mockHostalUpdates = [];
const mockStorageUploads = [];

jest.mock('../lib/supabase', () => {
  const HOSTAL = {
    id: 'h1', name: 'Albergue Demo Galicia', slug: 'albergue-demo-galicia',
    base_price: 14, modo_directo: false, address: 'Calle Demo 3', phone: '', email: '',
    descripcion_larga: 'Descripción inicial', fotos: ['https://cdn.test/h1/fachada.jpg'],
    color_acento: 'ocre', plantilla: 'piloto_a', pagina_web_activa: false,
  };
  const HOSTALERO = { id: 'u1', hostal_id: 'h1', email: 'd@demo.es', nombre: 'Demo', rol: 'Director' };
  const FIXTURES = { hostaleros: [HOSTALERO], hostales: [HOSTAL] };
  const makeThenable = (result) => ({ then: (resolve) => Promise.resolve(result).then(resolve) });
  const chain = (table) => {
    const rows = FIXTURES[table] ?? [];
    const builder = {
      select: () => builder, eq: () => builder, neq: () => builder, not: () => builder,
      is: () => builder, in: () => builder, order: () => builder, limit: () => builder,
      insert: () => builder,
      update: (updates) => {
        if (table === 'hostales') mockHostalUpdates.push(updates);
        return builder;
      },
      upsert: () => builder, delete: () => builder,
      single: () => makeThenable({ data: rows[0] ?? null, error: null }),
      then: (resolve) => {
        const result = table === 'hostales' && mockHostalUpdateResult
          ? mockHostalUpdateResult
          : { data: rows, error: null };
        return Promise.resolve(result).then(resolve);
      },
    };
    return builder;
  };
  return {
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: mockSignedIn ? { user: { id: 'u1' }, access_token: 'tok-test' } : null },
          error: null,
        }),
        signInWithPassword: async () => ({ data: { user: { id: 'u1' } }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: (table) => chain(table),
      rpc: () => makeThenable({ data: [], error: null }),
      storage: {
        from: (bucket) => ({
          upload: async (path, file) => {
            mockStorageUploads.push({ bucket, path, file });
            return { data: { path }, error: null };
          },
          remove: async () => ({ data: [], error: null }),
          getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
        }),
      },
    },
  };
});

beforeEach(() => {
  mockSignedIn = true;
  mockHostalUpdateResult = null;
  mockHostalUpdates.length = 0;
  mockStorageUploads.length = 0;
  localStorage.clear();
});

test('la sección Página web pública muestra los valores actuales del hostal', async () => {
  renderWithProviders(<Configuracion />);

  await waitFor(() => expect(screen.getByTestId('pagina-web-card')).toBeInTheDocument(), { timeout: 5000 });
  await waitFor(() =>
    expect(screen.getByTestId('pagina-web-descripcion-input')).toHaveValue('Descripción inicial')
  );
  expect(screen.getByTestId('pagina-web-color-select')).toHaveValue('ocre');
  expect(screen.getByTestId('pagina-web-activa-toggle')).toBeInTheDocument();
  expect(screen.getByTestId('pagina-web-foto-0')).toBeInTheDocument();
});

test('guardar persiste descripción, color y fotos vía update del hostal', async () => {
  renderWithProviders(<Configuracion />);

  await waitFor(() =>
    expect(screen.getByTestId('pagina-web-descripcion-input')).toHaveValue('Descripción inicial')
  );

  await waitFor(() => expect(screen.getByTestId('pagina-web-descripcion-input')).toBeInTheDocument(), { timeout: 5000 });
  fireEvent.change(screen.getByTestId('pagina-web-descripcion-input'), {
    target: { value: 'Nueva descripción del albergue' },
  });
  fireEvent.change(screen.getByTestId('pagina-web-color-select'), { target: { value: 'verde' } });
  fireEvent.click(screen.getByTestId('pagina-web-save-button'));

  await waitFor(() =>
    expect(mockHostalUpdates).toContainEqual(
      expect.objectContaining({
        descripcion_larga: 'Nueva descripción del albergue',
        color_acento: 'verde',
        fotos: ['https://cdn.test/h1/fachada.jpg'],
      })
    )
  );
});

test('guardar con error de Supabase muestra toast de error, no de éxito', async () => {
  renderWithProviders(<Configuracion />);

  await waitFor(() =>
    expect(screen.getByTestId('pagina-web-descripcion-input')).toHaveValue('Descripción inicial')
  );

  mockHostalUpdateResult = { data: null, error: { message: 'permission denied' } };
  fireEvent.change(screen.getByTestId('pagina-web-descripcion-input'), {
    target: { value: 'Otra descripción' },
  });
  fireEvent.click(screen.getByTestId('pagina-web-save-button'));

  await waitFor(() =>
    expect(screen.getByTestId('toast-notification')).toHaveTextContent('No se pudieron guardar los cambios')
  );
});

test('guardar con 0 filas afectadas (RLS) muestra toast de error, no de éxito', async () => {
  renderWithProviders(<Configuracion />);

  await waitFor(() =>
    expect(screen.getByTestId('pagina-web-descripcion-input')).toHaveValue('Descripción inicial')
  );

  mockHostalUpdateResult = { data: [], error: null };
  fireEvent.change(screen.getByTestId('pagina-web-descripcion-input'), {
    target: { value: 'Otra descripción más' },
  });
  fireEvent.click(screen.getByTestId('pagina-web-save-button'));

  await waitFor(() =>
    expect(screen.getByTestId('toast-notification')).toHaveTextContent('No se pudieron guardar los cambios')
  );
});

test('guardar persiste la plantilla elegida', async () => {
  renderWithProviders(<Configuracion />);

  await waitFor(() =>
    expect(screen.getByTestId('pagina-web-descripcion-input')).toHaveValue('Descripción inicial')
  );
  expect(screen.getByTestId('pagina-web-plantilla-select')).toHaveValue('piloto_a');

  fireEvent.change(screen.getByTestId('pagina-web-plantilla-select'), { target: { value: 'piloto_b' } });
  fireEvent.click(screen.getByTestId('pagina-web-save-button'));

  await waitFor(() =>
    expect(mockHostalUpdates).toContainEqual(expect.objectContaining({ plantilla: 'piloto_b' }))
  );
});

test('activar el toggle persiste pagina_web_activa=true', async () => {
  renderWithProviders(<Configuracion />);

  await waitFor(() =>
    expect(screen.getByTestId('pagina-web-descripcion-input')).toHaveValue('Descripción inicial')
  );

  await waitFor(() => expect(screen.getByTestId('pagina-web-activa-toggle')).toBeInTheDocument(), { timeout: 5000 });
  fireEvent.click(screen.getByTestId('pagina-web-activa-toggle'));

  await waitFor(() =>
    expect(mockHostalUpdates).toContainEqual(expect.objectContaining({ pagina_web_activa: true }))
  );
});

test('subir una foto la añade a la carpeta del hostal en el bucket hostales-fotos', async () => {
  renderWithProviders(<Configuracion />);

  await waitFor(() =>
    expect(screen.getByTestId('pagina-web-descripcion-input')).toHaveValue('Descripción inicial')
  );

  await waitFor(() => expect(screen.getByTestId('pagina-web-foto-upload-input')).toBeInTheDocument(), { timeout: 5000 });
  const file = new File(['bytes'], 'comedor.jpg', { type: 'image/jpeg' });
  fireEvent.change(screen.getByTestId('pagina-web-foto-upload-input'), { target: { files: [file] } });

  await waitFor(() =>
    expect(mockStorageUploads).toContainEqual(
      expect.objectContaining({ bucket: 'hostales-fotos', path: expect.stringMatching(/^h1\//) })
    )
  );
  // La URL pública de la foto subida queda persistida en el array fotos.
  await waitFor(() =>
    expect(mockHostalUpdates).toContainEqual(
      expect.objectContaining({ fotos: expect.arrayContaining([expect.stringContaining('comedor.jpg')]) })
    )
  );
});

/**
 * Test de REGRESIÓN de Web.jsx (/web?hostel=<slug>) — se escribe ANTES de
 * extraer el flujo de reserva a components/public/ReservaDirecta.jsx y debe
 * pasar idéntico antes y después de la extracción. Si la extracción cambia
 * el comportamiento observable de Web.jsx, este test lo canta.
 */
import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../../test-utils';
import Web from './Web';

let mockCreatePublicBookingCalls = [];
let mockCreatePublicBookingRoomCalls = [];
let mockRooms = [];

jest.mock('../../lib/supabase', () => {
  const makeThenable = (result) => ({ then: (resolve) => Promise.resolve(result).then(resolve) });
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: () => {
        throw new Error('Web no debe hacer SELECT directo: solo RPCs públicas');
      },
      rpc: (fn, params) => {
        if (fn === 'get_hostal_by_slug') {
          return {
            single: () =>
              makeThenable({
                data: { name: 'Albergue Demo Norte', base_price: 15, modo_directo: false },
                error: null,
              }),
          };
        }
        if (fn === 'get_beds_by_hostal_slug') {
          return makeThenable({
            data: [
              { label: '1A', status: 'free' },
              { label: '1B', status: 'free' },
              { label: '2A', status: 'occupied' },
            ],
            error: null,
          });
        }
        if (fn === 'get_rooms_by_hostal_slug') {
          return makeThenable({ data: mockRooms, error: null });
        }
        if (fn === 'create_public_booking') {
          mockCreatePublicBookingCalls.push(params);
          return makeThenable({ data: { exito: true }, error: null });
        }
        if (fn === 'create_public_booking_room') {
          mockCreatePublicBookingRoomCalls.push(params);
          return makeThenable({ data: { exito: true }, error: null });
        }
        return makeThenable({ data: [], error: null });
      },
    },
  };
});

beforeEach(() => {
  mockCreatePublicBookingCalls = [];
  mockCreatePublicBookingRoomCalls = [];
  mockRooms = [];
});

function renderWeb() {
  return renderWithProviders(
    <Routes>
      <Route path="/web" element={<Web />} />
    </Routes>,
    { initialEntries: ['/web?hostel=albergue-demo-norte'] }
  );
}

function rellenarFormularioCama() {
  fireEvent.change(screen.getByTestId('public-booking-name-input'), { target: { value: 'Peregrino Test' } });
  fireEvent.change(screen.getByTestId('public-booking-email-input'), { target: { value: 'peregrino@test.es' } });
  fireEvent.change(screen.getByTestId('public-booking-phone-input'), { target: { value: '600123456' } });
  fireEvent.change(screen.getByTestId('public-booking-document-input'), { target: { value: 'X1234567' } });
  fireEvent.change(screen.getByTestId('public-booking-nationality-input'), { target: { value: 'ES' } });
  fireEvent.click(screen.getByTestId('public-booking-conditions-checkbox'));
}

test('flujo completo de reserva de cama: disponibilidad → selección → formulario → confirmación', async () => {
  renderWeb();

  await waitFor(() =>
    expect(screen.getByTestId('public-booking-title')).toHaveTextContent('Albergue Demo Norte')
  );

  fireEvent.click(screen.getByTestId('availability-check-button'));

  // Solo se ofrecen camas libres; la ocupada no aparece.
  await waitFor(() => expect(screen.getByTestId('available-beds-list')).toBeInTheDocument());
  expect(screen.getByTestId('available-bed-1A')).toBeInTheDocument();
  expect(screen.queryByTestId('available-bed-2A')).not.toBeInTheDocument();

  fireEvent.click(screen.getByTestId('reserve-bed-button-1A'));
  await waitFor(() => expect(screen.getByTestId('public-booking-form')).toBeInTheDocument());

  rellenarFormularioCama();
  fireEvent.click(screen.getByTestId('public-booking-submit-button'));

  await waitFor(() => expect(screen.getByTestId('public-booking-success-screen')).toBeInTheDocument());

  expect(mockCreatePublicBookingCalls).toHaveLength(1);
  expect(mockCreatePublicBookingCalls[0]).toMatchObject({
    p_slug: 'albergue-demo-norte',
    p_bed_label: '1A',
    p_guest_name: 'Peregrino Test',
    p_guest_email: 'peregrino@test.es',
    p_guest_nationality: 'ES',
  });
  expect(mockCreatePublicBookingRoomCalls).toHaveLength(0);
});

test('flujo completo de reserva de habitación privada', async () => {
  mockRooms = [{ name: '1', status: 'free', price_per_night: 40, capacity: 2 }];
  renderWeb();

  await waitFor(() =>
    expect(screen.getByTestId('public-booking-title')).toHaveTextContent('Albergue Demo Norte')
  );

  fireEvent.click(screen.getByTestId('availability-check-button'));

  await waitFor(() => expect(screen.getByTestId('available-rooms-list')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('reserve-room-button-1'));

  await waitFor(() => expect(screen.getByTestId('public-room-booking-form')).toBeInTheDocument());
  fireEvent.change(screen.getByTestId('public-room-booking-name-input'), { target: { value: 'Peregrino Test' } });
  fireEvent.change(screen.getByTestId('public-room-booking-email-input'), { target: { value: 'peregrino@test.es' } });
  fireEvent.change(screen.getByTestId('public-room-booking-nationality-input'), { target: { value: 'ES' } });
  fireEvent.click(screen.getByTestId('public-room-booking-conditions-checkbox'));
  fireEvent.click(screen.getByTestId('public-room-booking-submit-button'));

  await waitFor(() => expect(screen.getByTestId('public-booking-success-screen')).toBeInTheDocument());

  expect(mockCreatePublicBookingRoomCalls).toHaveLength(1);
  expect(mockCreatePublicBookingRoomCalls[0]).toMatchObject({
    p_slug: 'albergue-demo-norte',
    p_room_name: '1',
    p_guest_name: 'Peregrino Test',
    p_guest_email: 'peregrino@test.es',
    p_guest_nationality: 'ES',
  });
  expect(mockCreatePublicBookingCalls).toHaveLength(0);
});

test('validación: sin condiciones aceptadas no se envía la reserva', async () => {
  renderWeb();

  await waitFor(() =>
    expect(screen.getByTestId('public-booking-title')).toHaveTextContent('Albergue Demo Norte')
  );
  fireEvent.click(screen.getByTestId('availability-check-button'));
  await waitFor(() => expect(screen.getByTestId('reserve-bed-button-1A')).toBeInTheDocument());
  fireEvent.click(screen.getByTestId('reserve-bed-button-1A'));

  await waitFor(() => expect(screen.getByTestId('public-booking-form')).toBeInTheDocument());
  fireEvent.change(screen.getByTestId('public-booking-name-input'), { target: { value: 'Peregrino Test' } });
  fireEvent.change(screen.getByTestId('public-booking-email-input'), { target: { value: 'peregrino@test.es' } });
  fireEvent.change(screen.getByTestId('public-booking-phone-input'), { target: { value: '600123456' } });
  fireEvent.change(screen.getByTestId('public-booking-document-input'), { target: { value: 'X1234567' } });
  fireEvent.change(screen.getByTestId('public-booking-nationality-input'), { target: { value: 'ES' } });
  fireEvent.click(screen.getByTestId('public-booking-submit-button'));

  await waitFor(() =>
    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument()
  );
  expect(mockCreatePublicBookingCalls).toHaveLength(0);
});

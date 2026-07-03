import React, { createContext, useContext, useEffect, useState } from 'react';
import { guests as mockGuests } from '../data/guests';
import { reservations as mockReservations } from '../data/reservations';
import { employees as mockEmployees } from '../data/employees';
import { rooms as mockRooms } from '../data/rooms';
import { beds as mockBeds } from '../data/beds';
import { maiaNotifications } from '../data/maia';

const STORAGE_KEY = 'bunkerhostal_state';

const initialState = {
  session: null, // { hostel, role, employeeName }
  guests: mockGuests,
  reservations: mockReservations,
  rooms: mockRooms,
  beds: mockBeds,
  employees: mockEmployees,
  tasks: [],
  notifications: maiaNotifications,
  integrations: {
    booking: 'desconectado',
    airbnb: 'desconectado',
    stripe: 'desconectado',
    sesHospedajes: 'desconectado',
  },
  modoDirecto: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...initialState, ...parsed };
    }
  } catch (e) {
    // ignore malformed storage, fall back to initial mock state
  }
  return initialState;
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = (hostel, role, employeeName) => {
    setState((prev) => ({ ...prev, session: { hostel, role, employeeName } }));
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...initialState, session: null });
  };

  const addReservation = (reservation) => {
    setState((prev) => ({
      ...prev,
      reservations: [{ ...reservation, id: Date.now(), status: 'pendiente' }, ...prev.reservations],
    }));
  };

  // Completes the 3-step check-in: creates the active guest, marks the
  // reservation as completed and occupies the assigned bed.
  const checkInReservation = (reservationId, guestDetails) => {
    setState((prev) => {
      const reservation = prev.reservations.find((r) => String(r.id) === String(reservationId));
      if (!reservation) return prev;
      const newGuestId = Date.now();
      const newGuest = {
        id: newGuestId,
        name: guestDetails.name || reservation.guestName,
        document: guestDetails.document || '',
        nationality: guestDetails.nationality || reservation.nationality,
        dob: guestDetails.dob || '',
        phone: guestDetails.phone || reservation.phone || '',
        email: guestDetails.email || reservation.email || '',
        bedId: reservation.bed,
        checkin: reservation.checkin,
        checkout: reservation.checkout,
        price: reservation.price,
        origin: reservation.origin,
        paymentStatus: 'pagado',
        loyaltyPoints: Math.round(reservation.price),
      };
      return {
        ...prev,
        guests: [...prev.guests, newGuest],
        reservations: prev.reservations.map((r) =>
          String(r.id) === String(reservationId)
            ? { ...r, status: 'checkin_completado', guestId: newGuestId }
            : r
        ),
        beds: prev.beds.map((b) =>
          b.id === reservation.bed ? { ...b, status: 'occupied', guestId: newGuestId } : b
        ),
      };
    });
  };

  const checkOutGuest = (guestId) => {
    setState((prev) => {
      const guest = prev.guests.find((g) => g.id === guestId);
      return {
        ...prev,
        guests: prev.guests.filter((g) => g.id !== guestId),
        beds: prev.beds.map((b) =>
          guest && b.id === guest.bedId ? { ...b, status: 'free', guestId: null } : b
        ),
      };
    });
  };

  const sendPaymentLink = (guestId) => {
    setState((prev) => ({
      ...prev,
      guests: prev.guests.map((g) =>
        g.id === guestId ? { ...g, lastPaymentLinkSentAt: new Date().toISOString() } : g
      ),
    }));
  };

  // Public /web booking flow: adds a guest, a "Directo" reservation and
  // occupies the selected bed immediately in Context.
  const addPublicBooking = ({ bedId, guest, checkin, checkout, price }) => {
    setState((prev) => {
      const newGuestId = Date.now();
      const newGuest = {
        id: newGuestId,
        ...guest,
        bedId,
        checkin,
        checkout,
        price,
        origin: 'Directo',
        paymentStatus: 'pagado',
        loyaltyPoints: Math.round(price),
      };
      const newReservation = {
        id: Date.now() + 1,
        guestName: guest.name,
        nationality: guest.nationality,
        checkin,
        checkout,
        bed: bedId,
        room: Number(String(bedId).charAt(0)),
        price,
        origin: 'Directo',
        status: 'checkin_completado',
        guestId: newGuestId,
      };
      return {
        ...prev,
        guests: [...prev.guests, newGuest],
        reservations: [newReservation, ...prev.reservations],
        beds: prev.beds.map((b) =>
          b.id === bedId ? { ...b, status: 'occupied', guestId: newGuestId } : b
        ),
      };
    });
  };

  const value = {
    ...state,
    login,
    logout,
    addReservation,
    checkInReservation,
    checkOutGuest,
    sendPaymentLink,
    addPublicBooking,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { guests as mockGuests } from '../data/guests';
import { reservations as mockReservations } from '../data/reservations';
import { employees as mockEmployees } from '../data/employees';
import { rooms as mockRooms } from '../data/rooms';
import { beds as mockBeds } from '../data/beds';
import { tasks as mockTasks } from '../data/tasks';
import { communicationTemplates as mockTemplates } from '../data/communications';
import { marketplaceServices as mockMarketplaceServices } from '../data/marketplace';
import { maiaNotifications } from '../data/maia';
import { addMinutes, formatTime } from '../utils/format';

const STORAGE_KEY = 'bunkerhostal_state';
const EXTERNAL_CHANNEL_KEYS = ['bookingcom', 'airbnb', 'hostelworld'];

const initialState = {
  session: null, // { hostel, role, employeeName }
  guests: mockGuests,
  reservations: mockReservations,
  rooms: mockRooms,
  beds: mockBeds,
  employees: mockEmployees,
  tasks: mockTasks,
  notifications: maiaNotifications,
  communicationTemplates: mockTemplates,
  marketplaceServices: mockMarketplaceServices,
  integrations: {
    bookingcom: true,
    airbnb: true,
    hostelworld: false,
    stripe: true,
    sesHospedajes: true,
  },
  channelSync: {
    bookingcom: addMinutes(new Date(), -8).toISOString(),
    airbnb: addMinutes(new Date(), -12).toISOString(),
    hostelworld: null,
  },
  modoDirecto: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...initialState, ...parsed };
      // Safety-net for the Phase 1 -> Phase 2 shape migration (old sessions may
      // have an outdated `integrations`/missing `channelSync`/`tasks` shape).
      if (!parsed.integrations || typeof parsed.integrations.bookingcom === 'undefined') {
        merged.integrations = initialState.integrations;
      }
      if (!parsed.channelSync) merged.channelSync = initialState.channelSync;
      if (!parsed.tasks) merged.tasks = initialState.tasks;
      if (!parsed.communicationTemplates) merged.communicationTemplates = initialState.communicationTemplates;
      if (!parsed.marketplaceServices) merged.marketplaceServices = initialState.marketplaceServices;
      return merged;
    }
  } catch (e) {
    // ignore malformed storage, fall back to initial mock state
  }
  return initialState;
}

const AppContext = createContext(null);

function syncConnectedChannels(prev) {
  const now = new Date().toISOString();
  const nextSync = { ...prev.channelSync };
  EXTERNAL_CHANNEL_KEYS.forEach((key) => {
    if (prev.integrations[key]) nextSync[key] = now;
  });
  return nextSync;
}

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

  // --- Phase 2: Channel Manager / Modo Directo ---
  const toggleChannel = (channelId) => {
    setState((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, [channelId]: !prev.integrations[channelId] },
    }));
  };

  const disconnectIntegration = (key) => {
    setState((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, [key]: false },
    }));
  };

  const setModoDirecto = (value) => {
    setState((prev) => ({ ...prev, modoDirecto: value }));
  };

  const syncChannels = () => {
    setState((prev) => ({ ...prev, channelSync: syncConnectedChannels(prev) }));
  };

  // --- Phase 2: Fichaje equipo ---
  const clockIn = (employeeId) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === employeeId
          ? { ...e, clockedIn: true, clockInTime: formatTime(new Date()), clockOutTime: null, verification: 'wifi' }
          : e
      ),
    }));
  };

  const clockOut = (employeeId) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === employeeId ? { ...e, clockedIn: false, clockOutTime: formatTime(new Date()) } : e
      ),
    }));
  };

  // --- Phase 2: Limpieza / tareas ---
  const markTaskDone = (taskId) => {
    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'done', completedAt: new Date().toISOString() } : t
        ),
        rooms: prev.rooms.map((r) => (r.id === task.roomId ? { ...r, status: 'clean' } : r)),
      };
    });
    // Mock external channel sync triggered by the newly cleaned room.
    setTimeout(() => {
      setState((prev) => ({ ...prev, channelSync: syncConnectedChannels(prev) }));
    }, 1000);
  };

  const updateRoomStatus = (roomId, status) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, status } : r)),
    }));
    if (status === 'clean') {
      setTimeout(() => {
        setState((prev) => ({ ...prev, channelSync: syncConnectedChannels(prev) }));
      }, 1000);
    }
  };

  const assignTask = ({ roomId, employeeName, notes }) => {
    setState((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        { id: Date.now(), roomId, employeeName, priority: 'normal', status: 'pending', completedAt: null, notes: notes || '' },
      ],
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, status: 'dirty', assignedTo: employeeName } : r)),
    }));
  };

  // --- Phase 2: MaiA ---
  const markNotificationRead = (id) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  };

  // --- Phase 2: Comunicaciones ---
  const saveTemplate = (templateId, updates) => {
    setState((prev) => ({
      ...prev,
      communicationTemplates: prev.communicationTemplates.map((t) =>
        t.id === templateId ? { ...t, ...updates } : t
      ),
    }));
  };

  const toggleTemplateActive = (templateId) => {
    setState((prev) => ({
      ...prev,
      communicationTemplates: prev.communicationTemplates.map((t) =>
        t.id === templateId ? { ...t, active: !t.active } : t
      ),
    }));
  };

  // --- Phase 2: Configuración ---
  const addEmployee = ({ name, role, pin }) => {
    setState((prev) => ({
      ...prev,
      employees: [
        ...prev.employees,
        { id: Date.now(), name, role, pin, clockedIn: false, clockInTime: null, clockOutTime: null, verification: null },
      ],
    }));
  };

  const updateHostelInfo = (updates) => {
    setState((prev) => ({
      ...prev,
      session: prev.session ? { ...prev.session, hostel: { ...prev.session.hostel, ...updates } } : prev.session,
    }));
  };

  // --- Phase 3: Marketplace ---
  const addMarketplaceService = (service) => {
    setState((prev) => ({
      ...prev,
      marketplaceServices: [...prev.marketplaceServices, { ...service, id: Date.now() }],
    }));
  };

  const updateMarketplaceService = (serviceId, updates) => {
    setState((prev) => ({
      ...prev,
      marketplaceServices: prev.marketplaceServices.map((s) =>
        s.id === serviceId ? { ...s, ...updates } : s
      ),
    }));
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
    toggleChannel,
    disconnectIntegration,
    setModoDirecto,
    syncChannels,
    clockIn,
    clockOut,
    markTaskDone,
    updateRoomStatus,
    assignTask,
    markNotificationRead,
    saveTemplate,
    toggleTemplateActive,
    addEmployee,
    updateHostelInfo,
    addMarketplaceService,
    updateMarketplaceService,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

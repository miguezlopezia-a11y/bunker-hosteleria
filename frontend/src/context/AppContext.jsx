import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { addMinutes, formatDate, startOfDay } from '../utils/format';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import { hostalesService } from '../services/hostalesService';
import { roomsService } from '../services/roomsService';
import { bedsService } from '../services/bedsService';
import { reservationsService } from '../services/reservationsService';
import { guestsService } from '../services/guestsService';
import { employeesService } from '../services/employeesService';
import { hostalerosService } from '../services/hostalerosService';
import { fichajesService } from '../services/fichajesService';
import { cleaningTasksService } from '../services/cleaningTasksService';
import { marketplaceService } from '../services/marketplaceService';
import { loyaltyService } from '../services/loyaltyService';
import { notificationsService } from '../services/notificationsService';
import { reviewRequestsService } from '../services/reviewRequestsService';
import { sendEmail } from '../lib/email';
import { buildHostalContext } from '../lib/maiaContext';
import { runMaiaModules, getMockAnswer } from '../lib/maiaEngine';
import { maiaChat } from '../lib/maiaChat';
import { sendCriticalAlert } from '../lib/maiaCriticalAlert';
import {
  buildRoomIndexMap,
  buildBedLabelMap,
  buildActiveGuestBedMap,
  buildEmployeeState,
  mapHostel,
  mapRoom,
  mapBed,
  mapReservation,
  mapGuest,
  mapTask,
  mapNotification,
  mapMarketplaceService,
  mapLoyaltyMember,
  toReservationInput,
  toGuestInput,
  toDateString,
  buildBedIdByLabelMap,
} from '../utils/mappers';

const STORAGE_KEY = 'bunkerhostal_session';
const LEGACY_STORAGE_KEY = 'bunkerhostal_state';
const EXTERNAL_CHANNEL_KEYS = ['bookingcom', 'airbnb', 'hostelworld'];
const PERSISTED_KEYS = ['session', 'modoDirecto', 'integrations', 'channelSync'];

const initialState = {
  session: null,
  guests: [],
  reservations: [],
  rooms: [],
  beds: [],
  employees: [],
  tasks: [],
  fichajes: [],
  notifications: [],
  communicationTemplates: [],
  marketplaceServices: [],
  loyalty: [],
  reviewRequests: [],
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
  loading: true,
  error: null,
};

function loadState() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    // ignore
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...initialState, ...parsed };
      if (!parsed.integrations || typeof parsed.integrations.bookingcom === 'undefined') {
        merged.integrations = initialState.integrations;
      }
      if (!parsed.channelSync) merged.channelSync = initialState.channelSync;
      return merged;
    }
  } catch (e) {
    // ignore malformed storage
  }
  return initialState;
}

function syncConnectedChannels(prev) {
  const now = new Date().toISOString();
  const nextSync = { ...prev.channelSync };
  EXTERNAL_CHANNEL_KEYS.forEach((key) => {
    if (prev.integrations[key]) nextSync[key] = now;
  });
  return nextSync;
}

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState);

  const setLoading = useCallback((loading) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const loadCoreData = useCallback(async (hostalId) => {
    if (!hostalId) return;
    setLoading(true);
    setError(null);
    try {
      const [
        { data: dbRooms, error: roomsError },
        { data: dbBeds, error: bedsError },
        { data: dbReservations, error: reservationsError },
        { data: dbGuests, error: guestsError },
        { data: dbHostaleros, error: hostalerosError },
        { data: dbFichajes, error: fichajesError },
        { data: dbTasks, error: tasksError },
        { data: dbMarketplace, error: marketplaceError },
        { data: dbNotifications, error: notificationsError },
        { data: dbLoyalty, error: loyaltyError },
        { data: dbReviewRequests, error: reviewRequestsError },
      ] = await Promise.all([
        roomsService.listByHostal(hostalId),
        bedsService.listByHostal(hostalId),
        reservationsService.listByHostal(hostalId),
        guestsService.listByHostal(hostalId),
        hostalerosService.listByHostal(hostalId),
        fichajesService.listByHostal(hostalId),
        cleaningTasksService.listByHostal(hostalId),
        marketplaceService.listByHostal(hostalId),
        notificationsService.listByHostal(hostalId),
        loyaltyService.listByHostal(hostalId),
        reviewRequestsService.listByHostal(hostalId),
      ]);

      const anyError =
        roomsError ||
        bedsError ||
        reservationsError ||
        guestsError ||
        hostalerosError ||
        fichajesError ||
        tasksError ||
        marketplaceError ||
        notificationsError ||
        loyaltyError ||
        reviewRequestsError;

      if (anyError) {
        throw new Error('Error cargando datos del hostal');
      }

      const roomIndexMap = buildRoomIndexMap(dbRooms);
      const roomDbIdMap = new Map(dbRooms.map((r) => [r.id, roomIndexMap.get(r.id)]));
      const bedLabelMap = buildBedLabelMap(dbBeds);
      const activeGuestBedMap = buildActiveGuestBedMap(dbGuests);
      const employeeNameMap = new Map((dbHostaleros || []).map((h) => [h.id, h.nombre || h.email]));

      const rooms = dbRooms.map((room, index) =>
        mapRoom(room, index + 1, dbBeds.filter((b) => b.room_id === room.id))
      );
      const beds = dbBeds.map((bed) => {
        const roomIndex = roomIndexMap.get(bed.room_id);
        return mapBed(bed, roomIndex, activeGuestBedMap.get(bed.id));
      });
      const reservations = dbReservations.map((r) => mapReservation(r, roomIndexMap, bedLabelMap));
      const guests = dbGuests.map((g) => mapGuest(g, bedLabelMap));
      const employees = buildEmployeeState(dbHostaleros || [], dbFichajes || []);
      const tasks = (dbTasks || []).map((t) => mapTask(t, roomDbIdMap, employeeNameMap));
      const notifications = (dbNotifications || []).map(mapNotification);
      const marketplaceServices = (dbMarketplace || []).map(mapMarketplaceService);
      const loyalty = (dbLoyalty || []).map(mapLoyaltyMember);
      const reviewRequests = dbReviewRequests || [];

      setState((prev) => ({
        ...prev,
        rooms,
        beds,
        reservations,
        guests,
        employees,
        tasks,
        fichajes: dbFichajes || [],
        notifications,
        marketplaceServices,
        loyalty,
        reviewRequests,
        session: prev.session
          ? {
              ...prev.session,
              hostel: mapHostel(prev.session.hostelRaw, dbBeds.length),
            }
          : null,
        loading: false,
      }));
    } catch (err) {
      // ignore - error is already surfaced via state.error
      setState((prev) => ({ ...prev, loading: false, error: 'No se pudieron cargar los datos.' }));
    }
  }, [setLoading, setError]);

  const setSession = useCallback((session) => {
    setState((prev) => ({ ...prev, session }));
  }, []);

  const logoutLocal = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...initialState, loading: false });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: authData, error: sessionError } = await authService.getSession();
      if (sessionError || !authData.session?.user) {
        logoutLocal();
        return;
      }
      const user = authData.session.user;
      const { data: hostalero, error: hostaleroError } = await authService.getHostalero(user.id);
      if (hostaleroError || !hostalero) {
        logoutLocal();
        return;
      }
      const { data: hostel, error: hostelError } = await hostalesService.getById(hostalero.hostal_id);
      if (hostelError || !hostel) {
        logoutLocal();
        return;
      }

      setSession({
        user,
        hostel: mapHostel(hostel, 0),
        hostelRaw: hostel,
        role: hostalero.rol,
        employeeId: hostalero.id,
        employeeName: hostalero.nombre,
      });

      setState((prev) => ({
        ...prev,
        modoDirecto: hostel.modo_directo ?? false,
      }));

      await loadCoreData(hostel.id);
    } catch (err) {
      logoutLocal();
    }
  }, [loadCoreData, setSession, logoutLocal]);

  const logout = useCallback(async () => {
    await authService.signOut();
    logoutLocal();
  }, [logoutLocal]);

  useEffect(() => {
    refreshSession();
    const { data: listener } = authService.onAuthStateChange((_event, authSession) => {
      if (authSession?.user) {
        refreshSession();
      } else {
        logoutLocal();
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshSession, logoutLocal]);

  useEffect(() => {
    const toSave = {};
    PERSISTED_KEYS.forEach((key) => {
      if (key === 'session' && state.session) {
        // No persistimos el objeto user de Supabase
        toSave[key] = {
          hostel: state.session.hostel,
          role: state.session.role,
          employeeId: state.session.employeeId,
          employeeName: state.session.employeeName,
        };
      } else {
        toSave[key] = state[key];
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state.session, state.modoDirecto, state.integrations, state.channelSync]);

  // --- Supabase Realtime: notificaciones MaiA ---
  useEffect(() => {
    const hostalId = state.session?.hostelRaw?.id;
    if (!hostalId || typeof supabase.channel !== 'function') return;

    const channel = supabase
      .channel('maia-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `hostal_id=eq.${hostalId}`,
        },
        (payload) => {
          const mapped = mapNotification(payload.new);
          setState((prev) => ({
            ...prev,
            notifications: [mapped, ...prev.notifications].sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.session?.hostelRaw?.id]);

  // --- Auth helpers exposed for Login ---
  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await authService.signIn({ email, password });
    if (error) return { error };
    await refreshSession();
    return { data };
  }, [refreshSession]);

  // --- Core data mutations ---
  const addReservation = useCallback(async (reservation) => {
    const hostalId = state.session?.hostelRaw?.id;
    if (!hostalId) return { error: 'No hay sesión' };

    const bedIdByLabel = buildBedIdByLabelMap(
      state.beds.map((b) => ({ label: b.id, id: b._dbId }))
    );
    const bedId = bedIdByLabel.get(reservation.bed);
    if (!bedId) return { error: 'Cama no válida' };

    const input = toReservationInput(reservation, hostalId, bedId);
    const { data: created, error } = await reservationsService.create(input);
    if (error) return { error: 'No se pudo crear la reserva' };

    const dbReservation = Array.isArray(created) ? created[0] : created;
    if (dbReservation?.guest_email) {
      try {
        await sendEmail({
          to: dbReservation.guest_email,
          template: 'booking_confirmation',
          variables: {
            guestName: dbReservation.guest_name,
            hostalName: state.session?.hostel?.name || 'BunkerHostal',
            checkin: dbReservation.checkin,
            checkout: dbReservation.checkout,
            bedLabel: reservation.bed,
          },
          hostal_id: hostalId,
        });
      } catch (err) {
        // No bloquear la reserva si el email falla
        console.error('Error sending booking confirmation:', err);
      }
    }

    await loadCoreData(hostalId);
    return { error: null };
  }, [loadCoreData, state.session, state.beds]);

  const checkInReservation = useCallback(async (reservationId, guestDetails) => {
    const hostalId = state.session?.hostelRaw?.id;
    if (!hostalId) return { error: 'No hay sesión' };

    const { data: reservation } = await reservationsService.update(reservationId, { status: 'checkin_completado' });
    if (!reservation || reservation.length === 0) return { error: 'Reserva no encontrada' };

    const dbReservation = Array.isArray(reservation) ? reservation[0] : reservation;
    const guestInput = toGuestInput(
      {
        ...guestDetails,
        checkin: dbReservation.checkin,
        checkout: dbReservation.checkout,
        price: dbReservation.price,
        origin: dbReservation.channel,
        paymentStatus: 'pagado',
        loyaltyPoints: Math.round(Number(dbReservation.price)),
      },
      hostalId,
      dbReservation.id,
      dbReservation.bed_id
    );

    const { error: guestError } = await guestsService.create(guestInput);
    if (guestError) return { error: 'No se pudo registrar el huésped' };

    const { error: bedError } = await bedsService.update(dbReservation.bed_id, { status: 'occupied' });
    if (bedError) return { error: 'No se pudo ocupar la cama' };

    await loadCoreData(hostalId);
    return { error: null };
  }, [loadCoreData, state.session]);

  // --- Phase E: MaiA helper ---
  const insertNotification = useCallback(
    async ({ type, message, dedupKey, critical }) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const { error } = await notificationsService.create({
        hostal_id: hostalId,
        type,
        message,
        dedup_key: dedupKey || undefined,
      });
      if (error) return { error: 'No se pudo crear la notificación' };

      if (critical && type === 'alerta') {
        // No bloquear si el email falla
        sendCriticalAlert({ message, hostalId }).catch((err) => console.error('Critical alert email failed:', err));
      }

      return { error: null };
    },
    [state.session]
  );

  const cancelReservation = useCallback(
    async (reservationId) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const reservation = state.reservations.find((r) => r.id === reservationId);
      if (!reservation) return { error: 'Reserva no encontrada' };

      const { error } = await reservationsService.update(reservationId, { status: 'cancelada' });
      if (error) return { error: 'No se pudo cancelar la reserva' };

      const { data: recentCancellations } = await supabase
        .from('reservations')
        .select('*')
        .eq('hostal_id', hostalId)
        .eq('channel', reservation.origin)
        .eq('status', 'cancelada')
        .gte('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const count = (recentCancellations || []).length;
      if (count >= 3) {
        await insertNotification({
          type: 'sugerencia',
          message: `Canal ${reservation.origin}: ${count} cancelaciones en los últimos 30 días. Revisa política de no-show o exige garantía.`,
          dedupKey: `cancel-pattern-${reservation.origin}-${startOfDay(new Date()).toISOString()}`,
        });
      }

      await insertNotification({
        type: 'info',
        message: `Reserva de ${reservation.guestName} (${reservation.origin}) cancelada.`,
        dedupKey: `cancel-${reservationId}`,
      });

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session, state.reservations, insertNotification]
  );

  const checkOutGuest = useCallback(async (guestId) => {
    const hostalId = state.session?.hostelRaw?.id;
    if (!hostalId) return { error: 'No hay sesión' };

    const guest = state.guests.find((g) => g.id === guestId);
    if (!guest) return { error: 'Huésped no encontrado' };

    const { data: dbGuest, error: dbGuestError } = await guestsService.getById(guestId);
    if (dbGuestError || !dbGuest) return { error: 'No se pudo obtener el huésped' };

    const bedIdByLabel = buildBedIdByLabelMap(
      state.beds.map((b) => ({ label: b.id, id: b._dbId }))
    );
    const bedId = bedIdByLabel.get(guest.bedId);

    const { error: guestError } = await guestsService.update(guestId, { bed_id: null });
    if (guestError) return { error: 'No se pudo actualizar el huésped' };

    if (bedId) {
      const { error: bedError } = await bedsService.update(bedId, { status: 'free' });
      if (bedError) return { error: 'No se pudo liberar la cama' };
    }

    let surveyUrl = null;
    let autoSent = false;

    // Interceptor de reseñas (Fase D)
    if (dbGuest.reservation_id && dbGuest.email) {
      try {
        const { data: reviewReq, error: reviewError } = await reviewRequestsService.create({
          hostal_id: hostalId,
          reservation_id: dbGuest.reservation_id,
          guest_name: dbGuest.name,
          guest_email: dbGuest.email,
        });

        if (!reviewError && reviewReq) {
          surveyUrl = `${process.env.REACT_APP_PUBLIC_URL}/survey?token=${reviewReq.token}`;
          const autoSend = state.session?.hostelRaw?.auto_send_survey ?? true;
          if (autoSend) {
            await sendEmail({
              to: dbGuest.email,
              template: 'survey',
              variables: {
                guestName: dbGuest.name,
                hostalName: state.session?.hostel?.name || 'BunkerHostal',
                surveyUrl,
              },
              hostal_id: hostalId,
            });
            await reviewRequestsService.update(reviewReq.id, { sent_at: new Date().toISOString() });
            autoSent = true;
          }
        }
      } catch (err) {
        // No bloquear el checkout si el envío falla
        console.error('Error sending review request:', err);
      }
    }

    await insertNotification({
      type: 'info',
      message: `Checkout completado de ${guest.name}. ${autoSent ? 'Encuesta enviada por email.' : 'Enlace de encuesta disponible para envío manual.'}`,
      dedupKey: `checkout-${guest.id}-${new Date().toISOString().slice(0, 10)}`,
    });

    await loadCoreData(hostalId);
    return { error: null, surveyUrl, autoSent };
  }, [loadCoreData, state.session, state.guests, state.beds, insertNotification]);

  const addPublicBooking = useCallback(async ({ bedId: bedLabel, guest, checkin, checkout, price }) => {
    const hostalId = state.session?.hostelRaw?.id;
    if (!hostalId) return { error: 'No hay sesión' };

    const bedIdByLabel = buildBedIdByLabelMap(
      state.beds.map((b) => ({ label: b.id, id: b._dbId }))
    );
    const bedId = bedIdByLabel.get(bedLabel);
    if (!bedId) return { error: 'Cama no válida' };

    const reservationInput = toReservationInput(
      {
        guestName: guest.name,
        nationality: guest.nationality,
        email: guest.email,
        phone: guest.phone,
        origin: 'Directo',
        checkin,
        checkout,
        price,
        status: 'checkin_completado',
      },
      hostalId,
      bedId
    );

    const { data: reservation, error: resError } = await reservationsService.create(reservationInput);
    if (resError || !reservation) return { error: 'No se pudo crear la reserva' };
    const dbReservation = Array.isArray(reservation) ? reservation[0] : reservation;

    const guestInput = toGuestInput(
      {
        ...guest,
        checkin,
        checkout,
        price,
        origin: 'Directo',
        paymentStatus: 'pagado',
        loyaltyPoints: Math.round(Number(price)),
      },
      hostalId,
      dbReservation.id,
      bedId
    );

    const { error: guestError } = await guestsService.create(guestInput);
    if (guestError) return { error: 'No se pudo registrar el huésped' };

    const { error: bedError } = await bedsService.update(bedId, { status: 'occupied' });
    if (bedError) return { error: 'No se pudo ocupar la cama' };

    if (guest.email) {
      try {
        await sendEmail({
          to: guest.email,
          template: 'booking_confirmation',
          variables: {
            guestName: guest.name,
            hostalName: state.session?.hostel?.name || 'BunkerHostal',
            checkin: toDateString(checkin),
            checkout: toDateString(checkout),
            bedLabel: bedLabel,
          },
          hostal_id: hostalId,
        });
      } catch (err) {
        // No bloquear la reserva si el email falla
        console.error('Error sending booking confirmation:', err);
      }
    }

    await loadCoreData(hostalId);
    return { error: null };
  }, [loadCoreData, state.session, state.beds]);

  const sendPaymentLink = useCallback((guestId) => {
    setState((prev) => ({
      ...prev,
      guests: prev.guests.map((g) =>
        g.id === guestId ? { ...g, lastPaymentLinkSentAt: new Date().toISOString() } : g
      ),
    }));
  }, []);

  // --- Phase 2: Channel Manager / Modo Directo ---
  const toggleChannel = useCallback((channelId) => {
    setState((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, [channelId]: !prev.integrations[channelId] },
    }));
  }, []);

  const disconnectIntegration = useCallback((key) => {
    setState((prev) => ({
      ...prev,
      integrations: { ...prev.integrations, [key]: false },
    }));
  }, []);

  const updateHostelInfo = useCallback(async (updates) => {
    const hostalId = state.session?.hostelRaw?.id;
    if (!hostalId) return;

    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.basePrice !== undefined) dbUpdates.base_price = updates.basePrice;
    if (updates.modoDirecto !== undefined) dbUpdates.modo_directo = updates.modoDirecto;
    if (updates.googleReviewUrl !== undefined) dbUpdates.google_review_url = updates.googleReviewUrl;
    if (updates.bookingReviewUrl !== undefined) dbUpdates.booking_review_url = updates.bookingReviewUrl;
    if (updates.autoSendSurvey !== undefined) dbUpdates.auto_send_survey = updates.autoSendSurvey;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await hostalesService.update(hostalId, dbUpdates);
      if (error) return;
      await refreshSession();
    }

    setState((prev) => ({
      ...prev,
      session: prev.session ? { ...prev.session, hostel: { ...prev.session.hostel, ...updates } } : prev.session,
    }));
  }, [refreshSession, state.session]);

  const setModoDirecto = useCallback(
    async (value) => {
      await updateHostelInfo({ modoDirecto: value });
    },
    [updateHostelInfo]
  );

  const syncChannels = useCallback(() => {
    setState((prev) => ({ ...prev, channelSync: syncConnectedChannels(prev) }));
  }, []);

  // --- Phase 2: Fichaje equipo ---
  const checkLateClockIn = useCallback(
    async (employee, timestamp) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId || !employee?.expectedCheckinTime) return;

      const now = new Date(timestamp);
      const [hours, minutes] = employee.expectedCheckinTime.split(':');
      const expected = new Date(now);
      expected.setHours(Number(hours), Number(minutes), 0, 0);

      if (now > expected) {
        const diffMin = Math.round((now.getTime() - expected.getTime()) / 60000);
        await insertNotification({
          type: 'alerta',
          message: `${employee.name} ha fichado entrada con ${diffMin}min de retraso (esperado ${hours}:${minutes}).`,
          dedupKey: `late-clockin-${employee.id}-${new Date().toISOString().slice(0, 10)}`,
          critical: true,
        });
      }
    },
    [state.session, insertNotification]
  );

  const clockIn = useCallback(
    async (empleadoId) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const employee = state.employees.find((e) => e.id === empleadoId);
      if (!employee) return { error: 'Empleado no encontrado' };

      const doClockIn = async (verificado, coords) => {
        const timestamp = new Date().toISOString();
        const payload = {
          hostal_id: hostalId,
          empleado_id: empleadoId,
          empleado_nombre: employee.name,
          tipo: 'entrada',
          timestamp,
          verificado,
          ...(coords ? { lat: coords.latitude, lon: coords.longitude } : {}),
        };
        const { error } = await fichajesService.create(payload);
        if (error) return { error: 'No se pudo registrar la entrada' };
        await checkLateClockIn(employee, timestamp);
        await loadCoreData(hostalId);
        return { error: null, verificado };
      };

      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          doClockIn(false, null).then(resolve);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => doClockIn(true, pos.coords).then(resolve),
          () => doClockIn(false, null).then(resolve)
        );
      });
    },
    [loadCoreData, state.session, state.employees, checkLateClockIn]
  );

  const clockOut = useCallback(
    async (empleadoId) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const employee = state.employees.find((e) => e.id === empleadoId);
      if (!employee) return { error: 'Empleado no encontrado' };

      return new Promise((resolve) => {
        const fallback = async () => {
          const { error } = await fichajesService.create({
            hostal_id: hostalId,
            empleado_id: empleadoId,
            empleado_nombre: employee.name,
            tipo: 'salida',
            timestamp: new Date().toISOString(),
            verificado: false,
          });
          if (error) {
            resolve({ error: 'No se pudo registrar la salida' });
            return;
          }
          await loadCoreData(hostalId);
          resolve({ error: null, verificado: false });
        };

        if (!navigator.geolocation) {
          fallback();
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const { error } = await fichajesService.create({
              hostal_id: hostalId,
              empleado_id: empleadoId,
              empleado_nombre: employee.name,
              tipo: 'salida',
              timestamp: new Date().toISOString(),
              lat: latitude,
              lon: longitude,
              verificado: true,
            });
            if (error) {
              resolve({ error: 'No se pudo registrar la salida' });
              return;
            }
            await loadCoreData(hostalId);
            resolve({ error: null, verificado: true });
          },
          fallback
        );
      });
    },
    [loadCoreData, state.session, state.employees]
  );

  // --- Phase 2: Limpieza / tareas ---
  const markTaskDone = useCallback(
    async (taskId) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return { error: 'Tarea no encontrada' };

      const { error } = await cleaningTasksService.markDone(taskId);
      if (error) return { error: 'No se pudo completar la tarea' };

      if (task.bedId) {
        const { error: bedError } = await bedsService.update(task.bedId, { status: 'free' });
        if (bedError) return { error: 'No se pudo liberar la cama' };
      } else if (task.roomDbId) {
        const roomBeds = state.beds.filter((b) => b.roomDbId === task.roomDbId);
        for (const bed of roomBeds) {
          await bedsService.update(bed._dbId, { status: 'free' });
        }
      }

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session, state.tasks, state.beds]
  );

  const updateRoomStatus = useCallback((roomId, status) => {
    setState((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => (r.id === roomId ? { ...r, status } : r)),
    }));
    if (status === 'clean') {
      setTimeout(() => {
        setState((prev) => ({ ...prev, channelSync: syncConnectedChannels(prev) }));
      }, 1000);
    }
  }, []);

  const assignTask = useCallback(
    async ({ roomId, employeeName, notes }) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const room = state.rooms.find((r) => r.id === Number(roomId));
      if (!room || !room._dbId) return { error: 'Habitación no válida' };

      const employee = state.employees.find((e) => e.name === employeeName);
      if (!employee) return { error: 'Empleado no válido' };

      const { error } = await cleaningTasksService.create({
        hostal_id: hostalId,
        room_id: room._dbId,
        assigned_to: employee.id,
        status: 'pendiente',
      });
      if (error) return { error: 'No se pudo asignar la tarea' };

      // MaiA trigger: llegadas inminentes para esta habitación
      const roomNumber = String(room.id);
      const imminent = (state.reservations || []).filter(
        (r) =>
          r.status === 'pendiente' &&
          r.checkin &&
          r.room &&
          String(r.room) === roomNumber &&
          new Date(r.checkin).getTime() <= addMinutes(new Date(), 120).getTime() &&
          new Date(r.checkin).getTime() >= new Date().getTime()
      );
      if (imminent.length > 0) {
        await insertNotification({
          type: 'alerta',
          message: `Habitación ${room.name || room.id} tiene ${imminent.length} llegada${imminent.length > 1 ? 's' : ''} en las próximas 2h. Tarea asignada a ${employee.name}.`,
          dedupKey: `task-arrival-${room._dbId}-${new Date().toISOString().slice(0, 10)}`,
          critical: true,
        });
      }

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session, state.rooms, state.employees, state.reservations, insertNotification]
  );

  // --- Phase 2: MaiA ---
  const markNotificationRead = useCallback(
    async (id) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const { error } = await notificationsService.markRead(id);
      if (error) return { error: 'No se pudo marcar la notificación' };

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session]
  );

  // --- Phase D: Interceptor de reseñas ---
  const markReviewManaged = useCallback(
    async (id) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const { error } = await reviewRequestsService.markManaged(id);
      if (error) return { error: 'No se pudo marcar la reseña' };

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session]
  );

  // --- Phase E: MaiA General ---
  const maiaAnalyze = useCallback(async () => {
    const hostalId = state.session?.hostelRaw?.id;
    if (!hostalId) return { error: 'No hay sesión', alerts: [] };

    try {
      const context = await buildHostalContext(hostalId);
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const [{ data: recentNotifications }, { data: recentHistory }] = await Promise.all([
        supabase.from('notifications').select('dedup_key').eq('hostal_id', hostalId).gte('created_at', fourHoursAgo),
        supabase.from('maia_alert_history').select('dedup_key').eq('hostal_id', hostalId).gte('generated_at', fourHoursAgo),
      ]);

      const recentKeys = new Set(
        [...(recentNotifications || []), ...(recentHistory || [])]
          .map((n) => n.dedup_key)
          .filter(Boolean)
      );
      const alerts = runMaiaModules(context, Array.from(recentKeys));

      // Guardar TODAS las alertas generadas en historial para anti-repetición
      if (alerts.length > 0) {
        const historyRows = alerts.map((a) => ({
          hostal_id: hostalId,
          dedup_key: a.dedupKey,
          message: a.message,
          severity: a.severity,
        }));
        await supabase.from('maia_alert_history').upsert(historyRows, { onConflict: 'hostal_id,dedup_key' });
      }

      const toInsert = alerts.slice(0, 3).map((a) => ({
        hostal_id: hostalId,
        type: a.severity,
        message: a.message,
        dedup_key: a.dedupKey,
      }));

      if (toInsert.length > 0) {
        await notificationsService.create(toInsert);
        await loadCoreData(hostalId);
      }

      return { error: null, alerts };
    } catch (err) {
      console.error('MaiA analyze error:', err);
      return { error: 'No se pudo ejecutar el análisis', alerts: [] };
    }
  }, [loadCoreData, state.session, state.notifications]);

  const maiaChatAnswer = useCallback(
    async (question) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión', answer: '' };

      try {
        const { reply, error: chatError } = await maiaChat({ message: question, hostalId });
        if (!chatError && reply) {
          return { error: null, answer: reply };
        }
        // Fallback local si la Edge Function falla o no hay API key
        const context = await buildHostalContext(hostalId);
        context.hostal = state.session?.hostel || null;
        return { error: null, answer: getMockAnswer(question, context) };
      } catch (err) {
        console.error('MaiA chat error:', err);
        return { error: 'No se pudo procesar la pregunta', answer: '' };
      }
    },
    [state.session]
  );

  // --- Phase 2: Comunicaciones ---
  const saveTemplate = useCallback((templateId, updates) => {
    setState((prev) => ({
      ...prev,
      communicationTemplates: prev.communicationTemplates.map((t) =>
        t.id === templateId ? { ...t, ...updates } : t
      ),
    }));
  }, []);

  const toggleTemplateActive = useCallback((templateId) => {
    setState((prev) => ({
      ...prev,
      communicationTemplates: prev.communicationTemplates.map((t) =>
        t.id === templateId ? { ...t, active: !t.active } : t
      ),
    }));
  }, []);

  // --- Phase 2: Configuración ---
  const addEmployee = useCallback(async ({ email, password, nombre, rol }) => {
    const hostalId = state.session?.hostelRaw?.id;
    if (!hostalId) return { error: 'No hay sesión' };

    const { data, error } = await employeesService.create({ email, password, nombre, rol });
    if (error) return { error: 'No se pudo crear el empleado' };

    await loadCoreData(hostalId);
    return { data, error: null };
  }, [loadCoreData, state.session]);

  const updateEmployeeExpectedCheckin = useCallback(
    async (empleadoId, time) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const { error } = await hostalerosService.update(empleadoId, { expected_checkin_time: time });
      if (error) return { error: 'No se pudo actualizar el horario' };

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session]
  );

  // --- Phase 3: Marketplace ---
  const addMarketplaceService = useCallback(
    async (service) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const { error } = await marketplaceService.create({
        hostal_id: hostalId,
        name: service.name,
        category: service.category,
        description: service.description,
        phone: service.phone,
        discount: service.discount,
        active: true,
      });
      if (error) return { error: 'No se pudo añadir el servicio' };

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session]
  );

  const updateMarketplaceService = useCallback(
    async (serviceId, updates) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.discount !== undefined) dbUpdates.discount = updates.discount;
      if (updates.active !== undefined) dbUpdates.active = updates.active;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await marketplaceService.update(serviceId, dbUpdates);
        if (error) return { error: 'No se pudo actualizar el servicio' };
      }

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session]
  );

  // --- Phase 2: Programa Peregrino ---
  const addLoyaltyMember = useCallback(
    async (member) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const { error } = await loyaltyService.create({
        hostal_id: hostalId,
        name: member.name,
        email: member.email || null,
        points: member.points || 0,
        routes_completed: member.routesCompleted || 0,
        last_camino: member.lastCamino || null,
      });
      if (error) return { error: 'No se pudo añadir el miembro' };

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session]
  );

  const updateLoyaltyMember = useCallback(
    async (id, updates) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email || null;
      if (updates.points !== undefined) dbUpdates.points = updates.points;
      if (updates.routesCompleted !== undefined) dbUpdates.routes_completed = updates.routesCompleted;
      if (updates.lastCamino !== undefined) dbUpdates.last_camino = updates.lastCamino || null;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await loyaltyService.update(id, dbUpdates);
        if (error) return { error: 'No se pudo actualizar el miembro' };
      }

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session]
  );

  const deleteLoyaltyMember = useCallback(
    async (id) => {
      const hostalId = state.session?.hostelRaw?.id;
      if (!hostalId) return { error: 'No hay sesión' };

      const { error } = await loyaltyService.delete(id);
      if (error) return { error: 'No se pudo eliminar el miembro' };

      await loadCoreData(hostalId);
      return { error: null };
    },
    [loadCoreData, state.session]
  );

  const value = {
    ...state,
    signIn,
    logout,
    addReservation,
    checkInReservation,
    cancelReservation,
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
    maiaAnalyze,
    maiaChatAnswer,
    insertNotification,
    markReviewManaged,
    saveTemplate,
    toggleTemplateActive,
    addEmployee,
    updateEmployeeExpectedCheckin,
    updateHostelInfo,
    addMarketplaceService,
    updateMarketplaceService,
    addLoyaltyMember,
    updateLoyaltyMember,
    deleteLoyaltyMember,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

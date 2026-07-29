import { startOfDay } from './format';

export function buildRoomIndexMap(rooms) {
  return new Map(rooms.map((room, index) => [room.id, index + 1]));
}

export function buildBedLabelMap(beds) {
  return new Map(beds.map((bed) => [bed.id, bed.label]));
}

export function buildBedIdByLabelMap(beds) {
  return new Map(beds.map((bed) => [bed.label, bed.id]));
}

export function buildActiveGuestBedMap(guests) {
  const today = startOfDay(new Date()).getTime();
  const map = new Map();
  guests.forEach((guest) => {
    const checkin = guest.checkin ? startOfDay(new Date(guest.checkin)).getTime() : null;
    const checkout = guest.checkout ? startOfDay(new Date(guest.checkout)).getTime() : null;
    if (checkin != null && checkout != null && today >= checkin && today <= checkout && guest.bed_id) {
      map.set(guest.bed_id, guest.id);
    }
  });
  return map;
}

export function mapHostel(dbHostal, totalBeds) {
  return {
    id: dbHostal.id,
    name: dbHostal.name,
    slug: dbHostal.slug,
    address: dbHostal.address || '',
    phone: dbHostal.phone || '',
    email: dbHostal.email || '',
    basePrice: dbHostal.base_price,
    modoDirecto: dbHostal.modo_directo,
    autoSendSurvey: dbHostal.auto_send_survey ?? true,
    capacity: totalBeds,
    rating: 0,
  };
}

export function mapRoom(dbRoom, index, bedsInRoom) {
  return {
    id: index,
    _dbId: dbRoom.id,
    name: dbRoom.name,
    capacity: dbRoom.capacity,
    beds: bedsInRoom.map((bed) => bed.label),
    status: 'clean',
    assignedTo: null,
  };
}

export function mapBed(dbBed, roomIndex, activeGuestId) {
  return {
    id: dbBed.label,
    _dbId: dbBed.id,
    roomDbId: dbBed.room_id,
    room: roomIndex,
    status: dbBed.status,
    guestId: activeGuestId || null,
  };
}

export function mapReservation(dbReservation, roomIndexMap, bedLabelMap) {
  const roomId = dbReservation.bed_id ? null : null; // se resuelve externamente
  const bedLabel = bedLabelMap.get(dbReservation.bed_id) || null;
  const roomIndex = bedLabel && bedLabel.length ? roomIndexFromBedLabel(bedLabel, roomIndexMap) : null;

  return {
    id: dbReservation.id,
    guestName: dbReservation.guest_name,
    nationality: dbReservation.nationality,
    checkin: dbReservation.checkin ? new Date(dbReservation.checkin) : null,
    checkout: dbReservation.checkout ? new Date(dbReservation.checkout) : null,
    bed: bedLabel,
    room: roomIndex,
    price: Number(dbReservation.price),
    origin: dbReservation.channel,
    status: dbReservation.status,
    estimatedTime: dbReservation.estimated_time || '',
    phone: dbReservation.guest_phone || '',
    email: dbReservation.guest_email || '',
  };
}

export function mapGuest(dbGuest, bedLabelMap) {
  const bedLabel = bedLabelMap.get(dbGuest.bed_id) || null;
  return {
    id: dbGuest.id,
    name: dbGuest.name,
    document: dbGuest.document || '',
    nationality: dbGuest.nationality || '',
    dob: dbGuest.dob || '',
    phone: dbGuest.phone || '',
    email: dbGuest.email || '',
    bedId: bedLabel,
    checkin: dbGuest.checkin ? new Date(dbGuest.checkin) : null,
    checkout: dbGuest.checkout ? new Date(dbGuest.checkout) : null,
    price: Number(dbGuest.price),
    origin: dbGuest.origin || '',
    paymentStatus: dbGuest.payment_status || 'pendiente',
    loyaltyPoints: dbGuest.loyalty_points || 0,
  };
}

export function roomIndexFromBedLabel(bedLabel, roomIndexMap) {
  // Fallback: parsear primer carácter numérico del label (p. ej. "4A" -> 4)
  const match = String(bedLabel).match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

export function toDateString(date) {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toReservationInput(frontendReservation, hostalId, bedId) {
  return {
    hostal_id: hostalId,
    bed_id: bedId,
    guest_name: frontendReservation.guestName,
    guest_email: frontendReservation.email || null,
    guest_phone: frontendReservation.phone || null,
    nationality: frontendReservation.nationality || null,
    channel: frontendReservation.origin || 'directo',
    estimated_time: frontendReservation.estimatedTime || null,
    checkin: toDateString(frontendReservation.checkin),
    checkout: toDateString(frontendReservation.checkout),
    price: frontendReservation.price,
    status: frontendReservation.status || 'pendiente',
  };
}

export function mapHostalero(dbHostalero) {
  return {
    id: dbHostalero.id,
    name: dbHostalero.nombre || dbHostalero.email,
    role: dbHostalero.rol,
    expectedCheckinTime: dbHostalero.expected_checkin_time || '09:00:00',
  };
}

export function buildEmployeeState(hostaleros, fichajes) {
  const sortedFichajes = [...fichajes].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return hostaleros.map((h) => {
    const mine = sortedFichajes.filter((f) => f.empleado_id === h.id);
    const last = mine[0] || null;
    const lastIn = mine.find((f) => f.tipo === 'entrada') || null;
    const lastOut = mine.find((f) => f.tipo === 'salida') || null;
    const clockedIn = last?.tipo === 'entrada';
    return {
      ...mapHostalero(h),
      clockedIn,
      clockInTime: lastIn ? formatTime(lastIn.timestamp) : null,
      clockOutTime: lastOut ? formatTime(lastOut.timestamp) : null,
      verification: last?.verificado ? (last.lat != null ? 'gps' : 'wifi') : null,
      contractHours: 40,
    };
  });
}

const TASK_STATUS_MAP = {
  pendiente: 'pending',
  en_proceso: 'cleaning',
  completada: 'done',
};

export function mapTask(dbTask, roomIndexMap, employeeNameMap) {
  return {
    id: dbTask.id,
    roomId: roomIndexMap.get(dbTask.room_id) ?? null,
    roomDbId: dbTask.room_id,
    bedId: dbTask.bed_id,
    employeeName: employeeNameMap.get(dbTask.assigned_to) || '—',
    priority: 'normal',
    status: TASK_STATUS_MAP[dbTask.status] || dbTask.status,
    completedAt: dbTask.completed_at,
    createdAt: dbTask.created_at,
  };
}

const NOTIFICATION_TYPE_MAP = {
  alerta: 'aviso',
  info: 'ocupacion',
  sugerencia: 'precio',
};

export function mapNotification(dbNotification) {
  return {
    id: dbNotification.id,
    type: NOTIFICATION_TYPE_MAP[dbNotification.type] || dbNotification.type,
    alerta: dbNotification.type === 'alerta',
    message: dbNotification.message,
    read: dbNotification.read,
    timestamp: dbNotification.created_at,
    dedupKey: dbNotification.dedup_key || null,
  };
}

export function mapMarketplaceService(dbService) {
  return {
    id: dbService.id,
    name: dbService.name,
    category: dbService.category || '',
    description: dbService.description || '',
    discount: dbService.discount || '',
    phone: dbService.phone || '',
    active: dbService.active ?? true,
  };
}

export function mapLoyaltyMember(dbMember) {
  return {
    id: dbMember.id,
    name: dbMember.name,
    email: dbMember.email || '',
    points: dbMember.points || 0,
    routesCompleted: dbMember.routes_completed || 0,
    lastCamino: dbMember.last_camino || '',
  };
}

export function toGuestInput(frontendGuest, hostalId, reservationId, bedId) {
  return {
    hostal_id: hostalId,
    reservation_id: reservationId,
    bed_id: bedId,
    name: frontendGuest.name,
    email: frontendGuest.email || null,
    phone: frontendGuest.phone || null,
    document: frontendGuest.document || null,
    nationality: frontendGuest.nationality || null,
    dob: frontendGuest.dob || null,
    origin: frontendGuest.origin || null,
    checkin: toDateString(frontendGuest.checkin),
    checkout: toDateString(frontendGuest.checkout),
    price: frontendGuest.price,
    payment_status: frontendGuest.paymentStatus || 'pendiente',
    loyalty_points: frontendGuest.loyaltyPoints || 0,
  };
}

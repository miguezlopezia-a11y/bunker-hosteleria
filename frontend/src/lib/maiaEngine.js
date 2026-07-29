import { startOfDay, isSameDay, addMinutes, minutesAgo } from '../utils/format';

const CLEANING_THRESHOLD_MINUTES = 75; // 45min medio + margen
const BLOCKED_BED_THRESHOLD_DAYS = 5;
const CHECKIN_WINDOW_MINUTES = 120;
const COMPLIANCE_DAILY_HOURS_PAUSE = 6;

function hoursDiff(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 36e5;
}

function minutesDiff(a, b) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

function getRoomLabelByBed(bedLabel, rooms) {
  const match = String(bedLabel).match(/^(\d+)/);
  if (!match) return null;
  const idx = Number(match[1]);
  const room = rooms.find((r, i) => i + 1 === idx);
  return room?.name || `Habitación ${idx}`;
}

// M2 — Operations Monitor
export function operationsMonitor(context) {
  const alerts = [];
  const now = new Date();

  // Camas en limpieza demasiado tiempo
  context.tareasDetalle.forEach((task) => {
    if (!task.created_at) return;
    const minutes = minutesDiff(task.created_at, now);
    if (minutes > CLEANING_THRESHOLD_MINUTES) {
      const roomName = getRoomLabelByBed(task.bed_label, context.rooms || []);
      alerts.push({
        severity: 'alerta',
        message: `${roomName || 'Una habitación'} lleva ${Math.round(minutes)}min en limpieza. Tiempo medio esperado 45min. Revisar.`,
        module: 'M2',
        dedupKey: `cleaning-slow-${task.id || task.room_id}`,
      });
    }
  });

  // Tareas pendientes vs llegadas inminentes
  const imminentArrivals = (context.reservasRecientes || []).filter(
    (r) =>
      r.status === 'pendiente' &&
      r.checkin &&
      new Date(r.checkin).getTime() <= addMinutes(now, CHECKIN_WINDOW_MINUTES).getTime() &&
      new Date(r.checkin).getTime() >= now.getTime()
  );
  if (context.tareasPendientes > 0 && imminentArrivals.length > 0) {
    alerts.push({
      severity: 'alerta',
      message: `${context.tareasPendientes} tarea${context.tareasPendientes > 1 ? 's' : ''} de limpieza pendiente y ${imminentArrivals.length} llegada${imminentArrivals.length > 1 ? 's' : ''} en las próximas 2h.`,
      module: 'M2',
      dedupKey: `cleaning-arrivals-${startOfDay(now).toISOString()}`,
    });
  }

  // Camas bloqueadas demasiado tiempo
  context.camasBloqueadas.forEach((bed) => {
    if (!bed.updated_at) return;
    const days = hoursDiff(bed.updated_at, now) / 24;
    if (days > BLOCKED_BED_THRESHOLD_DAYS) {
      alerts.push({
        severity: 'sugerencia',
        message: `Cama ${bed.label} está bloqueada desde hace ${Math.round(days)} días. ¿Sigue en mantenimiento o se puede liberar?`,
        module: 'M2',
        dedupKey: `blocked-bed-${bed.id}`,
      });
    }
  });

  // Empleados sin fichaje de entrada en el turno
  const clockedInToday = new Set(
    (context.fichajesHoy || []).filter((f) => f.tipo === 'entrada').map((f) => f.empleado_id)
  );
  (context.empleados || []).forEach((emp) => {
    if (!clockedInToday.has(emp.id)) {
      alerts.push({
        severity: 'alerta',
        message: `${emp.nombre || emp.email} no ha fichado entrada hoy. Verificar disponibilidad.`,
        module: 'M2',
        dedupKey: `no-clockin-${emp.id}-${startOfDay(now).toISOString()}`,
      });
    }
  });

  // Fichajes tardíos
  (context.fichajesHoy || [])
    .filter((f) => f.tipo === 'entrada')
    .forEach((f) => {
      const emp = (context.empleados || []).find((e) => e.id === f.empleado_id);
      if (!emp?.expectedCheckinTime) return;
      const [expH, expM] = emp.expectedCheckinTime.split(':');
      const expected = new Date(f.timestamp);
      expected.setHours(Number(expH), Number(expM), 0, 0);
      const actual = new Date(f.timestamp);
      if (actual > expected) {
        const diffMin = Math.round((actual.getTime() - expected.getTime()) / 60000);
        alerts.push({
          severity: 'alerta',
          message: `${emp.nombre || f.empleado_nombre} fichó entrada con ${diffMin}min de retraso (esperado ${expH}:${expM}).`,
          module: 'M2',
          dedupKey: `late-clockin-${emp.id}-${startOfDay(now).toISOString()}`,
        });
      }
    });

  // Empleados sin fichaje de salida
  const lastFichajeByEmployee = {};
  (context.fichajesHoy || []).forEach((f) => {
    lastFichajeByEmployee[f.empleado_id] = f;
  });
  Object.values(lastFichajeByEmployee).forEach((f) => {
    if (f.tipo === 'entrada') {
      const hours = hoursDiff(f.timestamp, now);
      if (hours > 10) {
        const emp = (context.empleados || []).find((e) => e.id === f.empleado_id);
        alerts.push({
          severity: 'alerta',
          message: `${emp?.nombre || f.empleado_nombre} lleva ${Math.round(hours)}h fichado/a. Falta fichaje de salida.`,
          module: 'M2',
          dedupKey: `no-clockout-${f.empleado_id}-${startOfDay(now).toISOString()}`,
        });
      }
    }
  });

  return alerts;
}

// M6 — Compliance Monitor
export function complianceMonitor(context) {
  const alerts = [];
  const now = new Date();

  // Jornadas >6h sin pausa registrada (simplificado: más de COMPLIANCE_DAILY_HOURS_PAUSE horas seguidas)
  const fichajesByEmployee = {};
  (context.fichajesHoy || []).forEach((f) => {
    if (!fichajesByEmployee[f.empleado_id]) fichajesByEmployee[f.empleado_id] = [];
    fichajesByEmployee[f.empleado_id].push(f);
  });

  Object.entries(fichajesByEmployee).forEach(([empId, fichajes]) => {
    const sorted = [...fichajes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let lastIn = null;
    sorted.forEach((f) => {
      if (f.tipo === 'entrada') {
        lastIn = new Date(f.timestamp);
      } else if (f.tipo === 'salida' && lastIn) {
        const hours = hoursDiff(lastIn, f.timestamp);
        if (hours > COMPLIANCE_DAILY_HOURS_PAUSE) {
          const emp = (context.empleados || []).find((e) => e.id === empId);
          alerts.push({
            severity: 'alerta',
            message: `${emp?.nombre || f.empleado_nombre} ha trabajado ${Math.round(hours)}h sin pausa registrada. ET art. 34.4 obliga a 15min en jornadas >6h.`,
            module: 'M6',
            dedupKey: `no-pause-${empId}-${startOfDay(now).toISOString()}`,
          });
        }
        lastIn = null;
      }
    });
  });

  return alerts;
}

// M1 — Revenue Director (básico)
export function revenueDirector(context) {
  const alerts = [];
  const occupancyRate = context.ocupacion.total > 0 ? context.ocupacion.ocupadas / context.ocupacion.total : 0;

  if (occupancyRate < 0.5 && context.ocupacion.total > 0) {
    alerts.push({
      severity: 'sugerencia',
      message: `Ocupación actual ${Math.round(occupancyRate * 100)}%. Con demanda baja, considera activar promociones o liberar stock a canales externos.`,
      module: 'M1',
      dedupKey: `low-occupancy-${startOfDay(new Date()).toISOString()}`,
    });
  }

  const recentDirect = (context.reservasRecientes || []).filter((r) => r.channel === 'directo').length;
  const totalRecent = (context.reservasRecientes || []).length;
  if (totalRecent > 0) {
    const directRate = recentDirect / totalRecent;
    if (directRate > 0.3) {
      alerts.push({
        severity: 'info',
        message: `El canal directo representa el ${Math.round(directRate * 100)}% de tus reservas recientes. Buen trabajo reduciendo comisiones.`,
        module: 'M1',
        dedupKey: `direct-channel-${startOfDay(new Date()).toISOString()}`,
      });
    }
  }

  return alerts;
}

// M5 — Channel Optimizer (básico)
export function channelOptimizer(context) {
  const alerts = [];
  const byChannel = {};
  (context.reservasRecientes || []).forEach((r) => {
    if (!byChannel[r.channel]) byChannel[r.channel] = { count: 0, revenue: 0 };
    byChannel[r.channel].count += 1;
    byChannel[r.channel].revenue += Number(r.price) || 0;
  });

  const total = Object.values(byChannel).reduce((sum, c) => sum + c.count, 0);
  if (total > 0) {
    Object.entries(byChannel).forEach(([channel, stats]) => {
      const share = stats.count / total;
      if (share > 0.65 && channel !== 'directo') {
        alerts.push({
          severity: 'sugerencia',
          message: `Dependencia alta de ${channel}: ${Math.round(share * 100)}% de reservas. Diversifica hacia canal directo para reducir riesgo.`,
          module: 'M5',
          dedupKey: `channel-concentration-${channel}-${startOfDay(new Date()).toISOString()}`,
        });
      }
    });
  }

  return alerts;
}

// M3 — Guest Intelligence (básico)
export function guestIntelligence(context) {
  const alerts = [];

  if (context.reviewScoreMedio > 0 && context.reviewScoreMedio < 4) {
    alerts.push({
      severity: 'sugerencia',
      message: `Score medio de satisfacción: ${context.reviewScoreMedio}/5. Revisa las ${context.reviewNegativas} reseña${context.reviewNegativas > 1 ? 's' : ''} interna${context.reviewNegativas > 1 ? 's' : ''} pendientes.`,
      module: 'M3',
      dedupKey: `guest-score-${startOfDay(new Date()).toISOString()}`,
    });
  }

  return alerts;
}

// M4 — Demand Forecasting (básico)
export function demandForecasting(context) {
  const alerts = [];
  const now = new Date();
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(now, i + 1));

  const futureReservations = (context.reservasRecientes || []).filter((r) => r.checkin && new Date(r.checkin) > now);
  const futureByDate = new Map();
  futureReservations.forEach((r) => {
    const key = startOfDay(new Date(r.checkin)).toISOString();
    futureByDate.set(key, (futureByDate.get(key) || 0) + 1);
  });

  const year = now.getFullYear();
  const events = [
    { date: new Date(`${year}-04-10`), name: 'Semana Santa', intensity: 'alta' },
    { date: new Date(`${year}-04-17`), name: 'Semana Santa', intensity: 'alta' },
    { date: new Date(`${year}-07-15`), name: 'Temporada alta verano', intensity: 'media' },
    { date: new Date(`${year}-07-25`), name: 'Día de Santiago', intensity: 'alta' },
    { date: new Date(`${year}-08-15`), name: 'Asunción / peregrinaje', intensity: 'media' },
  ];

  const upcomingEvent = events.find((e) => {
    const diffDays = (e.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 14;
  });

  if (upcomingEvent) {
    const eventDateKey = startOfDay(upcomingEvent.date).toISOString();
    const booked = futureByDate.get(eventDateKey) || 0;
    const capacity = context.ocupacion.total || 1;
    const occupancyForecast = booked / capacity;
    if (occupancyForecast < 0.7) {
      alerts.push({
        severity: 'sugerencia',
        message: `Evento próximo: ${upcomingEvent.name} (${upcomingEvent.date.toISOString().slice(0, 10)}). Previsión de ocupación ${Math.round(occupancyForecast * 100)}%. Considera subir precio o activar promociones.`,
        module: 'M4',
        dedupKey: `demand-event-${upcomingEvent.name}-${upcomingEvent.date.toISOString().slice(0, 10)}`,
      });
    }
  }

  const rainDays = next7Days.filter((d) => d.getDate() % 2 === 0);
  if (rainDays.length > 0) {
    const dates = rainDays.map((d) => d.toISOString().slice(0, 10)).join(', ');
    alerts.push({
      severity: 'info',
      message: `Lluvia intensa prevista los días ${dates}. Espera llegadas más tempranas y mayor demanda de secado de ropa.`,
      module: 'M4',
      dedupKey: `demand-rain-${startOfDay(now).toISOString()}`,
    });
  }

  return alerts;
}

// Ejecuta todos los módulos y devuelve alertas filtradas por anti-repetición
export function runMaiaModules(context, recentMessages = []) {
  const all = [
    ...operationsMonitor(context),
    ...complianceMonitor(context),
    ...revenueDirector(context),
    ...channelOptimizer(context),
    ...guestIntelligence(context),
    ...demandForecasting(context),
  ];

  // Anti-repetición: no enviar alertas con mismo dedupKey en las últimas 4h
  const recentKeys = new Set(recentMessages);
  return all.filter((a) => !recentKeys.has(a.dedupKey));
}

// Genera respuesta mock según keywords del spec
export function getMockAnswer(question, ctx) {
  const q = question.toLowerCase();

  if (q.includes('cama') || q.includes('ocupación') || q.includes('ocupacion') || q.includes('libre')) {
    const { ocupadas, libres, limpieza, bloqueadas, total } = ctx.ocupacion;
    const llegadas = ctx.llegadasHoy;
    return `Ocupación actual: ${ocupadas}/${total} camas. Libres: ${libres}, en limpieza: ${limpieza}, bloqueadas: ${bloqueadas}. Llegadas hoy: ${llegadas}.`;
  }

  if (q.includes('precio') || q.includes('tarifa')) {
    return `Precio base actual: ${ctx.hostal?.basePrice ? `€${ctx.hostal.basePrice}` : 'no configurado'}. Ocupación ${Math.round((ctx.ocupacion.ocupadas / Math.max(1, ctx.ocupacion.total)) * 100)}%. Recomendación: mantener entre €15 y €22 según demanda.`;
  }

  if (q.includes('limpieza') || q.includes('limpia')) {
    if (ctx.tareasPendientes === 0) return 'No hay tareas de limpieza pendientes.';
    const oldest = ctx.tareasDetalle[0];
    const mins = oldest?.created_at ? Math.round(minutesDiff(oldest.created_at, new Date())) : 0;
    return `${ctx.tareasPendientes} tarea${ctx.tareasPendientes > 1 ? 's' : ''} pendiente${ctx.tareasPendientes > 1 ? 's' : ''}${mins ? `. La más antigua lleva ${mins}min` : ''}.`;
  }

  if (q.includes('fichaje') || q.includes('empleado') || q.includes('equipo')) {
    const count = (ctx.fichajesHoy || []).length;
    const sinEntrada = (ctx.empleados || []).filter((e) => !(ctx.fichajesHoy || []).some((f) => f.empleado_id === e.id && f.tipo === 'entrada')).length;
    return `Hoy hay ${count} fichajes registrados. ${sinEntrada} empleado${sinEntrada > 1 ? 's' : ''} sin entrada.`;
  }

  if (q.includes('reserva') || q.includes('llegada')) {
    return `${ctx.llegadasHoy} llegadas hoy. ${ctx.salidasHoy} salidas. ${ctx.ocupacion.libres} camas libres para nuevas reservas.`;
  }

  if (q.includes('reseña') || q.includes('opinión') || q.includes('opinion') || q.includes('satisfacción')) {
    return `Score medio este mes: ${ctx.reviewScoreMedio}/5. ${ctx.reviewNegativas} reseña${ctx.reviewNegativas > 1 ? 's' : ''} interna${ctx.reviewNegativas > 1 ? 's' : ''} por gestionar.`;
  }

  return 'Eso está fuera de mi alcance operacional. Pregúntame sobre ocupación, precios, limpieza, fichajes, reservas o reseñas.';
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function subDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

export function addMinutes(date: Date, minutes: number) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export function hoursDiff(a: string | Date, b: string | Date) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 36e5;
}

export function minutesDiff(a: string | Date, b: string | Date) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000;
}

const CLEANING_THRESHOLD_MINUTES = 75;
const BLOCKED_BED_THRESHOLD_DAYS = 5;
const CHECKIN_WINDOW_MINUTES = 120;
const COMPLIANCE_DAILY_HOURS_PAUSE = 6;

export async function buildHostalContext(supabaseAdmin: any, hostalId: string, options?: { withEmployees?: boolean; withHostal?: boolean }) {
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const weekAgo = subDays(today, 7).toISOString();

  const promises: any[] = [
    supabaseAdmin.from('reservations').select('*').eq('hostal_id', hostalId).gte('checkin', weekAgo).order('checkin', { ascending: false }).limit(100),
    supabaseAdmin.from('guests').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('beds').select('*').eq('hostal_id', hostalId),
    supabaseAdmin.from('fichajes').select('*').eq('hostal_id', hostalId).gte('timestamp', todayStart).order('timestamp', { ascending: false }),
    supabaseAdmin.from('cleaning_tasks').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('review_requests').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }).limit(50),
  ];

  if (options?.withEmployees) {
    promises.push(supabaseAdmin.from('hostaleros').select('*').eq('hostal_id', hostalId));
  }
  if (options?.withHostal) {
    promises.push(supabaseAdmin.from('hostales').select('*').eq('id', hostalId).single());
  }

  const [
    { data: reservations },
    { data: guests },
    { data: beds },
    { data: fichajes },
    { data: cleaning },
    { data: reviews },
    ...rest
  ] = await Promise.all(promises);

  let empleados: any[] = [];
  let hostal: any = null;
  let idx = 0;
  if (options?.withEmployees) {
    empleados = rest[idx]?.data || [];
    idx += 1;
  }
  if (options?.withHostal) {
    hostal = rest[idx]?.data || null;
  }

  const pendingCleaning = (cleaning || []).filter((t: any) => t.status === 'pendiente' || t.status === 'en_proceso');
  const blockedBeds = (beds || []).filter((b: any) => b.status === 'blocked');
  const avgReviewScore =
    (reviews || []).filter((r: any) => r.score != null).reduce((sum: number, r: any) => sum + r.score, 0) /
      Math.max(1, (reviews || []).filter((r: any) => r.score != null).length) || 0;

  return {
    fecha: today.toISOString(),
    hostal_id: hostalId,
    hostal,
    ocupacion: {
      total: (beds || []).length,
      ocupadas: (beds || []).filter((b: any) => b.status === 'occupied').length,
      libres: (beds || []).filter((b: any) => b.status === 'free').length,
      limpieza: (beds || []).filter((b: any) => b.status === 'cleaning').length,
      bloqueadas: blockedBeds.length,
    },
    llegadasHoy: (reservations || []).filter((r: any) => isSameDay(new Date(r.checkin), today) && r.status === 'pendiente').length,
    salidasHoy: (guests || []).filter((g: any) => isSameDay(new Date(g.checkout), today)).length,
    tareasDetalle: pendingCleaning,
    tareasPendientes: pendingCleaning.length,
    fichajesHoy: fichajes || [],
    empleados,
    camasBloqueadas: blockedBeds,
    reservasRecientes: reservations || [],
    reviewScoreMedio: Number(avgReviewScore.toFixed(1)),
    reviewNegativas: (reviews || []).filter((r: any) => r.score != null && r.score <= 3).length,
  };
}

function operationsMonitor(context: any) {
  const alerts: any[] = [];
  const now = new Date();

  context.tareasDetalle.forEach((task: any) => {
    if (!task.created_at) return;
    const minutes = minutesDiff(task.created_at, now);
    if (minutes > CLEANING_THRESHOLD_MINUTES) {
      alerts.push({
        severity: 'alerta',
        message: `Una tarea de limpieza lleva ${Math.round(minutes)}min en curso. Tiempo medio esperado 45min. Revisar.`,
        dedupKey: `cleaning-slow-${task.id || task.room_id}`,
      });
    }
  });

  const imminentArrivals = (context.reservasRecientes || []).filter(
    (r: any) =>
      r.status === 'pendiente' &&
      r.checkin &&
      new Date(r.checkin).getTime() <= addMinutes(now, CHECKIN_WINDOW_MINUTES).getTime() &&
      new Date(r.checkin).getTime() >= now.getTime()
  );
  if (context.tareasPendientes > 0 && imminentArrivals.length > 0) {
    alerts.push({
      severity: 'alerta',
      message: `${context.tareasPendientes} tarea${context.tareasPendientes > 1 ? 's' : ''} de limpieza pendiente y ${imminentArrivals.length} llegada${imminentArrivals.length > 1 ? 's' : ''} en las próximas 2h.`,
      dedupKey: `cleaning-arrivals-${startOfDay(now).toISOString()}`,
    });
  }

  context.camasBloqueadas.forEach((bed: any) => {
    if (!bed.updated_at) return;
    const days = hoursDiff(bed.updated_at, now) / 24;
    if (days > BLOCKED_BED_THRESHOLD_DAYS) {
      alerts.push({
        severity: 'sugerencia',
        message: `Cama ${bed.label} está bloqueada desde hace ${Math.round(days)} días. ¿Sigue en mantenimiento o se puede liberar?`,
        dedupKey: `blocked-bed-${bed.id}`,
      });
    }
  });

  const clockedInToday = new Set((context.fichajesHoy || []).filter((f: any) => f.tipo === 'entrada').map((f: any) => f.empleado_id));
  (context.empleados || []).forEach((emp: any) => {
    if (!clockedInToday.has(emp.id)) {
      alerts.push({
        severity: 'alerta',
        message: `${emp.nombre || emp.email} no ha fichado entrada hoy. Verificar disponibilidad.`,
        dedupKey: `no-clockin-${emp.id}-${startOfDay(now).toISOString()}`,
      });
    }
  });

  (context.fichajesHoy || [])
    .filter((f: any) => f.tipo === 'entrada')
    .forEach((f: any) => {
      const emp = (context.empleados || []).find((e: any) => e.id === f.empleado_id);
      if (!emp?.expected_checkin_time) return;
      const [expH, expM] = emp.expected_checkin_time.split(':');
      const expected = new Date(f.timestamp);
      expected.setHours(Number(expH), Number(expM), 0, 0);
      const actual = new Date(f.timestamp);
      if (actual > expected) {
        const diffMin = Math.round((actual.getTime() - expected.getTime()) / 60000);
        alerts.push({
          severity: 'alerta',
          message: `${emp.nombre || f.empleado_nombre} fichó entrada con ${diffMin}min de retraso (esperado ${expH}:${expM}).`,
          dedupKey: `late-clockin-${emp.id}-${startOfDay(now).toISOString()}`,
        });
      }
    });

  const lastFichajeByEmployee: Record<string, any> = {};
  (context.fichajesHoy || []).forEach((f: any) => {
    lastFichajeByEmployee[f.empleado_id] = f;
  });
  Object.values(lastFichajeByEmployee).forEach((f: any) => {
    if (f.tipo === 'entrada') {
      const hours = hoursDiff(f.timestamp, now);
      if (hours > 10) {
        const emp = (context.empleados || []).find((e: any) => e.id === f.empleado_id);
        alerts.push({
          severity: 'alerta',
          message: `${emp?.nombre || f.empleado_nombre} lleva ${Math.round(hours)}h fichado/a. Falta fichaje de salida.`,
          dedupKey: `no-clockout-${f.empleado_id}-${startOfDay(now).toISOString()}`,
        });
      }
    }
  });

  return alerts;
}

function complianceMonitor(context: any) {
  const alerts: any[] = [];
  const now = new Date();

  const fichajesByEmployee: Record<string, any[]> = {};
  (context.fichajesHoy || []).forEach((f: any) => {
    if (!fichajesByEmployee[f.empleado_id]) fichajesByEmployee[f.empleado_id] = [];
    fichajesByEmployee[f.empleado_id].push(f);
  });

  Object.entries(fichajesByEmployee).forEach(([empId, fichajes]) => {
    const sorted = [...fichajes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let lastIn: Date | null = null;
    sorted.forEach((f: any) => {
      if (f.tipo === 'entrada') {
        lastIn = new Date(f.timestamp);
      } else if (f.tipo === 'salida' && lastIn) {
        const hours = hoursDiff(lastIn, f.timestamp);
        if (hours > COMPLIANCE_DAILY_HOURS_PAUSE) {
          const emp = (context.empleados || []).find((e: any) => e.id === empId);
          alerts.push({
            severity: 'alerta',
            message: `${emp?.nombre || f.empleado_nombre} ha trabajado ${Math.round(hours)}h sin pausa registrada. ET art. 34.4 obliga a 15min en jornadas >6h.`,
            dedupKey: `no-pause-${empId}-${startOfDay(now).toISOString()}`,
          });
        }
        lastIn = null;
      }
    });
  });

  return alerts;
}

function revenueDirector(context: any) {
  const alerts: any[] = [];
  const occupancyRate = context.ocupacion.total > 0 ? context.ocupacion.ocupadas / context.ocupacion.total : 0;

  if (occupancyRate < 0.5 && context.ocupacion.total > 0) {
    alerts.push({
      severity: 'sugerencia',
      message: `Ocupación actual ${Math.round(occupancyRate * 100)}%. Con demanda baja, considera activar promociones o liberar stock a canales externos.`,
      dedupKey: `low-occupancy-${startOfDay(new Date()).toISOString()}`,
    });
  }

  const recentDirect = (context.reservasRecientes || []).filter((r: any) => r.channel === 'directo').length;
  const totalRecent = (context.reservasRecientes || []).length;
  if (totalRecent > 0) {
    const directRate = recentDirect / totalRecent;
    if (directRate > 0.3) {
      alerts.push({
        severity: 'info',
        message: `El canal directo representa el ${Math.round(directRate * 100)}% de tus reservas recientes. Buen trabajo reduciendo comisiones.`,
        dedupKey: `direct-channel-${startOfDay(new Date()).toISOString()}`,
      });
    }
  }

  return alerts;
}

function channelOptimizer(context: any) {
  const alerts: any[] = [];
  const byChannel: Record<string, { count: number; revenue: number }> = {};
  (context.reservasRecientes || []).forEach((r: any) => {
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
          dedupKey: `channel-concentration-${channel}-${startOfDay(new Date()).toISOString()}`,
        });
      }
    });
  }

  return alerts;
}

function guestIntelligence(context: any) {
  const alerts: any[] = [];
  if (context.reviewScoreMedio > 0 && context.reviewScoreMedio < 4) {
    alerts.push({
      severity: 'sugerencia',
      message: `Score medio de satisfacción: ${context.reviewScoreMedio}/5. Revisa las ${context.reviewNegativas} reseña${context.reviewNegativas > 1 ? 's' : ''} interna${context.reviewNegativas > 1 ? 's' : ''} pendientes.`,
      dedupKey: `guest-score-${startOfDay(new Date()).toISOString()}`,
    });
  }
  return alerts;
}

function demandForecasting(context: any) {
  const alerts: any[] = [];
  const now = new Date();
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(now, i + 1));

  const futureReservations = (context.reservasRecientes || []).filter((r: any) => r.checkin && new Date(r.checkin) > now);
  const futureByDate = new Map<string, number>();
  futureReservations.forEach((r: any) => {
    const key = startOfDay(new Date(r.checkin)).toISOString();
    futureByDate.set(key, (futureByDate.get(key) || 0) + 1);
  });

  const year = now.getFullYear();
  const events: { date: Date; name: string; intensity: 'alta' | 'media' }[] = [
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
      dedupKey: `demand-rain-${startOfDay(now).toISOString()}`,
    });
  }

  return alerts;
}

export function runMaiaModules(context: any, recentKeys: Set<string>) {
  const all = [
    ...operationsMonitor(context),
    ...complianceMonitor(context),
    ...revenueDirector(context),
    ...channelOptimizer(context),
    ...guestIntelligence(context),
    ...demandForecasting(context),
  ];
  return all.filter((a) => !recentKeys.has(a.dedupKey));
}

export function getMockAnswer(question: string, ctx: any) {
  const q = question.toLowerCase();
  if (q.includes('cama') || q.includes('ocupación') || q.includes('ocupacion') || q.includes('libre')) {
    const { ocupadas, libres, limpieza, bloqueadas, total } = ctx.ocupacion;
    return `Ocupación actual: ${ocupadas}/${total} camas. Libres: ${libres}, en limpieza: ${limpieza}, bloqueadas: ${bloqueadas}. Llegadas hoy: ${ctx.llegadasHoy}.`;
  }
  if (q.includes('precio') || q.includes('tarifa')) {
    return `Precio base actual: ${ctx.hostal?.base_price ? `€${ctx.hostal.base_price}` : 'no configurado'}. Ocupación ${Math.round((ctx.ocupacion.ocupadas / Math.max(1, ctx.ocupacion.total)) * 100)}%. Recomendación: mantener entre €15 y €22 según demanda.`;
  }
  if (q.includes('limpieza') || q.includes('limpia')) {
    return ctx.tareasPendientes === 0
      ? 'No hay tareas de limpieza pendientes.'
      : `${ctx.tareasPendientes} tarea${ctx.tareasPendientes > 1 ? 's' : ''} de limpieza pendiente${ctx.tareasPendientes > 1 ? 's' : ''}.`;
  }
  if (q.includes('fichaje') || q.includes('empleado') || q.includes('equipo')) {
    return `Hoy hay ${(ctx.fichajesHoy || []).length} fichajes registrados.`;
  }
  if (q.includes('reserva') || q.includes('llegada')) {
    return `${ctx.llegadasHoy} llegadas hoy. ${ctx.salidasHoy} salidas. ${ctx.ocupacion.libres} camas libres para nuevas reservas.`;
  }
  if (q.includes('reseña') || q.includes('opinión') || q.includes('opinion') || q.includes('satisfacción')) {
    return `Score medio: ${ctx.reviewScoreMedio}/5.`;
  }
  return 'Eso está fuera de mi alcance operacional. Pregúntame sobre ocupación, precios, limpieza, fichajes, reservas o reseñas.';
}

export function buildSystemPrompt(ctx: any) {
  return `Eres MaiA, la inteligencia operacional de ${ctx.hostal?.name || 'un albergue'} en el Camino de Santiago.
Tienes acceso a los datos en tiempo real del albergue.
Tu trabajo es identificar problemas antes de que el hostalero los vea, optimizar ingresos y garantizar una experiencia impecable.

CONTEXTO ACTUAL (${ctx.fecha}):
- Ocupación: ${ctx.ocupacion.ocupadas}/${ctx.ocupacion.total} camas (libres: ${ctx.ocupacion.libres}, limpieza: ${ctx.ocupacion.limpieza}, bloqueadas: ${ctx.ocupacion.bloqueadas})
- Llegadas hoy: ${ctx.llegadasHoy} · Salidas hoy: ${ctx.salidasHoy}
- Tareas de limpieza pendientes: ${ctx.tareasPendientes}
- Fichajes hoy: ${(ctx.fichajesHoy || []).length}
- Score medio: ${ctx.reviewScoreMedio}/5

REGLAS:
- Sé directa. Sin preámbulos.
- Si hay un problema urgente, empieza por él.
- Las sugerencias de precio van con números concretos.
- Nunca inventes datos. Si no tienes información suficiente, dilo.
- Máximo 3 alertas por ciclo. No saturar.`;
}

import { supabase } from './supabase';
import { startOfDay, isSameDay, subDays } from '../utils/format';
import { mapHostalero } from '../utils/mappers';

export async function buildHostalContext(hostalId) {
  if (!hostalId) return null;

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const weekAgo = subDays(today, 7).toISOString();

  const [
    { data: reservations, error: reservationsError },
    { data: guests, error: guestsError },
    { data: beds, error: bedsError },
    { data: rooms, error: roomsError },
    { data: fichajes, error: fichajesError },
    { data: cleaning, error: cleaningError },
    { data: notifications, error: notificationsError },
    { data: reviews, error: reviewsError },
    { data: loyalty, error: loyaltyError },
    { data: marketplace, error: marketplaceError },
    { data: hostaleros, error: hostalerosError },
  ] = await Promise.all([
    supabase
      .from('reservations')
      .select('*')
      .eq('hostal_id', hostalId)
      .gte('checkin', weekAgo)
      .order('checkin', { ascending: false })
      .limit(100),
    supabase.from('guests').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }).limit(50),
    supabase.from('beds').select('*').eq('hostal_id', hostalId),
    supabase.from('rooms').select('*').eq('hostal_id', hostalId),
    supabase.from('fichajes').select('*').eq('hostal_id', hostalId).gte('timestamp', todayStart).order('timestamp', { ascending: false }),
    supabase.from('cleaning_tasks').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }).limit(50),
    supabase
      .from('notifications')
      .select('*')
      .eq('hostal_id', hostalId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('review_requests').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }).limit(50),
    supabase.from('loyalty_members').select('*').eq('hostal_id', hostalId).order('points', { ascending: false }).limit(20),
    supabase.from('marketplace_services').select('*').eq('hostal_id', hostalId).order('created_at', { ascending: false }),
    supabase.from('hostaleros').select('*').eq('hostal_id', hostalId),
  ]);

  if (
    reservationsError ||
    guestsError ||
    bedsError ||
    roomsError ||
    fichajesError ||
    cleaningError ||
    notificationsError ||
    reviewsError ||
    loyaltyError ||
    marketplaceError ||
    hostalerosError
  ) {
    console.error('Error building MaiA context', {
      reservationsError,
      guestsError,
      bedsError,
      roomsError,
      fichajesError,
      cleaningError,
      notificationsError,
      reviewsError,
      loyaltyError,
      marketplaceError,
      hostalerosError,
    });
  }

  const activeGuests = (guests || []).filter((g) => g.bed_id);
  const llegadasHoy = (reservations || []).filter(
    (r) => isSameDay(new Date(r.checkin), today) && r.status === 'pendiente'
  );
  const salidasHoy = (guests || []).filter((g) => isSameDay(new Date(g.checkout), today));
  const pendingCleaning = (cleaning || []).filter((t) => t.status === 'pendiente' || t.status === 'en_proceso');
  const blockedBeds = (beds || []).filter((b) => b.status === 'blocked');
  const avgReviewScore =
    (reviews || []).filter((r) => r.score != null).reduce((sum, r) => sum + r.score, 0) /
      Math.max(1, (reviews || []).filter((r) => r.score != null).length) || 0;

  return {
    fecha: today.toISOString(),
    hostal_id: hostalId,
    ocupacion: {
      total: (beds || []).length,
      ocupadas: (beds || []).filter((b) => b.status === 'occupied').length,
      libres: (beds || []).filter((b) => b.status === 'free').length,
      limpieza: (beds || []).filter((b) => b.status === 'cleaning').length,
      bloqueadas: blockedBeds.length,
    },
    llegadasHoy: llegadasHoy.length,
    salidasHoy: salidasHoy.length,
    huéspedesActivos: activeGuests.length,
    tareasPendientes: pendingCleaning.length,
    tareasDetalle: pendingCleaning,
    fichajesHoy: fichajes || [],
    empleados: (hostaleros || []).map(mapHostalero),
    alertasPrevias: (notifications || []).map((n) => n.message),
    reviewRequests: reviews || [],
    reviewScoreMedio: Number(avgReviewScore.toFixed(1)),
    reviewNegativas: (reviews || []).filter((r) => r.score != null && r.score <= 3).length,
    loyaltyMembers: loyalty || [],
    marketplaceServices: marketplace || [],
    reservasRecientes: reservations || [],
    camasBloqueadas: blockedBeds,
  };
}

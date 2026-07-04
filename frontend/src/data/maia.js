import { addDays } from '../utils/format';

const today = new Date();

function at(daysAgo, hour, minute) {
  const d = addDays(today, -daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// 5 MaiA notifications. `alerta: true` marks the 2 items that count toward the
// dashboard's "alertas de MaiA" banner; `type` drives the panel badge.
export const maiaNotifications = [
  { id: 1, type: 'precio', alerta: false, message: 'Este fin de semana hay alta demanda en la zona. Considera subir el precio a € 18–€ 22.', timestamp: at(0, 14, 5), read: false },
  { id: 2, type: 'ocupacion', alerta: false, message: 'Ocupación al 70%. Quedan 6 camas libres para mañana.', timestamp: at(0, 11, 30), read: false },
  { id: 3, type: 'aviso', alerta: true, message: 'María López tiene saldo pendiente de € 24 desde hace 3 días.', timestamp: at(1, 18, 0), read: false },
  { id: 4, type: 'precio', alerta: false, message: 'Competencia bajó precios un 15% esta semana. Precio actual parece competitivo.', timestamp: at(1, 9, 15), read: false },
  { id: 5, type: 'aviso', alerta: true, message: '3 huéspedes hacen check-out mañana antes de las 10:00.', timestamp: at(1, 8, 45), read: false },
];

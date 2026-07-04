import { addDays } from '../utils/format';

const today = new Date();

// 6 automatic message templates (mutable via AppContext) + 10 send-history entries.
export const communicationTemplates = [
  { id: 1, name: 'Confirmación de reserva', channel: 'Ambos', message: 'Hola {nombre}, tu reserva en {albergue} para el {fecha_llegada} está confirmada.', active: true },
  { id: 2, name: 'Recordatorio de check-in (24h antes)', channel: 'WhatsApp', message: 'Hola {nombre}, te esperamos mañana {fecha_llegada} en {albergue}.', active: true },
  { id: 3, name: 'Bienvenida al llegar', channel: 'WhatsApp', message: 'Bienvenido/a {nombre} a {albergue}. ¡Buen Camino!', active: true },
  { id: 4, name: 'Pago pendiente (si aplica)', channel: 'Ambos', message: 'Hola {nombre}, tienes un pago pendiente en {albergue}.', active: true },
  { id: 5, name: 'Solicitud de reseña (tras checkout)', channel: 'Email', message: 'Gracias por tu estancia en {albergue}, {nombre}. ¿Nos dejarías una reseña?', active: true },
  { id: 6, name: 'Late check-out disponible (si hay camas)', channel: 'WhatsApp', message: 'Hola {nombre}, hoy podemos ofrecerte late check-out en {albergue}.', active: false },
];

export const communicationHistory = [
  { id: 1, guestName: 'Thomas Becker', template: 'Bienvenida al llegar', channel: 'Email', date: addDays(today, -3), status: 'Enviado' },
  { id: 2, guestName: 'María López', template: 'Confirmación de reserva', channel: 'WhatsApp', date: addDays(today, -2), status: 'Enviado' },
  { id: 3, guestName: 'Emma Wilson', template: 'Recordatorio de check-in (24h antes)', channel: 'Email', date: addDays(today, -4), status: 'Enviado' },
  { id: 4, guestName: 'Lucas Fernández', template: 'Pago pendiente (si aplica)', channel: 'WhatsApp', date: addDays(today, -1), status: 'Enviado' },
  { id: 5, guestName: 'Chiara Bianchi', template: 'Bienvenida al llegar', channel: 'Email', date: addDays(today, -2), status: 'Enviado' },
  { id: 6, guestName: 'Klaus Fischer', template: 'Confirmación de reserva', channel: 'Email', date: addDays(today, -1), status: 'Fallido' },
  { id: 7, guestName: 'Marie Dupont', template: 'Solicitud de reseña (tras checkout)', channel: 'WhatsApp', date: addDays(today, -3), status: 'Enviado' },
  { id: 8, guestName: 'Robert Johnson', template: 'Recordatorio de check-in (24h antes)', channel: 'Email', date: addDays(today, -2), status: 'Enviado' },
  { id: 9, guestName: 'Ola Nowak', template: 'Solicitud de reseña (tras checkout)', channel: 'Email', date: addDays(today, -1), status: 'Enviado' },
  { id: 10, guestName: 'Yuki Tanaka', template: 'Bienvenida al llegar', channel: 'WhatsApp', date: addDays(today, -2), status: 'Enviado' },
];

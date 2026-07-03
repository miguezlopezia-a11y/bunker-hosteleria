import { addDays } from '../utils/format';

const today = new Date();

// 6 templates + 10 send history entries (prepared for Phase 2 Comunicaciones).
export const communicationTemplates = [
  { id: 1, name: 'Bienvenida' },
  { id: 2, name: 'Confirmación de reserva' },
  { id: 3, name: 'Recordatorio de llegada' },
  { id: 4, name: 'Recordatorio de pago' },
  { id: 5, name: 'Encuesta de satisfacción' },
  { id: 6, name: 'Despedida' },
];

export const communicationHistory = [
  { id: 1, guestName: 'Thomas Becker', template: 'Bienvenida', channel: 'Email', date: addDays(today, -3), status: 'enviado' },
  { id: 2, guestName: 'María López', template: 'Confirmación de reserva', channel: 'WhatsApp', date: addDays(today, -2), status: 'enviado' },
  { id: 3, guestName: 'Emma Wilson', template: 'Recordatorio de llegada', channel: 'Email', date: addDays(today, -4), status: 'enviado' },
  { id: 4, guestName: 'Lucas Fernández', template: 'Recordatorio de pago', channel: 'WhatsApp', date: addDays(today, -1), status: 'enviado' },
  { id: 5, guestName: 'Chiara Bianchi', template: 'Bienvenida', channel: 'Email', date: addDays(today, -2), status: 'enviado' },
  { id: 6, guestName: 'Klaus Fischer', template: 'Confirmación de reserva', channel: 'Email', date: addDays(today, -1), status: 'enviado' },
  { id: 7, guestName: 'Marie Dupont', template: 'Despedida', channel: 'WhatsApp', date: addDays(today, -3), status: 'enviado' },
  { id: 8, guestName: 'Robert Johnson', template: 'Recordatorio de llegada', channel: 'Email', date: addDays(today, -2), status: 'enviado' },
  { id: 9, guestName: 'Ola Nowak', template: 'Encuesta de satisfacción', channel: 'Email', date: addDays(today, -1), status: 'enviado' },
  { id: 10, guestName: 'Yuki Tanaka', template: 'Bienvenida', channel: 'WhatsApp', date: addDays(today, -2), status: 'enviado' },
];

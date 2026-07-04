import { addDays } from '../utils/format';

const today = new Date();

// 10 reservations from Booking.com, Airbnb, Hostelworld and Directo.
// Items 1-5 check in today with status "pendiente" -> matches "Llegadas hoy: 5".
// Contact data is fictional.
export const reservations = [
  { id: 1, guestName: 'Pierre Dubois', nationality: 'FR', checkin: today, checkout: addDays(today, 2), bed: '4A', room: 4, price: 32, origin: 'Booking.com', status: 'pendiente', estimatedTime: '14:00', phone: '600000015', email: 'demo15@example.com' },
  { id: 2, guestName: 'Hans Weber', nationality: 'DE', checkin: today, checkout: addDays(today, 3), bed: '4B', room: 4, price: 35, origin: 'Airbnb', status: 'pendiente', estimatedTime: '15:30', phone: '600000016', email: 'demo16@example.com' },
  { id: 3, guestName: 'Sophie Martin', nationality: 'FR', checkin: today, checkout: addDays(today, 1), bed: '4C', room: 4, price: 28, origin: 'Hostelworld', status: 'pendiente', estimatedTime: '16:00', phone: '600000017', email: 'demo17@example.com' },
  { id: 4, guestName: 'Giulia Rossi', nationality: 'IT', checkin: today, checkout: addDays(today, 4), bed: '4D', room: 4, price: 30, origin: 'Directo', status: 'pendiente', estimatedTime: '17:00', phone: '600000018', email: 'demo18@example.com' },
  { id: 5, guestName: 'John Smith', nationality: 'GB', checkin: today, checkout: addDays(today, 2), bed: '4E', room: 4, price: 32, origin: 'Booking.com', status: 'pendiente', estimatedTime: '18:30', phone: '600000019', email: 'demo19@example.com' },
  { id: 6, guestName: 'Elena Ivanova', nationality: 'RU', checkin: addDays(today, 1), checkout: addDays(today, 3), bed: '1A', room: 1, price: 33, origin: 'Airbnb', status: 'pendiente', estimatedTime: '13:00', phone: '600000020', email: 'demo20@example.com' },
  { id: 7, guestName: 'Marco Bianchi', nationality: 'IT', checkin: addDays(today, 2), checkout: addDays(today, 5), bed: '2B', room: 2, price: 29, origin: 'Hostelworld', status: 'pendiente', estimatedTime: '14:30', phone: '600000021', email: 'demo21@example.com' },
  { id: 8, guestName: 'Thomas Becker', nationality: 'DE', checkin: addDays(today, -3), checkout: today, bed: '1A', room: 1, price: 17, origin: 'Booking.com', status: 'checkin_completado', guestId: 1 },
  { id: 9, guestName: 'María López', nationality: 'ES', checkin: addDays(today, -2), checkout: today, bed: '1B', room: 1, price: 24, origin: 'Directo', status: 'checkin_completado', guestId: 2 },
  { id: 10, guestName: 'Anna Kowalski', nationality: 'PL', checkin: addDays(today, 3), checkout: addDays(today, 5), bed: '3E', room: 3, price: 31, origin: 'Booking.com', status: 'pendiente', estimatedTime: '12:00', phone: '600000022', email: 'demo22@example.com' },
];

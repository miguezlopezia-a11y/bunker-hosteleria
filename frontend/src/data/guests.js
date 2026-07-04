import { addDays } from '../utils/format';

const today = new Date();

// 14 active guests with clearly fictional personal data.
// Documents, phones and emails are demo values, not real people.
export const guests = [
  { id: 1, name: 'Thomas Becker', document: 'DEMO00001', nationality: 'DE', dob: '1988-04-12', phone: '600000001', email: 'demo1@example.com', bedId: '1A', checkin: addDays(today, -3), checkout: today, price: 17, origin: 'Booking.com', paymentStatus: 'pagado', loyaltyPoints: 17 },
  { id: 2, name: 'María López', document: 'DEMO00002', nationality: 'ES', dob: '1995-07-02', phone: '600000002', email: 'demo2@example.com', bedId: '1B', checkin: addDays(today, -2), checkout: today, price: 24, origin: 'Directo', paymentStatus: 'pendiente', loyaltyPoints: 24 },
  { id: 3, name: 'Emma Wilson', document: 'DEMO00003', nationality: 'GB', dob: '1992-11-23', phone: '600000003', email: 'demo3@example.com', bedId: '1C', checkin: addDays(today, -4), checkout: today, price: 17, origin: 'Airbnb', paymentStatus: 'pagado', loyaltyPoints: 17 },
  { id: 4, name: 'Lucas Fernández', document: 'DEMO00004', nationality: 'ES', dob: '1990-02-18', phone: '600000004', email: 'demo4@example.com', bedId: '1D', checkin: addDays(today, -1), checkout: addDays(today, 1), price: 17, origin: 'Directo', paymentStatus: 'pagado', loyaltyPoints: 17 },
  { id: 5, name: 'Chiara Bianchi', document: 'DEMO00005', nationality: 'IT', dob: '1998-06-09', phone: '600000005', email: 'demo5@example.com', bedId: '1E', checkin: addDays(today, -2), checkout: addDays(today, 2), price: 17, origin: 'Hostelworld', paymentStatus: 'pagado', loyaltyPoints: 17 },
  { id: 6, name: 'Klaus Fischer', document: 'DEMO00006', nationality: 'DE', dob: '1985-09-30', phone: '600000006', email: 'demo6@example.com', bedId: '2A', checkin: addDays(today, -1), checkout: addDays(today, 3), price: 18, origin: 'Booking.com', paymentStatus: 'pagado', loyaltyPoints: 18 },
  { id: 7, name: 'Marie Dupont', document: 'DEMO00007', nationality: 'FR', dob: '1993-03-14', phone: '600000007', email: 'demo7@example.com', bedId: '2B', checkin: addDays(today, -3), checkout: addDays(today, 1), price: 18, origin: 'Airbnb', paymentStatus: 'pagado', loyaltyPoints: 18 },
  { id: 8, name: 'Robert Johnson', document: 'DEMO00008', nationality: 'US', dob: '1980-12-01', phone: '600000008', email: 'demo8@example.com', bedId: '2C', checkin: addDays(today, -2), checkout: addDays(today, 2), price: 18, origin: 'Hostelworld', paymentStatus: 'pagado', loyaltyPoints: 18 },
  { id: 9, name: 'Ola Nowak', document: 'DEMO00009', nationality: 'PL', dob: '1997-01-27', phone: '600000009', email: 'demo9@example.com', bedId: '2D', checkin: addDays(today, -1), checkout: addDays(today, 4), price: 18, origin: 'Directo', paymentStatus: 'pagado', loyaltyPoints: 18 },
  { id: 10, name: 'Yuki Tanaka', document: 'DEMO00010', nationality: 'JP', dob: '1991-05-19', phone: '600000010', email: 'demo10@example.com', bedId: '2E', checkin: addDays(today, -2), checkout: addDays(today, 2), price: 18, origin: 'Booking.com', paymentStatus: 'pagado', loyaltyPoints: 18 },
  { id: 11, name: 'Carlos Silva', document: 'DEMO00011', nationality: 'PT', dob: '1989-08-08', phone: '600000011', email: 'demo11@example.com', bedId: '3A', checkin: addDays(today, -1), checkout: addDays(today, 3), price: 17, origin: 'Airbnb', paymentStatus: 'pagado', loyaltyPoints: 17 },
  { id: 12, name: 'Ingrid Larsen', document: 'DEMO00012', nationality: 'NO', dob: '1994-10-05', phone: '600000012', email: 'demo12@example.com', bedId: '3B', checkin: addDays(today, -3), checkout: addDays(today, 1), price: 17, origin: 'Hostelworld', paymentStatus: 'pendiente', loyaltyPoints: 17 },
  { id: 13, name: 'Fatima Al-Sayed', document: 'DEMO00013', nationality: 'AE', dob: '1996-02-21', phone: '600000013', email: 'demo13@example.com', bedId: '3C', checkin: addDays(today, -2), checkout: addDays(today, 2), price: 17, origin: 'Directo', paymentStatus: 'pagado', loyaltyPoints: 17 },
  { id: 14, name: 'Peter Novak', document: 'DEMO00014', nationality: 'CZ', dob: '1987-07-15', phone: '600000014', email: 'demo14@example.com', bedId: '3D', checkin: addDays(today, -1), checkout: addDays(today, 4), price: 17, origin: 'Booking.com', paymentStatus: 'pagado', loyaltyPoints: 17 },
];

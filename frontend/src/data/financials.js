import { addDays, formatDate } from '../utils/format';

const today = new Date();
const startOfCurrentWeek = addDays(today, -today.getDay());

// Income summary for /informes. Values follow the Phase 2 spec examples.
// Week labels are generated relative to the current date.
export const financials = {
  totalIncome: 1240,
  incomeChangePercent: 12,
  averageOccupancy: 71,
  averagePricePerBed: 16.4,
  directBookingPercent: 34,
  channelBookingPercent: 66,
  byChannel: [
    { channel: 'Booking.com', income: 820 },
    { channel: 'Airbnb', income: 280 },
    { channel: 'Directo', income: 140 },
  ],
  byWeek: [
    { week: `Semana del ${formatDate(addDays(startOfCurrentWeek, -21))}`, income: 980 },
    { week: `Semana del ${formatDate(addDays(startOfCurrentWeek, -14))}`, income: 1120 },
    { week: `Semana del ${formatDate(addDays(startOfCurrentWeek, -7))}`, income: 890 },
    { week: `Semana del ${formatDate(startOfCurrentWeek)}`, income: 1140 },
  ],
  vat: { taxBase: 1127, vatAmount: 113, rate: 10 },
};

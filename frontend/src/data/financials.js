// Income summary for /informes. Values follow the Phase 2 spec examples.
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
    { week: 'Semana 1', income: 980 },
    { week: 'Semana 2', income: 1120 },
    { week: 'Semana 3', income: 890 },
    { week: 'Semana 4', income: 1140 },
  ],
  vat: { taxBase: 1127, vatAmount: 113, rate: 10 },
};

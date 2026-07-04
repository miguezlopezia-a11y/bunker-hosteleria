import { addDays } from './format';

// Deterministic mock clock-in/out history generator (no persistence needed -
// Phase 2 spec only requires "last 30 days mock data", read-only).
export function generateClockHistory(employeeName, days = 30) {
  const records = [];
  for (let i = 1; i <= days; i += 1) {
    const date = addDays(new Date(), -i);
    const entradaMinute = 25 + (i % 20);
    const salidaMinute = i % 30;
    const horas = (7 + (i % 3) * 0.5).toFixed(1);
    const verification = i % 5 === 0 ? 'gps' : 'wifi';
    records.push({
      employeeName,
      date,
      entrada: `08:${String(entradaMinute).padStart(2, '0')}`,
      salida: `16:${String(salidaMinute).padStart(2, '0')}`,
      horas,
      verification,
    });
  }
  return records;
}

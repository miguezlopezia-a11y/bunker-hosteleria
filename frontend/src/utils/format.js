// Formatting helpers used across the whole app.
// Dates: DD/MM/YYYY, Currency: "€ 24" with a non-breaking space, times: 24h.

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatEuro(amount) {
  const rounded = Math.round(Number(amount) || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€\u00A0${formatted}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isBetweenInclusive(day, start, end) {
  const d = startOfDay(day).getTime();
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return d >= s && d < e;
}

export function addMinutes(date, minutes) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

export function formatTime(date) {
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function minutesAgo(date) {
  if (!date) return null;
  const diffMs = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.round(diffMs / 60000));
}

export function formatRelativeDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const time = formatTime(d);
  if (isSameDay(d, new Date())) return `Hoy ${time}`;
  if (isSameDay(d, addDays(new Date(), -1))) return `Ayer ${time}`;
  return `${formatDate(d)} ${time}`;
}

export function formatEuroDecimal(amount) {
  const formatted = Number(amount).toFixed(2).replace('.', ',').replace(/,00$/, '');
  return `€\u00A0${formatted}`;
}

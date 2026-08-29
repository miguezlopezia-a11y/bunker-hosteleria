import { formatTime, startOfDay } from './format';

function resolveVerificationVariant(record) {
  if (record.verificado) {
    return record.lat != null ? 'gps' : 'wifi';
  }
  return 'out_of_zone';
}

// Agrega los fichajes crudos (eventos entrada/salida) en filas por empleado y
// día: primera entrada, última salida y horas trabajadas.
export function buildHistory(fichajes) {
  const byDay = new Map();
  const sorted = [...fichajes].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  sorted.forEach((f) => {
    const day = startOfDay(new Date(f.timestamp)).toISOString();
    const key = `${f.empleado_nombre}|${day}`;
    if (!byDay.has(key)) {
      byDay.set(key, { employeeName: f.empleado_nombre, date: f.timestamp, entrada: null, salida: null, records: [] });
    }
    const item = byDay.get(key);
    item.records.push(f);
    if (f.tipo === 'entrada') item.entrada = f;
    if (f.tipo === 'salida') item.salida = f;
  });
  return Array.from(byDay.values())
    .map((item) => {
      const start = item.entrada ? new Date(item.entrada.timestamp).getTime() : null;
      const end = item.salida ? new Date(item.salida.timestamp).getTime() : null;
      let horas = '-';
      if (start && end && end > start) {
        horas = ((end - start) / 3600000).toFixed(1);
      }
      const verification = item.records.length > 0 ? resolveVerificationVariant(item.records[item.records.length - 1]) : 'wifi';
      return {
        employeeName: item.employeeName,
        date: item.date,
        entrada: item.entrada ? formatTime(item.entrada.timestamp) : '—',
        salida: item.salida ? formatTime(item.salida.timestamp) : '—',
        horas,
        verification,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

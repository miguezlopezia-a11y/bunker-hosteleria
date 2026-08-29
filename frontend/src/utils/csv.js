// Genera y descarga un CSV en el navegador (Blob + URL.createObjectURL,
// patrón estándar sin librerías). El BOM inicial hace que Excel abra
// el UTF-8 con acentos correctamente.
function escapeCell(value) {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((cells) => cells.map(escapeCell).join(','));
  const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

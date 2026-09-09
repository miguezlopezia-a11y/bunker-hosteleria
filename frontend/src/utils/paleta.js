// Paleta acotada de color de acento para la página web pública por hostal.
// Espejo EXACTO del check constraint hostales_color_acento_check
// (migrations/023_pagina_web_hostal.sql): si se amplía, se cambian ambos en
// el mismo commit. Nunca hex libre.
export const PALETA = {
  ocre: '#b45309',
  verde: '#15803d',
  azul: '#1d4ed8',
  burdeos: '#9f1239',
  pizarra: '#475569',
  coral: '#ea580c',
};

export const PALETA_OPCIONES = Object.keys(PALETA).map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
}));

export function colorAcento(clave) {
  return PALETA[clave] || PALETA.ocre;
}

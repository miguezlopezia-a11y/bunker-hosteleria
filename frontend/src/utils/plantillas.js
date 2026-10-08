import HeroGrande from '../components/public/plantillas/HeroGrande';
import HeroDividido from '../components/public/plantillas/HeroDividido';

export const PLANTILLAS = {
  DEFAULT: 'piloto_a',
  OPCIONES: [
    { value: 'piloto_a', label: 'Hero grande (foto de cabecera)' },
    { value: 'piloto_b', label: 'Hero dividido (foto + texto en paralelo)' },
  ],
};

// Único mapa de layouts: lo usan PaginaHostal y PaginaHostalView (quiz /alta).
export const LAYOUTS = {
  piloto_a: HeroGrande,
  piloto_b: HeroDividido,
};

export function layoutFor(plantilla) {
  return LAYOUTS[plantilla] || LAYOUTS[PLANTILLAS.DEFAULT];
}

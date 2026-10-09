import HeroGrande from '../components/public/plantillas/HeroGrande';
import HeroDividido from '../components/public/plantillas/HeroDividido';
import Norte from '../components/public/plantillas/Norte';
import Huella from '../components/public/plantillas/Huella';

export const PLANTILLAS = {
  DEFAULT: 'piloto_a',
  OPCIONES: [
    { value: 'piloto_a', label: 'Hero grande (foto de cabecera)' },
    { value: 'piloto_b', label: 'Hero dividido (foto + texto en paralelo)' },
    { value: 'norte', label: 'Norte (oscuro duotone, premium)' },
    { value: 'huella', label: 'Huella (claro minimal, premium)' },
  ],
};

// Único mapa de layouts: lo usan PaginaHostal y PaginaHostalView (quiz /alta).
export const LAYOUTS = {
  piloto_a: HeroGrande,
  piloto_b: HeroDividido,
  norte: Norte,
  huella: Huella,
};

export function layoutFor(plantilla) {
  return LAYOUTS[plantilla] || LAYOUTS[PLANTILLAS.DEFAULT];
}

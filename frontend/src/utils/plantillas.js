import HeroGrande from '../components/public/plantillas/HeroGrande';
import HeroDividido from '../components/public/plantillas/HeroDividido';
import TailblocksHeroA from '../components/public/plantillas/TailblocksHeroA';
import HyperuiSectionMedia from '../components/public/plantillas/HyperuiSectionMedia';
import FlowbiteHeroDefault from '../components/public/plantillas/FlowbiteHeroDefault';

export const PLANTILLAS = {
  DEFAULT: 'piloto_a',
  OPCIONES: [
    { value: 'piloto_a', label: 'Hero grande (foto de cabecera)' },
    { value: 'piloto_b', label: 'Hero dividido (foto + texto en paralelo)' },
    { value: 'tb_hero_a', label: 'Tailblocks Hero A (texto + foto en columnas)' },
    { value: 'hyperui_section_12', label: 'HyperUI Sección 1/2 (texto + imagen)' },
    { value: 'flowbite_hero_default', label: 'Flowbite Hero por defecto (centrado, con badge)' },
  ],
};

// Mapa único de layouts: lo usan tanto PaginaHostal como PaginaHostalView
// (quiz /alta). Duplicarlo hace que una variante nueva funcione en la
// página pública pero caiga al default en la vista previa.
export const LAYOUTS = {
  piloto_a: HeroGrande,
  piloto_b: HeroDividido,
  tb_hero_a: TailblocksHeroA,
  hyperui_section_12: HyperuiSectionMedia,
  flowbite_hero_default: FlowbiteHeroDefault,
};

export function layoutFor(plantilla) {
  return LAYOUTS[plantilla] || LAYOUTS[PLANTILLAS.DEFAULT];
}

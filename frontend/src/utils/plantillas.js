import HeroGrande from '../components/public/plantillas/HeroGrande';
import HeroDividido from '../components/public/plantillas/HeroDividido';
import TailblocksHeroA from '../components/public/plantillas/TailblocksHeroA';
import TailblocksHeroB from '../components/public/plantillas/TailblocksHeroB';
import TailblocksHeroC from '../components/public/plantillas/TailblocksHeroC';
import TailblocksHeroD from '../components/public/plantillas/TailblocksHeroD';
import TailblocksHeroE from '../components/public/plantillas/TailblocksHeroE';
import TailblocksHeroF from '../components/public/plantillas/TailblocksHeroF';
import TailblocksHeroADark from '../components/public/plantillas/TailblocksHeroADark';
import TailblocksHeroBDark from '../components/public/plantillas/TailblocksHeroBDark';
import TailblocksHeroCDark from '../components/public/plantillas/TailblocksHeroCDark';
import TailblocksHeroDDark from '../components/public/plantillas/TailblocksHeroDDark';
import TailblocksHeroEDark from '../components/public/plantillas/TailblocksHeroEDark';
import TailblocksHeroFDark from '../components/public/plantillas/TailblocksHeroFDark';
import HyperuiSectionMedia from '../components/public/plantillas/HyperuiSectionMedia';
import HyperuiSection23 from '../components/public/plantillas/HyperuiSection23';
import HyperuiSection32 from '../components/public/plantillas/HyperuiSection32';
import HyperuiSectionVertical from '../components/public/plantillas/HyperuiSectionVertical';
import FlowbiteHeroDefault from '../components/public/plantillas/FlowbiteHeroDefault';
import FlowbiteVisualHeading from '../components/public/plantillas/FlowbiteVisualHeading';
import Norte from '../components/public/plantillas/Norte';
import Huella from '../components/public/plantillas/Huella';

export const PLANTILLAS = {
  DEFAULT: 'piloto_a',
  OPCIONES: [
    { value: 'piloto_a', label: 'Hero grande (foto de cabecera)' },
    { value: 'piloto_b', label: 'Hero dividido (foto + texto en paralelo)' },
    { value: 'tb_hero_a', label: 'Tailblocks Hero A (texto + foto en columnas)' },
    { value: 'tb_hero_b', label: 'Tailblocks Hero B (centrado, imagen arriba)' },
    { value: 'tb_hero_c', label: 'Tailblocks Hero C (imagen izquierda + texto)' },
    { value: 'tb_hero_d', label: 'Tailblocks Hero D (texto + nota + imagen)' },
    { value: 'tb_hero_e', label: 'Tailblocks Hero E (imagen + texto + nota)' },
    { value: 'tb_hero_f', label: 'Tailblocks Hero F (centrado con nota)' },
    { value: 'tb_hero_a_dark', label: 'Tailblocks Hero A oscuro' },
    { value: 'tb_hero_b_dark', label: 'Tailblocks Hero B oscuro' },
    { value: 'tb_hero_c_dark', label: 'Tailblocks Hero C oscuro' },
    { value: 'tb_hero_d_dark', label: 'Tailblocks Hero D oscuro' },
    { value: 'tb_hero_e_dark', label: 'Tailblocks Hero E oscuro' },
    { value: 'tb_hero_f_dark', label: 'Tailblocks Hero F oscuro' },
    { value: 'hyperui_section_12', label: 'HyperUI Sección 1/2 (texto + imagen)' },
    { value: 'hyperui_section_23', label: 'HyperUI Sección 2/3 (imagen amplia derecha)' },
    { value: 'hyperui_section_32', label: 'HyperUI Sección 3/2 (imagen amplia izquierda)' },
    { value: 'hyperui_section_vertical', label: 'HyperUI Sección vertical (imagen a todo lo ancho)' },
    { value: 'flowbite_hero_default', label: 'Flowbite Hero por defecto (centrado, con badge)' },
    { value: 'flowbite_visual_heading', label: 'Flowbite Hero visual (texto + imagen en grid)' },
    { value: 'norte', label: 'Norte (oscuro duotone, premium)' },
    { value: 'huella', label: 'Huella (claro minimal, premium)' },
  ],
};

// Mapa único de layouts: lo usan tanto PaginaHostal como PaginaHostalView
// (quiz /alta). Duplicarlo hace que una variante nueva funcione en la
// página pública pero caiga al default en la vista previa.
export const LAYOUTS = {
  piloto_a: HeroGrande,
  piloto_b: HeroDividido,
  tb_hero_a: TailblocksHeroA,
  tb_hero_b: TailblocksHeroB,
  tb_hero_c: TailblocksHeroC,
  tb_hero_d: TailblocksHeroD,
  tb_hero_e: TailblocksHeroE,
  tb_hero_f: TailblocksHeroF,
  tb_hero_a_dark: TailblocksHeroADark,
  tb_hero_b_dark: TailblocksHeroBDark,
  tb_hero_c_dark: TailblocksHeroCDark,
  tb_hero_d_dark: TailblocksHeroDDark,
  tb_hero_e_dark: TailblocksHeroEDark,
  tb_hero_f_dark: TailblocksHeroFDark,
  hyperui_section_12: HyperuiSectionMedia,
  hyperui_section_23: HyperuiSection23,
  hyperui_section_32: HyperuiSection32,
  hyperui_section_vertical: HyperuiSectionVertical,
  flowbite_hero_default: FlowbiteHeroDefault,
  flowbite_visual_heading: FlowbiteVisualHeading,
  norte: Norte,
  huella: Huella,
};

export function layoutFor(plantilla) {
  return LAYOUTS[plantilla] || LAYOUTS[PLANTILLAS.DEFAULT];
}

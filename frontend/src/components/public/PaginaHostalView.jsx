import React, { useEffect, useState } from 'react';
import HeroGrande from './plantillas/HeroGrande';
import HeroDividido from './plantillas/HeroDividido';
import { PLANTILLAS } from '../../utils/plantillas';

const LAYOUTS = { piloto_a: HeroGrande, piloto_b: HeroDividido };

function layoutFor(plantilla) {
  return LAYOUTS[plantilla] || LAYOUTS[PLANTILLAS.DEFAULT];
}

// Wrapper fino: usado por el quiz de alta (/alta) para la vista previa.
export default function PaginaHostalView({ pagina, beds = [], preview = false, slug }) {
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSuccess(false);
  }, [pagina]);

  const Layout = layoutFor(pagina.plantilla);
  return (
    <div data-testid={preview ? 'pagina-hostal-preview' : 'pagina-hostal-page'}>
      <Layout
        pagina={pagina}
        beds={beds}
        slug={slug}
        preview={preview}
        success={success}
        onSuccess={() => setSuccess(true)}
      />
    </div>
  );
}

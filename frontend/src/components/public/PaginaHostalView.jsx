import React, { useEffect, useState } from 'react';
import { layoutFor } from '../../utils/plantillas';

// Wrapper fino: usado por el quiz de alta (/alta) para la vista previa.
// El mapa de layouts vive en utils/plantillas.js (compartido con PaginaHostal).

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

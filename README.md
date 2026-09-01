# BunkerHostal

PMS ligero para albergues y hostales: panel de gestión, web pública de reservas directas, portal del empleado, asistente MaiA, marketplace de servicios y directorio de albergues.

> **Estado:** Fase 3 completa. Frontend conectado a Supabase (auth y datos reales): fichaje (con exportación CSV real, admin y empleado), limpieza, reservas, camas, habitaciones, empleados, marketplace, fidelización, notificaciones y directorio público (`/directorio`, vía RPC `list_public_hostales` — requiere `migrations/006_list_public_hostales.sql` aplicada) son reales, sin mocks. Las alertas críticas y el chat de MaiA también son reales (Edge Functions `maia-critical-alert` y `maia-chat` desplegadas). El check-in es real end-to-end: el paso 2 verifica el documento vía skill-policia (OCR de zona MRZ) y el paso 3 genera y valida la firma digital vía skill-firma. **Siguen sin conectar:** pagos (Stripe — no hay pasarela integrada) y Channel Manager (Booking.com/Airbnb — solo estado local en la app; conectar canales reales requiere acuerdos de partner con cada plataforma, decisión de negocio pendiente).

## Estructura del repo

```
bunker-hosteleria/
├── frontend/          # CRA + React 18 + React Router 6 + Tailwind CSS 3
└── migrations/        # SQL aplicado en Supabase (trazabilidad de esquema)
```

## Arranque rápido

```bash
cd frontend
npm install
npm start          # http://localhost:3000
npm run build      # build de producción en build/
npm test           # tests con CRA
```

## Login

El acceso es con **email y contraseña reales** (Supabase Auth). No hay PINs ni usuarios de demo embebidos en el código: hay que darse de alta como usuario en Supabase Auth y vincularlo a un hostal en la tabla `hostaleros`.

## Funcionalidades principales

### Fase 2
- Dashboard con KPIs, llegadas/hoy y enlace de reserva directa.
- Reservas: lista, calendario de camas y Channel Manager con Modo Directo.
- Check-in en 3 pasos y huéspedes activos.
- Comunicaciones, fichaje del equipo, limpieza e informes.
- MaiA: asistente conversacional y notificaciones.
- Portal del empleado: tareas y fichaje.
- Web pública (`/web`): reserva directa sin comisiones.

### Fase 3
- Fidelización: programa de puntos y ranking de peregrinos.
- Marketplace: servicios locales con descuentos para peregrinos.
- Directorio público (`/directorio`): listado de albergues del Camino.

## Decisiones técnicas

- **Sin dependencias de componentes pesadas:** no usa shadcn/ui, Radix, Lucide ni Recharts.
- **Sin tracking ni fuentes externas:** no hay PostHog, Google Fonts ni scripts de terceros.
- **Estado:** gestión centralizada en `AppContext` con persistencia limitada a sesión y preferencias no sensibles.
- **PWA básica:** manifest + service worker + iconos PNG/SVG para cache offline de la shell.
- **Tests:** smoke tests con React Testing Library.

## Seguridad

- Security Advisor de Supabase (2026-09-01): vista `maia_red_camino` (fuga real, ver `migrations/012`) y grants `EXECUTE` internos (`migrations/013`) corregidos. Pendiente sin resolver: "Prevent use of leaked passwords" en Auth requiere plan Pro o superior de Supabase, no disponible en el plan actual.

## Notas legales/mock

- Todos los documentos, teléfonos y emails de los datos de demo son ficticios.
- Los textos legales (RGPD, ET art. 34.9, IVA reducido) son orientativos y deben revisarse con un asesor antes de producción.

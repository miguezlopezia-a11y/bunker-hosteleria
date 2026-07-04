# BunkerHostal

Prototipo UI de un PMS ligero para albergues y hostales: panel de gestión, web pública de reservas directas, portal del empleado, asistente MaiA, marketplace de servicios y directorio de albergues.

> **Estado:** Fase 3 completa. Prototipo visual/mock para validar flujos de usuario. No está conectado a APIs reales de pagos, policía, firma ni alertas.

## Estructura del repo

```
bunker-hosteleria/
├── frontend/          # CRA + React 18 + React Router 6 + Tailwind CSS 3
├── EMERGENT_FASE1.md
├── EMERGENT_FASE2.md
├── EMERGENT_FASE3.md
└── EMERGENT_HOSTELERIA.md
```

## Arranque rápido

```bash
cd frontend
npm install
npm start          # http://localhost:3000
npm run build      # build de producción en build/
npm test           # tests con CRA
```

## Usuarios de demo

| Rol         | PIN  | Flujo rápido                      |
|-------------|------|-----------------------------------|
| Director    | 1234 | Panel completo                   |
| Recepción   | 1234 | Panel completo                   |
| Empleado    | 1234 | Seleccionar empleado en login    |

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

## Notas legales/mock

- Todos los documentos, teléfonos y emails de los datos de demo son ficticios.
- Los textos legales (RGPD, ET art. 34.9, IVA reducido) son orientativos y deben revisarse con un asesor antes de producción.

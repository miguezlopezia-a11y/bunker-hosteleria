# BunkerHostal

PMS ligero para albergues y hostales: panel de gestión, web pública de reservas directas, portal del empleado, asistente MaiA, marketplace de servicios y directorio de albergues.

> **Estado y arquitectura:** la fuente única es `shared/biografia-tecnica-aloxate.md` (bunker-2026) — qué es real, qué es demo, qué está bloqueado y el inventario completo. Este README solo cubre el arranque del repo.

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

## Seguridad y bloqueantes

- El estado de seguridad real (incluida la migración 013, que resultó **inefectiva**, y los hallazgos activos de la auditoría 2026-09-10) y los bloqueantes de beta (dominio/email/Resend, SES Hospedajes) están en `shared/biografia-tecnica-aloxate.md` §1/§10 y `shared/auditoria-seguridad-hosteleria.md`. No duplicar aquí: este README quedó desactualizado una vez por eso.

## Imagen de prueba para el escaneo de check-in (paso 2)

- La imagen con MRZ real que el OCR (Tesseract) lee correctamente vive **solo** en el VPS: `root@46.224.0.226:/root/dni_test.png` (44KB, verificada 2026-08-31 con `skill_policia.py scan`, todos los `mrz_checks` en `true`).
- Las imágenes `dni_test.png`/`dni_test_v2.png` de `bunker-2026/test/` en local **no son la misma** (5-6KB, nunca verificadas) — el OCR no las lee. No usarlas para probar el check-in.
- Para bajarla: `scp root@46.224.0.226:/root/dni_test.png ./dni_test_real.png`.

## Notas legales/mock

- Todos los documentos, teléfonos y emails de los datos de demo son ficticios.
- Los textos legales (RGPD, ET art. 34.9, IVA reducido) son orientativos y deben revisarse con un asesor antes de producción.

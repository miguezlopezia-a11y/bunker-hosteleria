# BunkerHostal — Frontend

Prototipo UI standalone del panel de gestión y la web pública de BunkerHostal.

## Tecnologías

- Create React App
- React 18
- React Router 6
- Tailwind CSS 3

## Scripts

- `npm start` — modo desarrollo en [http://localhost:3000](http://localhost:3000)
- `npm run build` — build de producción en `build/`
- `npm test` — ejecuta la suite de tests (CRA)

## Estructura

- `src/components/` — componentes reutilizables (Input, Select, Button, Modal, Card, etc.)
- `src/pages/` — vistas del panel y la web pública (`/web`, `/directorio`)
- `src/context/` — estado global (AppContext, ToastContext)
- `src/data/` — datos mock para el prototipo
- `src/utils/` — helpers de formato y fecha
- `src/App.test.js` — smoke tests principales

## Notas

- Este frontend es un **mock visual** para validar flujos de usuario.
- No está conectado a servicios reales de pagos, policía, firma ni alertas.
- No se incluye tracking, analytics ni fuentes externas.
- Incluye service worker básico para comportamiento PWA offline.

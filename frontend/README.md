# BunkerHostal — Frontend

Frontend del panel de gestión y la web pública de BunkerHostal.

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

- El frontend se conecta a Supabase (auth y datos reales); el check-in usa las APIs reales de policía y firma (`/api/policia/*`, `/api/firma/*` tras Caddy). Las alertas críticas y el chat de MaiA usan Edge Functions reales de Supabase; el directorio público lista albergues reales vía la RPC `list_public_hostales`.
- Pagos (Stripe) y Channel Manager (Booking.com/Airbnb) siguen sin conectar a servicios externos — el Channel Manager es solo estado local en la app.
- No se incluye tracking, analytics ni fuentes externas.
- Incluye service worker básico para comportamiento PWA offline.

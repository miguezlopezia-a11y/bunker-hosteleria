# BunkerHostal — PRD & Progress

## Original problem statement
BunkerHostal Phase 1: Core Management & Direct Booking. Frontend-only (CRA + Tailwind v3 +
react-router-dom), no backend, no real auth, all mock/hardcoded data. Delivers the hostel
owner/receptionist daily workflow (login, dashboard, reservations, 3-step check-in, active
guests + payment links) plus the public direct-booking page `/web`. Full spec covers: design
system (blue-600 primary, no shadcn/Radix/Lucide/Recharts), formatting conventions (DD/MM/YYYY,
€ with non-breaking space, digits-only phone, 2-letter nationality), custom reusable components
(Button/Input/Select/Card/Badge/Modal/Toast/BottomNav/StatusDot/ProgressBar/Tabs), mock data
files in src/data/, a single AppContext persisted to localStorage key `bunkerhostal_state`,
routing/role protection for Director/Recepción/Empleado, and 6 manager/public views (Dashboard,
Reservas Lista+Calendario, Check-in wizard, Huéspedes+Pagos, `/web` public booking, `/empleado`
placeholder).

## User choices (gathered via ask_human)
1. Remove/ignore the scaffolded FastAPI+MongoDB backend entirely — app is 100% frontend.
2. Use real hostel slugs (albergue-el-camino, albergue-los-pinos, hostal-santa-maria) everywhere
   `/web` is linked (sidebar, dashboard, etc.), not a placeholder slug.
3. All UI text in Spanish; code/comments in English.
4. No logo/branding image — text-only "BunkerHostal" title.

## Architecture
- Create React App (craco) + Tailwind CSS v3, react-router-dom.
- No shadcn/ui, Radix, Lucide, Recharts — all UI components hand-built in `src/components/`.
- State: single Context `src/context/AppContext.jsx` (session, guests, reservations, rooms,
  beds, employees, tasks, notifications, integrations, modoDirecto) persisted to
  `localStorage['bunkerhostal_state']`, restored on load, cleared on logout.
- Toasts via separate `src/context/ToastContext.jsx`.
- Mock data: `src/data/{hostels,guests,reservations,employees,rooms,beds,channels,
  communications,financials,marketplace,loyalty,maia,camino}.js`, all dates generated relative
  to `new Date()`.
- Pages: `src/pages/{Login,Dashboard,Reservas,Checkin,Huespedes,NotFound}.jsx`,
  `src/pages/employee/EmployeePlaceholder.jsx`, `src/pages/public/Web.jsx`.
- Formatting helpers centralized in `src/utils/format.js` (formatDate → DD/MM/YYYY, formatEuro →
  "€ 24" with non-breaking space, addDays, isSameDay, isBetweenInclusive).

## What's been implemented (Feb 2026)
- Login with Albergue/PIN/Rol/Empleado-conditional dropdown, redirects by role.
- Route protection (ProtectedRoute) for manager vs. empleado vs. unauthenticated; 404 page.
- Dashboard: date/hostel/occupancy header, 3 summary cards (Llegadas/Salidas/Disponibles),
  collapsible Camino de Santiago widget, MaiA + payment alert banners, Llegadas pendientes with
  Check-in buttons, Huéspedes activos compact list.
- Reservas: Lista tab (10 mock reservations, origin/status badges, Check-in/Ver buttons) +
  Calendario tab (4 rooms × 5 beds × 7 days grid, mobile Anterior/Siguiente 3-day window, click
  occupied cell → guest modal); "+ Nueva reserva" modal with full inline validation.
- Check-in: 3-step wizard (datos, escaneo simulado, firma simulada) with progress bar and
  success screen showing the assigned bed; mutates Context (adds guest, occupies bed, updates
  reservation status).
- Huéspedes: search, detail modal (full info + loyalty points), payment-status badge, "Enviar
  enlace de pago" modal (WhatsApp/Email, toast "Enlace enviado"), Check-out button (only when
  checking out today) that frees the bed.
- Public `/web?hostel={slug}`: per-hostel header/subtitle/price, availability checker reading
  live Context bed status, bed list, reservation form with full validation (email format, phone
  digits-only, conditions checkbox), payment-method-dependent submit label, success screen, trust
  signals, footer link.
- `/empleado` placeholder for Empleado role.
- Desktop Sidebar (260px, Phase-2 items disabled with "Próximamente" badges) + mobile BottomNav
  (5 tabs incl. Operaciones slide-up drawer), both with active-route highlighting; Escape/overlay
  close on all modals/drawers.
- Bug fixes from 1st testing round: `/web` subtitle price now uses `hostel.basePrice` (was
  hardcoded €15 for all hostels); PaymentLinkModal "Importe" now syncs with the selected guest via
  `useEffect` (was stuck at 0 due to always-mounted modal + stale initial state).

## Testing status
`testing_agent_v3` ran a full frontend-only pass (no backend by design) covering login/role
redirects, route protection, dashboard figures, reservations list+calendar+validation, full
check-in wizard, huéspedes search/detail/payment/checkout, public booking for all 3 hostel slugs
+ validation, empleado placeholder, nav/drawer/modal Escape behavior, and localStorage
persistence/logout. Result: ~92% pass rate, 2 real bugs found and fixed (see above). No critical
or blocking issues remain.

## Prioritized backlog (Phase 2/3, deferred by design)
- P1: Comunicaciones (plantillas + historial ya en `src/data/communications.js`).
- P1: Fichaje de equipo (clock-in/out, `employees[].clockedIn` already in Context).
- P1: Limpieza (task board, `rooms[].cleaningStatus` + `tasks` already in Context).
- P2: Informes (uses `src/data/financials.js`).
- P2: Fidelización (uses `src/data/loyalty.js`).
- P2: Marketplace (uses `src/data/marketplace.js`).
- P2: MaiA full panel (uses `src/data/maia.js` + `notifications` in Context).
- P2: Configuración, Modo Directo toggle, Channel Manager (booking/airbnb/hostelworld sync).
- P3: `/directorio` page.

## Next tasks
- Wire a real backend/auth once the product moves past pure-mock Phase 1 (not requested yet).
- Consider persisting per-day bed occupancy precisely for the calendar (currently derived from
  each guest's checkin/checkout range, which is a reasonable approximation for mock data).

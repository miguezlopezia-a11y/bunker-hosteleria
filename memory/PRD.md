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

---

## Phase 2 — Operations & Team (Feb 2026)

### User choices (gathered via ask_human)
1. Fichaje location verification mock always succeeds ("WiFi albergue verificado").
2. MaiA chat gives keyword-based varied mock answers (camas/ocupación/pago/precio + fallback).
3. Employee portal navigates Fichar↔Historial via small tabs at the top (`EmployeeTabs`).
4. Recepción has full access to all Phase 2 pages like Director, except cannot add employees or
   disconnect integrations in Configuración (Director-only).

### What's been implemented
- Reservas: added 3rd "Channel Manager" tab — Modo Directo toggle (zeroes external-channel
  availability while `/web` keeps reading real `beds`/`rooms`), per-channel connect toggles
  (Booking.com/Airbnb/Hostelworld) backed by shared `integrations` state, "Sincronizar ahora"
  updating `channelSync` timestamps, and a reservation inbox.
- Comunicaciones (`/comunicaciones`): 6 mutable templates (Toggle ON/OFF + edit modal with
  canal/mensaje/activo), 10-row send history table.
- Fichaje equipo manager (`/fichaje`): live team status cards (Trabajando/Fuera/Sin fichar +
  verification badge), 30-day combined historial table (generated deterministically via
  `utils/clockHistory.js`), CSV export toast, weekly hours-vs-contracted summary.
- Employee portal (`/empleado`) fully replaces the Phase 1 placeholder: Fichar card (clock
  in/out with a 900ms mock "Verificando ubicación..." delay, always succeeds), Tareas del día
  (own pending/done cleaning tasks with "Marcar como lista" → updates the task + related room +
  triggers a mock 1s external-channel sync), progress bar. `/empleado/historial` shows the same
  employee's own read-only 30-day log.
- Limpieza (`/limpieza`): room grid with clean/cleaning/dirty/blocked badges + external-sync
  badges when clean, "Asignar tarea" modal (Director only) creating a new task + marking the
  room dirty, "Log de limpieza" tab listing today's completed tasks.
- Informes (`/informes`): 4 metric cards, per-channel income bars (plain divs, no chart lib),
  IVA estimate card, CSV export toast.
- Configuración (`/configuracion`): editable hostel info (persists to `session.hostel`),
  employee list + "Añadir empleado" (Director only), integrations connect/disconnect (shared
  state with Channel Manager), mock fichaje-radius slider, logout.
- MaiA panel (`/maia`): 5 notifications (Precio/Ocupación/Aviso badges, "Marcar leído"), fixed
  bottom keyword-based mock chat (camas/ocupación/pago/precio + generic fallback), last 3
  exchanges shown.
- Nav: Sidebar + BottomNav "Operaciones" drawer now link to all 4 new manager pages; MaiA bottom
  tab enabled; Fidelización/Marketplace remain disabled "Próximamente" (Phase 3).
- New shared components: `Toggle.jsx` (switch), `EmployeeTabs.jsx`. New data: `tasks.js`;
  extended `rooms.js`, `employees.js`, `channels.js`, `communications.js`, `financials.js`,
  `maia.js`, `hostels.js` (added `email`). `AppContext.jsx` extended with `integrations`
  (booleans), `channelSync`, `tasks`, `communicationTemplates` + 14 new mutation actions, all
  persisted to the same `bunkerhostal_state` localStorage key with a Phase 1→2 shape-migration
  safety net in `loadState()`.

### Testing status
`testing_agent_v3` ran a full Phase 2 pass (deterministic Playwright + code review): 100% of
tested flows passed, zero functional bugs. It also specifically re-investigated and could NOT
reproduce a suspected fichar/task race condition I flagged from my own quick smoke test — root
cause confirmed as a force=True click landing on a shifted element during my rushed script, not
an app bug. One low-priority non-blocking note: `bottom-nav-operaciones` was occasionally flaky
under Playwright's `force=True` click (raw JS click always worked); worth a glance on real mobile
devices but not treated as a defect.

### Prioritized backlog (Phase 3, deferred by design)
- P2: Fidelización (loyalty points program, uses `src/data/loyalty.js`).
- P2: Marketplace (local services, uses `src/data/marketplace.js`).
- P3: `/directorio` page.

---

## Phase 3 — Growth & Public Extras (Feb 2026)

### User choices (gathered via ask_human)
1. Marketplace "Añadir servicio"/"Gestionar" persist in Context immediately (like Comunicaciones
   templates in Phase 2).
2. Hostels assigned `comunidad` by real city: Albergue El Camino (Pamplona)=Navarra, Albergue Los
   Pinos (Logroño)=La Rioja, Hostal Santa María (Burgos)=Castilla y León; Galicia filter yields a
   valid empty-state demo (no matching hostel).
3. Mock star ratings 4.5–4.9 per hostel.

### What's been implemented
- Fidelizacion (`/fidelizacion`): informational BETA page — status card, 3 "Cómo funciona" cards,
  read-only ranking table from `src/data/loyalty.js` (extended with `routesCompleted`/
  `lastCamino`), disabled CTA with tooltip.
- Marketplace (`/marketplace`): 4 mock services from `src/data/marketplace.js` (restructured with
  `discount`/`phone`), "+ Añadir servicio" and "Gestionar" share one modal/form, both persist via
  new `AppContext` state `marketplaceServices` + `addMarketplaceService`/`updateMarketplaceService`
  actions; static "Comisiones" card.
- Directorio (`/directorio`, new **public** route, no auth): search + Comunidad + Capacidad
  filters over `src/data/hostels.js` (extended with `comunidad`/`rating`), hostel cards linking to
  `/web?hostel={slug}`, map placeholder, footer CTA, empty state. Sets `document.title` +
  `<meta name="description">` dynamically via `useEffect` (no react-helmet).
- `/web` (Phase 1 page) extended with the same dynamic SEO `useEffect`, producing per-hostel
  titles like "Albergue El Camino · Pamplona · Reserva directa".
- `public/manifest.json` created (name/short_name/theme_color `#2563eb`/start_url+scope `/web`,
  no icons, no service worker) and linked from `public/index.html`.
- Nav: Fidelización + Marketplace moved from disabled "Próximamente" to fully enabled links in
  both `Sidebar.jsx` and the `BottomNav.jsx` Operaciones drawer.
- Also shipped (post-Phase-2 user requests): Dashboard "Modo Directo activo" indicator banner
  (links to Reservas) and a "Compartir enlace de reserva directa" card (copy-to-clipboard with
  execCommand fallback + "Enviar por WhatsApp" via wa.me).

### Testing status
`testing_agent_v3` ran a full Phase 3 pass: 100% pass rate, zero bugs. Verified public access to
`/directorio` without login, all filters (incl. Galicia empty state), per-hostel SEO title/meta on
both `/directorio` and `/web`, manifest.json validity, Marketplace add/edit/persist flow, and the
2 post-Phase-2 Dashboard additions. One non-blocking note: Playwright's `force=True` click on the
mobile "Operaciones" button was occasionally flaky (raw JS click always worked) — same known
automation-only quirk noted in the Phase 2 report, not an app defect.

### Next tasks
All 3 planned phases of the BunkerHostal spec are now complete end-to-end (mock/frontend-only, as
scoped). Natural next steps if the product continues: wire a real backend + auth, real Stripe/SES
Hospedajes/Booking.com/Airbnb integrations, and a real map for the Directorio.

# StockPilot — Frontend (UI Module)

AI-based inventory management dashboard. This is the **frontend-first** build:
every page runs against mock data in `src/data/mockData.js` so the full UI is
usable and demoable before the backend exists.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. Log in with any demo account shown on the
login screen — password is `password123` for all three (Admin / Manager /
Employee). Role changes what's visible in the sidebar (e.g. Employees don't
see Suppliers, Purchases, Reports, or AI Insights).

## Design system

- **Palette**: cool graphite / paper base (not warm cream), a hazard-signage
  yellow (`signal`) as the single bold accent, plus functional stock-state
  colors (green/amber/red) that carry real meaning — they mirror in-stock /
  low-stock / out-of-stock everywhere in the app.
- **Type**: Big Shoulders Display (condensed, stencil-adjacent) for headings,
  Inter for body text, IBM Plex Mono for SKUs, quantities, and all numeric
  data — reinforces the "shipping manifest" feel.
- **Signature motif**: the `StockTape` component (`src/components/common/StockTape.jsx`)
  — a hazard-tape striped bar used on the product table and dashboard to show
  stock level at a glance.
- Dark/light mode via `ThemeContext`, toggled from the top bar, persisted to
  `localStorage`.

## Structure

```
src/
  components/common/    Reusable primitives (Button, Card, Modal, Table, Toast...)
  components/layout/     Sidebar, Topbar, DashboardLayout
  components/dashboard/  Stat cards, charts, activity feed, AI panel
  components/ai/         Floating chat assistant widget
  context/                Theme + Auth (mock) providers
  data/mockData.js       Stand-in for backend API responses
  pages/                  One file per route
  routes/ProtectedRoute.jsx
```

## Swapping mock data for the real API (next modules)

Every page currently imports directly from `src/data/mockData.js`. When the
backend module is built:

1. Add `src/services/*.js` (axios wrappers per resource: `productService.js`, etc.)
2. Replace `AuthContext`'s mock `login()` with a real `POST /api/auth/login`
   call that stores a JWT instead of a plain user object.
3. Swap each page's mock import for a `useEffect` + service call, adding the
   loading/error states the `Loader`/`EmptyState` components already support.

No component structure needs to change — only the data source.

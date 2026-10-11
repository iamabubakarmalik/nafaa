# Dashboard

One engine renders every industry's dashboard. An industry only describes
*what* to show; layout, privacy, customization and styling come from here.

```
modules/dashboard/
  engine/     DashboardView (header, grid, Customize + Guide dialogs),
              layout persistence, chart theme, privacy masking, shared parts,
              small SVG charts (sparkline, progress ring)
  widgets/    widgets any industry can use (commonWidgets.*) and the
              headline-number catalog (commonKpis)
  day-report/ end-of-day report: widget, /day-report page, WhatsApp/print export
  data/       React Query hooks shared by widgets
  components/ AllShopsDashboard (owner's cross-branch view), SubscriptionBanner
  pages/      DashboardGate (picks the industry dashboard), legacy DashboardPage
industries/<id>/dashboard/
  config.ts   widgets in default order, header action, guide
  widgets.tsx widgets only this industry needs
```

## Adding an industry

1. Create `industries/<id>/dashboard/config.ts` exporting a `DashboardConfig`:
   industry KPIs (`KpiDef`) plus `commonKpiList`, the default KPI ids, an
   `attention` widget of your own, then widgets from `commonWidgets`.
2. Add `<Name>Dashboard.tsx` that renders `<DashboardView config={...} />`.
3. Point the industry pack's `dashboardComponent` and the `DashboardGate`
   entry at it, then delete the old dashboard page.

Migrated so far: **bakery**, **retail**. Other industries still use their
old pages until they are moved.

## Rules

- Widget ids are saved in user layouts. Never rename one; add a new id instead.
- Mark a widget `sensitive` if it shows cost, profit or margins. The engine
  hides it while cost is locked or the user lacks `cost.view`.
- Format money with `useMasked()` (`sales()` / `cost()`), never `formatPKR`
  directly, for anything a cashier should not see.
- Use the shared query hooks in `data/` so widgets share requests and the
  app's cache invalidation after a sale keeps them fresh.
- Call widget factories at module level, not inside components.

## What users can change

Customize → **Hisse**: show/hide, drag (or arrows) to reorder, width S/M/L/Full
from the widget's `sizes`. **Numbers**: up to 8 headline cards from the
config's `kpis`. **Target**: daily sales target shown as a ring on the hero.

## Data

- `GET /dashboard/day-report?date=YYYY-MM-DD` — one business day: cash
  drawer, items and categories sold, payments, expenses, staff.
- `GET /dashboard/insights?days=7|30|90` — categories, staff, weekdays,
  top customers, last six months.
- Both use the tenant timezone and business-day start hour.

## Layout storage

`GET/PUT /preferences/dashboard` stores `{ order, hidden, sizes, kpis, target }`
per user, with a local copy for offline start. Widgets added later appear at
the end.

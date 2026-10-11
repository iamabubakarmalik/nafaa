# Dashboard

One engine renders every industry's dashboard. An industry only describes
*what* to show; layout, privacy, customization and styling come from here.

```
modules/dashboard/
  engine/     DashboardView (header, grid, Customize + Guide dialogs),
              layout persistence, chart theme, privacy masking, shared parts
  widgets/    widgets any industry can use (commonWidgets.*)
  data/       React Query hooks shared by widgets
  components/ AllShopsDashboard (owner's cross-branch view), SubscriptionBanner
  pages/      DashboardGate (picks the industry dashboard), legacy DashboardPage
industries/<id>/dashboard/
  config.ts   widgets in default order, header action, guide
  widgets.tsx widgets only this industry needs
```

## Adding an industry

1. Create `industries/<id>/dashboard/config.ts` exporting a `DashboardConfig`.
   Start with `kpis` and `attention` widgets of your own, then pick from
   `commonWidgets`.
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

## Layout storage

`GET/PUT /preferences/dashboard` stores `{ order, hidden }` per user, with a
local copy for offline start. Widgets added later appear at the end.

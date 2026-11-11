# Admin page standard

Every admin page follows these rules, so the panel feels like one product.
Reference pages: `src/features/dashboard/pages/DashboardPage.tsx` (overview)
and `src/features/tenants/pages/TenantsListPage.tsx` (list).

## Frame
- The page root is `<PageShell>`. Do not override its width or add outer padding (the shell already pads).
- The first child is `<PageHero>`. It takes:
  - a `title` and an optional `chip` (a count or period);
  - `busy` while data refreshes;
  - `actions` (buttons styled with `heroButton` / `heroPrimaryButton`);
  - `stats`: two to four headline numbers. Every page has stats.
- Optional next rows:
  - `<KpiRow>` / `<KpiCard>` for more numbers;
  - `<ViewTabs>` or `<Tabs>` for sub-views.
- Every page has a guide: `usePageGuide()` and `<PageGuide>`, with a `flow` diagram (3–5 nodes), 3–4 steps, tips and shortcuts.
  - Open it from a lightbulb `heroButton` (aria-label "How this page works (G)").

## Lists
- Use `useListParams` from `@/ui`, so search, filters and page live in the URL.
- Filters go in `<FilterBar>`:
  - `<SearchField>`;
  - one `<FilterMenu>` per filter;
  - `<FilterChip>`s for active filters, with `onClear`.
- The table goes in `<ListCard>`. It gives the loading skeleton, the empty state and `<Pagination>`.
  - Use the design-system `Table/THead/TBody/Tr/Th/Td`.
  - Clickable rows are `<Tr interactive onClick>`.
  - Numbers use `align="right"`.
- Status words use `<StatusBadge value=… />`. Never use hand-made colored spans.
- Server-side:
  - Pagination, search and filters run on the API. No client-side filtering of a full list, and no 1000-row caps.
  - If an endpoint lacks a param, add it in the admin API (keep old params working).
- CSV export: the "Export CSV" `heroButton` uses `fetchAllPages` + `downloadCsv` from `@/ui`, so it exports the whole filtered list.
- A date filter uses `DateRangeMenu` from the design system (`startHour={0}`).

## Detail pages
- Use `PageHero` with `back="/list-path"`, a `title`, a `chip` (status) and `actions`.
- Below it, a two-column grid on `xl` (main column `xl:col-span-2` plus a side column) of `<Card title description>` blocks.
- Use `<DetailList items cols>` for label/value pairs.

## Components
- Use only `@/design-system/components`:
  - Button, IconButton, Input, Textarea, Select, Checkbox, Switch, Field;
  - Modal, Drawer, `confirmDialog`;
  - Popover/Menu, Tabs, Segmented, Badge, Card, Alert, EmptyState, Skeleton;
  - plus the admin kit in `@/ui`.
- Do not use `@/components/ui/Button` or `Input` (old; being removed). No hand-rolled modals or dropdowns.
- Destructive actions (delete, suspend, refund) must ask first: `await confirmDialog({ title, description, confirmLabel, tone: 'danger' })`. Check the exact props in `apps/web/src/design-system/components/ConfirmDialog.tsx`.
- Use `toast` from `sonner` for results.

## Style
- Colors:
  - Use Tailwind palette classes only (slate, brand, emerald, amber, rose, sky…). Dark mode is automatic, so never write `dark:` classes and never use hex in classNames.
  - Inline `style` colors are fine only for industry/data colors (as in the dashboard).
  - `admin-*` classes are legacy. Use `brand-*`.
- Charts use `recharts` and read colors as in `features/dashboard/components/TrendChart.tsx`.
- Mobile:
  - Every page must work at 390px wide.
  - Tables scroll inside `<Table minWidth>`. Filter menus wrap. No horizontal page scroll.
- Text:
  - The admin UI is English, short and plain. Use sentence case ("Payment approvals", not "Payment Approvals").
  - No Roman Urdu in new admin text.
  - Never show vendor names (Claude, OpenAI, API key) or the words "tenant" or "mock" to readers. Say "shop".
- Money: `formatPKR` / `formatPKRFull` from `@/lib/format`. Dates: `formatDate` / `formatRelative`. Industries: `industryForType` from `@/lib/industries`.

## Code
- Use professional English comments. Each page file starts with a short header saying what the page is for. No AI-sounding words.
- Keep features in `src/features/<area>/` (`pages/`, `components/`, `lib/`). API clients go in `src/api/admin-<area>.api.ts`.
- Keep every existing feature of a page: every button, action, filter and field. A redesign never drops behavior.
- When a page is replaced, delete the old components it no longer uses.

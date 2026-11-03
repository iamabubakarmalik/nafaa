# Industry packs

Each pack mirrors `apps/web/src/industries/<id>` and plugs into the shared
modules (POS, inventory, sales, receipts) through register hooks. Nothing
outside a pack imports its screens except its thin route files in
`app/(industries)/<id>/`.

`index.ts` is the single registry entry: a map of pack loaders. Only the
signed-in shop's pack is loaded (`startIndustryPacks()` from `app/_layout.tsx`
after the session is read, and again when the business type changes), and
each pack's `index.ts`
calls its register hooks at load time.

## Folder layout

```
src/industries/
  index.ts          pack loaders; loads only the current shop's pack
  README.md
  _nav/             More-menu entries per pack group, read by modules/shell/navigation/nav-config.ts
    nav.ts            retail-type packs (RETAIL_TYPE_NAV)
    nav-trade.ts      device / trade / farm packs (TRADE_TYPE_NAV)
    nav-services.ts   service packs (SERVICE_TYPE_NAV)
  _shared/          building blocks used by more than one pack
    deskKit.tsx, docKit.tsx, payKit.tsx, serviceKit.tsx, packDashboard.tsx
    trade/            job desks, slips and sale jobs for the device / trade packs
    farm/             day bar, picker and receive sheets for agri, dairy, meat
  <id>/
    index.ts        registers the pack's hooks
    meta.ts         query keys, labels, refresh helpers
    nav.ts          the pack's More-menu entries (collected by _nav/)
    api.ts          the pack's API calls
    pos.ts(x)       registerPosIndustry config (counter hooks, sheets, extras)
    inventory.tsx   registerInventoryIndustry (product editor fields, catalog)
    screens/        full screens, exported by app/(industries)/<id>/…
    components/     sheets and parts used by the pack's screens and POS hooks
    bill.tsx, slip(s).ts, sales.tsx   receipt rows, printed slips, sales-history extras
```

Catalog area for every file in a pack is `industry-<id>`; `_shared/**` uses
`industry-_shared` (scripts/i18n/areas.js).

## Packs and the hooks they register

| Pack | Group | Hooks |
| --- | --- | --- |
| retail | retail-type | shared defaults (lib/ helpers used by other packs) |
| pharmacy | retail-type | Pos, Inventory, Receipt |
| cosmetics | retail-type | Pos, Inventory |
| garments | retail-type | Pos, Inventory |
| shoe | retail-type | Pos, Inventory |
| sports | retail-type | Pos, Inventory |
| toystore | retail-type | Pos, Inventory |
| bookstore | retail-type | Pos, Inventory, PurchaseExtras |
| florist | retail-type | Pos, Inventory, SalesExtras |
| petshop | retail-type | Pos, Inventory, SalesExtras |
| jewelry | retail-type | Pos, Inventory, Receipt, SalesExtras |
| optical | retail-type | Pos, Inventory, Receipt, SalesExtras |
| restaurant | food | Pos, Inventory, Receipt, SalesExtras, Prewarm |
| bakery | food | Pos, Inventory, Receipt, SalesExtras |
| mobile | device | Pos, Inventory, Receipt, SalesExtras, DeviceSource |
| electronics | device | Pos, Inventory, Receipt, SalesExtras, PurchaseExtras, DeviceSource |
| appliances | trade | Pos, Inventory, Receipt, SalesExtras, SaleJobs |
| furniture | trade | Pos, Inventory, Receipt, SaleJobs |
| hardware | trade | Pos, Inventory |
| autoparts | trade | Pos, Inventory |
| carpet | trade | Pos, Inventory, PurchaseEditor, DeviceSource |
| agri | farm | Pos, Inventory |
| dairy | farm | Pos, Inventory |
| meat | farm | Pos, Inventory |
| salon | services | Pos, Receipt, SalesExtras |
| clinic | services | Pos, SalesExtras |
| gym | services | Pos, Receipt, SalesExtras |
| hotel | services | Pos, Receipt, SalesExtras |
| gaming | services | Pos, Receipt, SalesExtras |
| services-biz | services | Pos |

Hook names are short for `register<Name>`:
`registerPosIndustry` (modules/pos), `registerInventoryIndustry` (modules/inventory),
`registerReceiptIndustry` (core/receipt), `registerSalesExtras` (modules/sales),
`registerPurchaseExtras` / `registerPurchaseEditor` (modules/purchasing),
`registerDeviceSource` (modules/inventory/industry/devices), `registerSaleJobs` (_shared/trade),
`registerPrewarm` (core/offline/native/prewarm).

## Adding a pack

1. Read the web pack.
2. Create `src/industries/<id>/` with the layout above and register its hooks in `index.ts`.
3. Add its loader to `PACKS` in `src/industries/index.ts`; add its nav to the right `_nav/` file.
4. Add thin routes under `app/(industries)/<id>/`.

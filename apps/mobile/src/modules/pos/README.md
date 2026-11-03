# POS (mobile)

One shared counter for every industry (`screens/PosScreen.tsx`, engine in
`engine/`). Industries never copy it; they register a config.

## Counter layout (same as the web POS at phone width)

- **Phone catalog** (`screens/PosScreen.tsx`): search + camera button, the
  Products / Combos / Quick segments (when there are combos or quick keys),
  category chips with counts (`offline.products.countByCategory()`), a one-line
  "Most sold" row, tiles (photo or emoji, stock pill, price per unit, + or
  − qty +), and one "View bill" bar above the tabs.
- **Bill** (`components/CartPanel.tsx`, full-height sheet on phones, side panel
  on tablets): header (items, held bills, Hold, Clear, … → `MoreSheet` with
  returns, note, reprint), customer + new customer, Retail / Wholesale /
  Credit, lines (− qty +, × rate, total, note, remove, price type), Discount
  with quick % chips, Delivery / charges, Total, "Cash · Rs …", and Card /
  JazzCash / Easypaisa / Khata / Checkout.
- A sheet opened from the bill returns to the bill when it closes
  (`usePosUi.back`); `closeAllSheets()` closes everything.
  `openCheckoutSheet(mode, split, method)` opens checkout on a method;
  `openSheet('line', id, 'rate' | 'off')` opens a line on a field;
  `openNewCustomer()` opens the customer sheet on the new-customer form.

## Industry extension points

```ts
import { registerPosIndustry } from '@/modules/pos/engine/industry';

registerPosIndustry({
  id: 'toystore',
  searchHint: msg('Name, barcode or age'),
  scan, beforeAdd, beforeCheckout, afterSale,      // codes, pickers, checks, follow-ups
  receiptFooter, combos, quickKeys,                // receipt text, counter tabs
  Screen, Overlay, CartExtra, extraView,           // own order screen, sheets, bill block, extra tab
  hideProduct,                                     // keep lines off the shelf
  useShelf: () => ({                               // shelf filters + product-card subline (hook, may load data)
    filters: [{ key: 'age', label: t('Age'), options: AGES, match: (p, v) => ages.get(p.id) === v }],
    subline: (p) => ages.get(p.id) ?? null,
  }),
}, ['toys']);                                      // alias ids
```

Types and comments: `engine/industry.ts` (`PosIndustryConfig`, `PosShelf`,
`PosShelfFilter`). `useShelf` runs on every counter render: memoise inside it,
and keep `match`/`subline` as sync lookups (they run per product while
scrolling).

## Receipts

Every bill prints through `@/core/receipt` (one design, the Nafaa line always
printed). Industry rows go in with `registerReceiptIndustry()`
(`src/core/receipt/industry.ts`): `infoRows` (table, token, waiter, room),
`extraRows` (making, wastage), `lineDetails` per item (karat, weight, frame,
lens), `footerNote`, `boxes`. Words follow the bill language (`ctx.lang`).
Do not build a receipt page of your own.

## Scanning

Use `<Scanner />` from `@/core/hardware/scanner`. `components/CameraScan.tsx`
is only a re-export for older pack files.

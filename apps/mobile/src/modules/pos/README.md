# POS (mobile)

One shared counter for every industry (`screens/PosScreen.tsx`, engine in
`engine/`). Industries never copy it; they register a config.

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

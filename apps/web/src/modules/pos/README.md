# POS

One POS engine for the counter, with industry configs on top.

```
modules/pos/
  engine/      usePosEngine (all counter logic), PosScreen (layout),
               catalog (offline products, combos), types
  components/  shared pieces: cart panel, checkout, unit/weigh/variant
               pickers, discount, hold, success, tiles, customer/receiver/
               seller pickers, delivery
  lib/         cart line shape, units, thermal receipt
  api/         combos, quick keys
  general/     POS for businesses without an industry
  pages/       PosGate — picks the POS for the current industry
industries/<id>/pos/
  config.ts    PosIndustryConfig for that industry
  <Name>Pos.tsx  renders <PosScreen config={...} />
```

On the engine: **retail**, **bakery**, **electronics**, **pharmacy**,
**mobile**, **general**. Other industries still run their own POS pages and
move over when their industry flow is rebuilt.

## What the engine does

- One search box for typed names and barcode-gun scans. Enter adds the first
  match or the scanned code; pack barcodes (carton, dozen) add that pack.
- Units and multi-units, weight sales (by weight or by money, scale
  support), variants, combos/bundles, quick keys, voice billing.
- Bill: editable rate per line, discount, delivery (own or outside rider),
  customer with current udhaar, "maal kis ne liya", seller for commission,
  hold and resume.
- Checkout: full, part or full credit; tendered amount and change; extra
  money kept as an advance (recorded as a khata payment, not just a label);
  QR for wallets. F12 = cash and print in one key. Split payment (cash +
  card …) sends `payments[]`.
- Batches: a line whose product has batches in the branch shows the batch
  and expiry being sold (earliest valid expiry by default, from
  `GET /sales/batches`); the cashier can pick another, which is sent as
  `batchId`. Expired batches show in red.
- Industry POS pages that build their own bill open `PosCheckoutModal` and
  turn its answer into sale fields with `lib/posCheckout` (`salePayment`,
  `keepAdvance`). Screens that take money outside a bill (advances, job
  payments) use `TakePaymentModal` or `PaymentMethodPicker`.
- Works offline (sales queue), auto-print to the thermal printer, customer
  display, cash drawer, WhatsApp bill.
- Price tiers (Settings → POS counter): Retail / Wholesale / Credit price for
  the bill (`lib/priceTierStore`, `components/PosTierBar`, Alt+T), one line at
  its own tier (chip or T), the customer's default price, and the credit price
  while an udhaar checkout is open. Each line sends `priceTier`; the server
  checks `pos.price_tier` and does not count tier prices as a discount.
  Hardware and meat rate switches use the same store.

## Layouts and keyboard

- Four layouts on the same engine: `classic`, `express` (search + bill
  table), `cartfocus` (big bill + narrow list) and `touch`. The shop default
  and the parts shown (images, categories, quick keys, receiver, delivery,
  discount, line notes, price edit, sounds, auto-print, stock, recent items,
  change due, quick discount %) live in `receiptConfig.posCounter` on the
  server (`GET /settings/counter`, `PATCH /settings/pos-counter`); see
  `lib/posCounterConfig`. Each user can pick their own layout and density
  (localStorage, ⚙️ on the counter). Phones always get `classic`.
- Keyboard first: the search box keeps focus; ↑/↓ + Enter pick a result,
  `3*` sets a quantity, `+`/`-` change the last or selected line, F3 moves
  into the bill lines (↑/↓, +/-, Delete, Enter qty, R rate, N note, Esc).
  F2 customer, F4 discount, F6 hold/resume, F8 payment (1–6), F9 more,
  F12 cash + print, Ctrl+Enter checkout, Ctrl+P reprint, Alt+R repeat last
  bill, Alt+1–9 most sold. `?` lists them all (`components/PosShortcutsOverlay`).

## Adding an industry

Write `industries/<id>/pos/config.ts`:

- `useCatalog` — usually `useProductCatalog(decorate)` adding badges, rank
  and `meta`; or an industry endpoint mapped to `PosItem`.
- `filters`, `useBundles`, `quickKeys`, `extraUnits`, `voiceAliases`.
- `beforeAdd(item, opts, api)` — return `'handled'` after opening a picker
  (`api.openPicker`) or asking for confirmation; call `api.addItem` with the
  answer (`serial`, `oversell`, `confirmed`…).
- `scan(code, api)` — industry codes (serial/IMEI) before product barcodes.
- `beforeCheckout(cart)` — return a message to stop checkout (checked when
  checkout opens, on F12 cash and again before the bill is sent).
- `onSale(sale)` — runs after the server saves a bill; never for a bill
  queued offline.
- Variant stock: a variant's `reserved` (pieces held for customers) is taken
  off its stock in the size picker and in the stock check.

Then add it to `PosGate` and the industry pack's `/pos` route.

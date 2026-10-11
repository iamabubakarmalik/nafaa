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

On the engine: **retail**, **bakery**, **electronics**, **general**. Other
industries still run their own POS pages and move over when their industry
flow is rebuilt.

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
  QR for wallets. F12 = cash and print in one key.
- Works offline (sales queue), auto-print to the thermal printer, customer
  display, cash drawer, WhatsApp bill.

## Adding an industry

Write `industries/<id>/pos/config.ts`:

- `useCatalog` — usually `useProductCatalog(decorate)` adding badges, rank
  and `meta`; or an industry endpoint mapped to `PosItem`.
- `filters`, `useBundles`, `quickKeys`, `extraUnits`, `voiceAliases`.
- `beforeAdd(item, opts, api)` — return `'handled'` after opening a picker
  (`api.openPicker`) or asking for confirmation; call `api.addItem` with the
  answer (`serial`, `oversell`, `confirmed`…).
- `scan(code, api)` — industry codes (serial/IMEI) before product barcodes.

Then add it to `PosGate` and the industry pack's `/pos` route.

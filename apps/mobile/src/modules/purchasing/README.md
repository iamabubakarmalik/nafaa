# Purchasing (mobile)

Purchases, purchase orders, suppliers and the purchase bill editor
(`screens/editor`). Opened with `?supplier=`, `?order=1`, `?lines=<json>`
(low stock) or `?prefill=<json>` (Nafaa AI reorder:
`{ supplierId, supplierName, lines: [{ productId, qty, cost? }] }`).

## Industry extension points (`industry/registry.tsx`)

- `registerPurchaseEditor(industry, Editor)`: the industry's own bill editor
  (carpet rolls, electronics serials).
- `registerPurchaseExtras(industry, { LineBadge, ItemExtra, lineCost })`:
  - `LineBadge` next to a line in the bill being written;
  - `ItemExtra` under a received line on the purchase page;
  - `lineCost(ctx)` sets the cost of a line when it is added, and again for
    every line when the supplier changes. `ctx` has `productId`, `variantId`,
    `supplierId`, `listPrice`, `lastCost` (per base unit); return
    `{ cost, note? }` per base unit, or null to keep the last cost.

```ts
registerPurchaseExtras('bookstore', {
  lineCost: ({ supplierId, listPrice }) => {
    const pct = publisherDiscount(supplierId);       // cached lookup
    return pct ? { cost: listPrice * (1 - pct / 100), note: t('Publisher discount {{pct}}%', { pct }) } : null;
  },
});
```

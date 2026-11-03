# Sales (mobile)

Sales history (`screens/SalesHistoryScreen.tsx`, read from the offline
mirror), the bill screen (`screens/SaleDetailScreen.tsx`) and discounts.

## Industry extension points

```ts
import { registerSalesExtras } from '@/modules/sales/industry/registry';

registerSalesExtras('optical', {
  rowChips: (sale) => [{ label: t('Rx'), tone: 'info' }],                         // history row + bill top
  rowActions: (sale) => [{ icon: Glasses, label: t('Eye test'), href: `/optical/tests?sale=${sale.id}` }],  // swipe actions
  detailLinks: (sale, raw) => [{ label: t('Glasses order'), href: `/optical/orders?sale=${sale.id}` }],    // "Linked" section
  DetailExtra: ({ sale, raw }) => <RxCard saleId={sale.id} />,                      // block under the items
});
```

`rowChips` and `rowActions` see only the phone's row (`HistorySale`) and must
stay sync. Server data (`raw`, the GET /sales/:id body) is there on the bill
screen when online. Bills waiting to sync get no actions or links.

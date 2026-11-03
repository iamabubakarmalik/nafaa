# Offline engine (`@/core/offline`)

The app works the same with or without internet. Screens read from the
phone's own database and write through typed operations that go into an
outbox; the engine sends them when it can and downloads what changed.

```
engine/     pure TypeScript (no React Native): SQL schema, download, lookups,
            outbox, rules, typed operations. Runs in Node for the harness.
native/     expo-sqlite + axios adapters, the runtime (sign-in, timers),
            React hooks, saved screen data, offline sign-in.
index.ts    the public API. Import from '@/core/offline' only.
```

## How it works

- **Mirror.** Products (variants, packs, every barcode/SKU), branch stock,
  customers (khata balance, oldest unpaid date), categories, brands, staff,
  sellers, shops, counter rules, receipt settings, open cash registers and
  the last 30 days of bills live in SQLite (one file per business and user,
  WAL). First sign-in downloads everything with progress; after that only
  changes (`GET /sync/pull?entity=…&updatedSince=…&cursor=…`). Once a day
  the live ids are compared to drop rows deleted on the server; once a week
  everything is downloaded again.
- **When it syncs.** App start and resume, connection back, every 3 minutes
  while online, 250 ms after any offline change, pull-to-refresh
  (`syncNow()`).
- **Outbox.** Every write is a row with its own `Idempotency-Key`. Things
  made offline get temp ids (`tmp_customer_<uuid>`); a later change that
  uses one (a bill for that customer) waits for it and is sent with the
  server id. The server answers each key once, so a resend after a lost
  answer never makes a second bill.
- **Optimistic.** A sale takes stock off and adds to khata at once; the
  bill is in history marked pending. These are *effects* laid over the
  mirror, removed only after a download that includes the server's result,
  so a delta download can never undo unsent work.
- **Server wins.** After sync the bill takes the server's number and
  totals; when the total differed a note is kept (`useSyncNotes`).
- **Issues.** Network trouble, 5xx, 408/429 and "still running" (409) are
  retried with backoff. A 4xx becomes a Sync issue with plain words (stock,
  deleted item, permission, PIN, shop rule, duplicate). The user retries
  (optionally with a fix, e.g. a PIN), or discards — discarding undoes the
  change on the phone (stock and khata back, the offline bill removed) and
  discards the changes that depended on it. Nothing is dropped silently.

## Reading

```tsx
import { useProductSearch, useCustomerSearch, useSalesHistory, offline } from '@/core/offline';

// Counter search: instant, offline, stock of the active branch (pending bills already taken off).
const { data: products = [] } = useProductSearch({ query, categoryId, limit: 60 });

// Barcode scanner.
const hit = await offline.products.byBarcode(code);          // { product, variantId, pack, via } | null
if (hit?.pack) addLine(hit.product, { unitName: hit.pack.unitName, conversionRate: hit.pack.conversionRate, price: hit.pack.price });

// Customers by name (English, Roman Urdu, Urdu script; "ahmad" finds "Ahmed") or any phone format.
const { data: customers = [] } = useCustomerSearch({ query: '0300 1234' });
const { data: owing = [] } = useCustomerSearch({ owing: true });    // khata list, biggest first

// History: server bills + bills waiting to sync (`pending: true`, number OFF-XXXX-0001 until synced).
const { data: bills = [] } = useSalesHistory({ query: search });
```

Every query key starts with `['offline', …]`; the engine refreshes them
when data changes. Small lists: `useOfflineList('category' | 'brand' |
'staff' | 'seller' | 'shop' | 'expenseCategory' | 'incomeCategory')`.
Counter rules and receipt settings: `useOfflineManifest()`.

## Writing

```ts
import { enqueueSale, enqueueCustomerCreate, enqueueKhataPayment, OfflineRuleError, offline } from '@/core/offline';

// Before checkout: rule problems and PIN needs (same rules as the server).
const check = await offline.sales.check(draft);
// check.problems -> show; check.needsPin -> ask the PIN (online only), then pass managerPin.

try {
  const { saleId, sale } = await enqueueSale({
    shopId, customerId, paymentMethod: 'CASH', paidAmount: 1000,
    payments: [{ method: 'CASH', amount: 600 }, { method: 'JAZZCASH', amount: 400 }],  // split
    discount: 50,
    items: [{ productId, quantity: 12, priceOverride: 95, unitName: 'carton', unitQty: 1, conversionRate: 12 }],
  });
  printReceipt(sale);           // works offline; sale.pending until synced
} catch (e) {
  if (e instanceof OfflineRuleError) {
    // e.code: 'stock' | 'customer_required' | 'customer_for_credit' | 'discount_off' | 'credit_off'
    //         | 'pin_needed' (ask PIN, call again with managerPin) | 'online_needed' (PIN rule while offline)
    toast(e.message);
  }
}

// Customer made offline and a khata bill for them right away.
const { customerId } = await enqueueCustomerCreate({ name: 'Bilal', phone: '03001234567' });
await enqueueSale({ shopId, customerId, paymentMethod: 'CASH', paidAmount: 0, items });   // all on khata
await enqueueKhataPayment({ customerId, amount: 500, paymentMethod: 'CASH' });
```

Quantities are in the product's base unit (a carton of 12 is `quantity: 12`
with `unitName/unitQty/conversionRate`), `priceOverride` is per base unit —
the same body the web POS sends to `POST /sales`.

All operations:

| Operation | Server call | Offline | Local effect |
|---|---|---|---|
| `enqueueSale` (cash, card, wallet, split, khata, discounts, codes, points) | POST /sales | yes | stock −, khata +, points −, bill in history |
| `enqueueVoid(saleId)` | POST /sales/:id/void | pending bill: removed on the phone; synced bill: yes unless the shop's void PIN rule is on | stock +, khata − |
| `enqueueReturn` | POST /returns | only if the refund PIN rule is off (it is on by default) | stock + (restocked lines), khata − for CREDIT refunds |
| `enqueueCustomerCreate / Update` | POST/PATCH /customers | yes | customer row (temp id until synced) |
| `enqueueKhataPayment / enqueueKhataUdhaar` | POST /customer-ledger/:id/payment, /udhaar | yes | khata − / + |
| `enqueueExpense`, `enqueueIncome` | POST /expenses, /income | yes | in `useOutbox()` until sent |
| `enqueueStockAdjustment` | POST /stock-adjustments | yes | stock ± |
| `enqueueDamage` | POST /retail/damage | yes | none (stock moves on approval) |
| `enqueuePurchase` (goods received) | POST /purchases | yes | stock + when `receive !== false` |
| `enqueueProductCreate / Update / PriceChange` | POST/PATCH /products | yes | product sellable at once (temp id), barcode scannable |
| `enqueueCheckIn / CheckOut` | POST /staff/timesheet/check-in, -out | yes (punch time is sent; the server accepts up to 12 h back) | `offline.attendance.today()` |
| `enqueueRegisterOpen / Close / CashMove` | POST /cash-register/open, /close, /transaction | yes (close waits for this phone's bills) | `offline.register.state(shopId)` |
| held bills | none | `offline.heldBills.save/list/remove` | kept on the phone |

Manager PIN rules (discount over the limit, khata over the credit limit,
void and refund PINs) are checked by the server only, so they need
internet: offline they throw `OfflineRuleError('online_needed')`.

## Needs internet

`requiresOnline(feature)` and `onlineNeededText(feature)` (`ONLINE_ONLY`):
online orders and couriers, Nafaa AI, card/wallet payments through Nafaa
(QR, payment link), reports that add up every device, team and
permissions, settings changes, anything with a manager PIN, stock
transfers, billing, integrations, SMS/WhatsApp, backup, old khata history,
photo uploads. Show the last saved data with the friendly text:

```tsx
if (!online && requiresOnline('reports')) return <EmptyState title={onlineNeededText('reports')} />;
```

Recording a card or wallet payment that the customer made on another
machine is a normal tender (`paymentMethod: 'CARD'`) and works offline.

## Saved screen data (React Query)

Every successful query (except `['offline', …]`) is saved per user; a
screen opened offline shows its last data. Use `useCachedNotice(query)`
for the "Last updated {{time}}" line. `useApiQuery(path, params)` is a GET
with the same key the prewarm uses; `registerPrewarm({ queryKey, queryFn,
permission })` adds a module's main queries to the warm-up after sign-in.

## Status, outbox, issues

```tsx
const { state, pending, issues, lastSyncedAt, progress, ready, syncNow } = useSyncStatus();   // '@/core/net'
const { items } = useOutbox();                 // waiting changes, with title and amount
const { issues, retry, discard, useExistingCustomer } = useSyncIssues();
// issue.explanation: plain words; issue.serverMessage: the server's own text (translated).
// PIN issue: retry(issue.id, { body: { ...issue.body, managerPin } })
```

## Sign-in and sign-out

- After a successful **online** sign-in, the login screen calls
  `rememberOfflineLogin(email, password, session)`. When there is no
  internet, try `offlineLogin(email, password)` (true = signed in from the
  saved session). `offlineLoginPeople()` lists who can sign in offline.
- Before **logout**: `const { pending } = await beforeLogout()`. When
  `pending > 0`, warn ("N changes are not sent yet. They stay on this phone
  and are sent when you sign in again."). Logging out keeps that user's
  unsent work in their own database; `dropUnsentAndWipe()` deletes it after
  an explicit confirmation. Logout always clears the copy of the server
  data.

## Startup

`useSyncStatus()` (used by the shell) starts the engine. Calling
`startOfflineEngine()` from boot also works; it is idempotent.

## Tests and speed

```
npx tsx scripts/offline-harness/run.mts     # against the local API (demo-retail@nafaa.test)
npx tsx scripts/offline-harness/bench.mts   # 20,000 products: barcode and search timings
```

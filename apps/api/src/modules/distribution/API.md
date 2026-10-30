# Distribution API

Wholesale and distribution for any business: price lists, routes (beats), trade schemes, sales orders booked in the field, invoicing through the normal sales path, load sheets, settlement, field collections, visits, the booker app's bootstrap and sync, and reports.

All paths are under `/api`. Every response is wrapped by the global interceptor as `{ success: true, data: <body>, timestamp }`. Errors come back as `{ success: false, statusCode, message }`, with `message` in simple Roman Urdu. The types below describe `data`.

Auth uses the normal JWT (`Authorization: Bearer <accessToken>`). Get the token from `POST /api/auth/login { email, password }`, which returns `{ user, tenant, accessToken, refreshToken }`, and renew it with `POST /api/auth/refresh { refreshToken }`.

Money is a plain number in rupees, rounded to 2 decimals. Dates are ISO strings. A business day is sent as `YYYY-MM-DD`; it follows the shop's time zone and day-start hour, never server UTC. Quantities in base units are rounded to 4 decimals.

## 0. Access, switch and plan

- Distribution is a switch, `DistributionSettings.enabled`, which any business can turn on. The plan must also carry `Plan.featureDistribution`; the admin sets this per plan, and it starts `false` on every plan.
- Every `/distribution/*` route except `settings` and `presets` returns 403 until both are on. The two messages are:
  - `Aap ke plan (X) me Distribution shamil nahi — plan upgrade karein`
  - `Distribution band hai — Settings me Distribution on karein`
- `GET /distribution/settings` always works. Its `access` block tells the client which of the two is missing.
- Choosing the `DISTRIBUTOR` business type in onboarding (step 1 or change type) turns the switch on by itself. The plan check still applies.
- `GET /feature-gating/usage` now includes `features.distribution`.

### Permissions (explicit; nothing is implied)

| Key | What it allows |
|---|---|
| `distribution.orders.view` | Office lists of orders, load sheets and visits; dashboard; reports (reports also need `reports.view`) |
| `distribution.orders.book` | Book orders and record visits. Covers the whole booker app: `/distribution/booker/*`, plus `POST /distribution/orders` and `POST /distribution/visits` |
| `distribution.orders.manage` | Edit any booked order; approve, invoice and cancel; book in another booker's name; bootstrap with `all=true` |
| `distribution.price_override` | Typed prices and hand discounts on order lines are kept. Without it, the list price is used and a warning comes back |
| `distribution.loadsheets.manage` | Create, change, dispatch and cancel load sheets |
| `distribution.settle` | Settle load sheets. This includes the returns of undelivered goods, which go through the bill |
| `distribution.routes.manage` | Routes, and putting customers on them |
| `distribution.pricelists.view` / `.manage` | Price lists |
| `distribution.schemes.manage` | Schemes |
| `distribution.collections.collect` | Record field money (stays `PENDING`). A collector without verify sees only their own collections |
| `distribution.collections.verify` | Verify or reject collections. Verifying posts `PAYMENT_RECEIVED` to the khata |
| `distribution.delivery.report` | The delivery app: own dispatched load sheets and per-invoice reports (`/distribution/delivery/*`). The office still settles |

Route rules are in `common/constants/permission-routes.ts` under `^distribution/...`. Reads that serve several roles list each permission that may read them.

`MANAGER` defaults include every distribution permission except `price_override` (so also `delivery.report`). These are defaults for new managers only; existing managers are granted them by the owner.

Presets live at `GET /distribution/presets`, and in the code as `DISTRIBUTION_PRESETS` and `BOOKER_REQUIRED_PERMISSIONS`:
- `ORDER_BOOKER`: role STAFF; `orders.book`, `collections.collect`, `customers.view`, `products.view`, `khata.view`
- `DELIVERY`: role STAFF; `delivery.report`, `orders.view`, `collections.collect`, `customers.view`, `products.view`
- `DISTRIBUTION_MANAGER`: role MANAGER; all distribution permissions except `price_override`, plus customers, khata, products, sales and returns view, reports, shops, staff and team view

`BOOKER_REQUIRED_PERMISSIONS` = `orders.book`, `customers.view`, `products.view`. It drives a Team-page warning only, like `POS_REQUIRED_PERMISSIONS`.

## 1. Shared types

```ts
type ID = string;
type ISO = string;            // ISO date-time
type DayKey = string;         // 'YYYY-MM-DD' business day
type Money = number;
type MoneyMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA';   // 'BANK' is accepted as BANK_TRANSFER

type OrderStatus = 'BOOKED' | 'APPROVED' | 'INVOICING' | 'INVOICED' | 'LOADED' | 'DELIVERED' | 'PARTIAL' | 'RETURNED' | 'CANCELLED';
// INVOICING is a short lock while the bill is made. An order stuck in it for over 2 minutes is retried by /orders/invoice.
type LoadSheetStatus = 'OPEN' | 'DISPATCHED' | 'SETTLED' | 'CANCELLED';
type DeliveryOutcome = 'DELIVERED' | 'PARTIAL' | 'RETURNED';
type CollectionKind = 'INVOICE_CASH' | 'RECOVERY';
type CollectionStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
type VisitOutcome = 'ORDER' | 'NO_ORDER' | 'CLOSED' | 'RECOVERY_ONLY';
type CreditMode = 'WARN_THEN_PIN' | 'BLOCK' | 'OFF';
type SchemeType = 'FREE_QTY' | 'PERCENT_OFF' | 'AMOUNT_PER_UNIT' | 'SLAB';
type ListBase = 'PRICE' | 'WHOLESALE' | 'COST';

/** Customer summary used across responses. */
interface CustomerCard {
  id: ID; name: string; businessName: string | null; phone: string | null; address: string | null; area: string | null; city: string | null;
  balance: Money; creditLimit: Money; creditDays: number | null; routeId: ID | null; routeSeq: number | null; priceListId: ID | null;
  latitude: number | null; longitude: number | null; ntn: string | null; strn: string | null; isActive: boolean;
}

/** Bulk actions answer per item; one failure never stops the rest. */
interface ItemResult { id: ID; ok: boolean; status?: string | null; error?: string }
```

## 2. Settings and presets (no switch needed)

| Method | Path | Permission | Body | Response |
|---|---|---|---|---|
| GET | `/distribution/settings` | settings.view OR orders.view OR orders.book | – | `SettingsResponse` |
| PUT | `/distribution/settings` | settings.edit | `UpdateSettings` | `SettingsResponse` |
| GET | `/distribution/presets` | team.view OR staff.view | – | `{ presets: Preset[]; bookerRequired: string[] }` |

```ts
interface DistributionSettings {
  enabled: boolean; creditMode: CreditMode; requireCheckIn: boolean; checkInRadiusM: number;
  orderPrefix: string; loadSheetPrefix: string; recoveryNeedsVerify: boolean;
  defaultPriceListId: ID | null; defaultShopId: ID | null; updatedAt: ISO | null;
}
interface SettingsResponse {
  settings: DistributionSettings;
  access: { enabled: boolean; planAllows: boolean; planName: string | null };
  meta: {
    orderStatuses: OrderStatus[]; loadSheetStatuses: LoadSheetStatus[]; deliveryOutcomes: DeliveryOutcome[];
    collectionStatuses: CollectionStatus[]; visitOutcomes: VisitOutcome[];
    noOrderReasons: { code: string; label: string }[];   // STOCK_AVAILABLE, SHOP_CLOSED, OWNER_ABSENT, NO_CASH, PRICE_ISSUE, CREDIT_HOLD, COMPETITOR, OTHER
    creditModes: CreditMode[]; schemeTypes: SchemeType[]; listBases: ListBase[];
  };
}
type UpdateSettings = Partial<Omit<DistributionSettings, 'updatedAt'>>;   // enabled:true is refused (403) when the plan lacks the feature
interface Preset { key: 'ORDER_BOOKER' | 'DELIVERY' | 'DISTRIBUTION_MANAGER'; label: string; role: 'STAFF' | 'MANAGER'; description: string; permissions: string[] }
```

## 3. Price lists

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/distribution/price-lists` | pricelists.view | – | `PriceList[]` (with `itemCount`, `customerCount`) |
| POST | `/distribution/price-lists` | pricelists.manage | `SavePriceList` | `PriceList` |
| GET | `/distribution/price-lists/:id` | pricelists.view | – | `PriceList` |
| PATCH | `/distribution/price-lists/:id` | pricelists.manage | `Partial<SavePriceList>` | `PriceList` |
| DELETE | `/distribution/price-lists/:id` | pricelists.manage | – | `{ deleted: boolean; deactivated: boolean; customers: number }`: switched off instead when customers or settings use it |
| GET | `/distribution/price-lists/:id/items` | pricelists.view | `?search&page&limit(≤500)` | `{ total; page; limit; items: PriceListItemRow[] }` |
| GET | `/distribution/price-lists/:id/grid` | pricelists.view | `?search&categoryId&brandId&page&limit(≤200)` | `PriceGrid` |
| PUT | `/distribution/price-lists/:id/items` | pricelists.manage | `{ items: PriceListItemInput[] }` (≤2000) | `{ saved: number; removed: number }` |
| POST | `/distribution/price-lists/:id/items/remove` | pricelists.manage | `{ ids: ID[] }` | `{ removed: number }` |
| POST | `/distribution/price-lists/:id/import` | pricelists.manage | `{ rows: ImportRow[] }` (≤5000) | `{ saved; removed; matched: number; unmatched: { row: number; reason: string }[] }` |
| GET | `/distribution/price-lists/resolve` | pos.use OR pricelists.view OR orders.book | `?customerId&priceListId&productIds=a,b (≤200)` | `Resolve` |

```ts
interface SavePriceList { name: string; code?: string; basedOn?: ListBase /* default WHOLESALE */; adjustPct?: number /* -90..500 */; isDefault?: boolean; isActive?: boolean; note?: string }
interface PriceList extends Required<Omit<SavePriceList, 'code' | 'note'>> { id: ID; tenantId: ID; code: string | null; note: string | null; createdAt: ISO; updatedAt: ISO; itemCount?: number; customerCount?: number }
interface PriceListItemInput { productId: ID; variantId?: ID | null; unitId?: ID | null /* ProductUnit; null = base unit */; price: Money /* per pack; <=0 removes */; minQty?: number | null }
interface PriceListItemRow extends PriceListItemInput { id: ID; productName: string | null; variantName: string | null; unitName: string; conversionRate: number }
interface ImportRow { code?: string /* SKU, barcode (product or pack) or exact name */; name?: string; unitName?: string /* Carton; empty = base */; price: Money; minQty?: number }
interface PriceGrid {
  total: number; page: number; limit: number; list: PriceList;
  products: { productId: ID; name: string; sku: string | null; baseUnit: string;
    rows: { unitId: ID | null; unitName: string; conversionRate: number; retail: Money; wholesale: Money | null; cost?: Money /* only with cost.view */;
            listPrice: Money | null /* the list's own row */; rulePrice: Money /* what basedOn ± adjustPct gives */ }[] }[];
}
interface Resolve {
  priceListId: ID | null; priceListName: string | null; tier: 'RETAIL' | 'WHOLESALE' | 'CREDIT' | null /* used when no list */;
  items: { productId: ID; variantId: ID | null; unitId: ID | null; unitName: string; conversionRate: number;
           price: Money /* per pack */; perBase: number; source: 'LIST_ITEM' | 'LIST_RULE' | 'TIER' }[];
  schemes: Scheme[];   // live schemes that can apply to these products for this list
}
```

Which list prices a customer:
1. `Customer.priceListId`.
2. Else `settings.defaultPriceListId`.
3. Else the active list marked `isDefault`.
4. Else no list: the customer's `priceTier`, or WHOLESALE, of the pack (or base × pack size), falling back to retail like the POS.

The price of one line, first match wins:
1. An exact list row (product, variant, pack), choosing the highest `minQty` the quantity reaches.
2. Else the base-unit row × pack size.
3. Else the list rule.

## 4. Routes

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/distribution/routes` | routes.manage OR orders.view OR orders.book | `?bookerId&active=true` | `Route[]` |
| GET | `/distribution/routes/day` | same | `?date&bookerId` | `RouteDay` |
| POST | `/distribution/routes` | routes.manage | `SaveRoute` | `Route` |
| GET | `/distribution/routes/:id` | same as list | – | `Route & { customers: CustomerCard[] /* visit order */ }` |
| PATCH | `/distribution/routes/:id` | routes.manage | `Partial<SaveRoute>` | `Route` |
| DELETE | `/distribution/routes/:id` | routes.manage | – | `{ deleted; deactivated; customersFreed: number }` |
| POST | `/distribution/routes/:id/customers` | routes.manage | `{ customerIds: ID[] /* in visit order */; replace?: boolean }` | route detail |
| DELETE | `/distribution/routes/:id/customers/:customerId` | routes.manage | – | `{ removed: true }` |

```ts
interface SaveRoute { name: string; code?: string; area?: string; shopId?: ID | null /* godown */; visitDays?: number[] /* 0=Sun..6=Sat */; bookerId?: ID | null; deliveryUserId?: ID | null; isActive?: boolean; sortOrder?: number }
interface Route extends SaveRoute { id: ID; visitDays: number[]; customerCount?: number; bookerName?: string | null; deliveryUserName?: string | null; shopName?: string | null; createdAt: ISO; updatedAt: ISO }
interface RouteDay { date: DayKey; weekday: number; routes: { id; name; code; area; shopId; bookerId; bookerName; deliveryUserId; deliveryUserName; customers: number; visited: number; orders: number; orderValue: Money }[] }
```

### Customer fields (existing `/customers` endpoints, all optional)

`POST /customers` and `PATCH /customers/:id` now accept the fields below. An empty string clears a field. `priceListId` and `routeId` must belong to the same business.

```ts
{
  priceListId?: ID | null; routeId?: ID | null; routeSeq?: number | null;
  creditDays?: number | null;       // 0..365
  businessName?: string; strn?: string; licenseNo?: string;
  licenseExpiry?: DayKey | null;
  latitude?: number | null; longitude?: number | null;
}
```

## 5. Trade schemes

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/distribution/schemes` | schemes.manage OR pricelists.view OR orders.view OR orders.book | `?status=live\|inactive` | `(Scheme & { live: boolean; productNames: (string\|null)[]; freeProductName; supplierName })[]` |
| POST | `/distribution/schemes/preview` | pos.use OR orders.book OR orders.manage | `{ customerId?: ID; lines: { productId; variantId?; baseQty; unitPrice /* per base */ }[] }` | `{ priceListId: ID \| null; lines: SchemeResult[] }` |
| POST | `/distribution/schemes` | schemes.manage | `SaveScheme` | `Scheme` |
| GET | `/distribution/schemes/:id` | as list | – | `Scheme` |
| PATCH | `/distribution/schemes/:id` | schemes.manage | `Partial<SaveScheme>` | `Scheme` |
| DELETE | `/distribution/schemes/:id` | schemes.manage | – | `{ deleted; deactivated }`: switched off when orders used it |

```ts
interface SaveScheme {
  name: string; type: SchemeType; supplierId?: ID | null /* principal */;
  productIds?: ID[]; brandIds?: ID[]; categoryIds?: ID[];   // any-of; all empty = every product
  priceListIds?: ID[];                                        // empty = every customer
  buyQty?: number; buyUnitName?: string | null;              // buy pack, matched by name ('Carton'); empty = base units
  freeQty?: number; freeProductId?: ID | null;                // FREE_QTY
  value?: number;                                             // PERCENT_OFF: percent; AMOUNT_PER_UNIT: Rs per buy pack
  slabs?: { minQty: number; percent?: number; amountPerUnit?: number; freeQty?: number }[];   // SLAB; minQty in buy packs; freeQty is flat
  minOrderValue?: number | null;
  startsAt?: DayKey | ISO | null; endsAt?: DayKey | ISO | null;   // a day key means the start / end of that business day
  isClaimable?: boolean; isActive?: boolean; note?: string;
}
interface Scheme extends SaveScheme { id: ID; tenantId: ID; createdAt: ISO; updatedAt: ISO; slabs: SaveScheme['slabs'] | null }
interface SchemeResult { schemeId: ID | null; schemeName: string | null; note: string | null; discount: Money; freeBaseQty: number; freeProductId: ID | null /* null = same product */ }
```

The resolver is `helpers/scheme-resolver.ts`, a pure function with no imports. The booker app should copy it, together with `helpers/pricing.ts` and `helpers/credit.ts`, so offline prices match the server.

Resolver rules:
- **FREE_QTY:** every `buyQty` packs earns `freeQty` packs free. With `freeProductId`, it earns `freeQty` base units of that product instead.
- **PERCENT_OFF / AMOUNT_PER_UNIT:** applies from `buyQty` packs upward.
- **SLAB:** takes the highest slab reached.
- **One scheme per line:** the one worth most. A tie keeps the earlier scheme.
- **Rupees off** never exceed the line's gross.

## 6. Sales orders

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/distribution/orders` | orders.view | `ListOrders` | `{ total; page; limit; totalValue: Money; orders: OrderRow[] }` |
| GET | `/distribution/orders/:id` | orders.view | – | `OrderDetail` |
| POST | `/distribution/orders` | orders.book | `CreateOrder` | `{ order: OrderDetail; duplicate: boolean; warnings: string[] }` |
| PATCH | `/distribution/orders/:id` | orders.book OR orders.manage | `UpdateOrder` | `{ order: OrderDetail; warnings: string[] }`: BOOKED only; without manage, only your own |
| POST | `/distribution/orders/preview` | orders.book OR orders.manage | `{ customerId; items: OrderLine[] }` | `Preview` |
| POST | `/distribution/orders/approve` | orders.manage | `{ ids: ID[] (≤500); managerPin?: string }` | `InvoiceRun` |
| POST | `/distribution/orders/invoice` | orders.manage | same | `InvoiceRun`: retries APPROVED orders |
| POST | `/distribution/orders/cancel` | orders.manage | `{ ids: ID[]; reason?: string }` | `{ results: (ItemResult & { orderNumber })[] }`: BOOKED/APPROVED only |
| GET | `/distribution/orders/print` | orders.view | `?ids=a,b,c` | `InvoicePrint` (kind `invoice-a4`) |

```ts
interface OrderLine { productId: ID; variantId?: ID | null; unitId?: ID | null /* pack; empty = base */; qty: number /* in the pack */; price?: Money | null /* per pack, kept only with price_override */; discount?: Money | null /* only with price_override */ }
interface CreateOrder {
  clientRef?: string /* ≤64; idempotency key from the phone */; customerId: ID; routeId?: ID /* default: customer's route */;
  shopId?: ID /* godown; default: route's, then settings.defaultShopId, then the only godown */;
  bookedById?: ID /* only with orders.manage */; items: OrderLine[] /* 1..300 */;
  bookedAt?: ISO /* phone time; never in the future */; latitude?: number; longitude?: number; gpsAccuracy?: number;
  deliveryDate?: DayKey; note?: string;
}
interface UpdateOrder { items?: OrderLine[]; shopId?: ID; deliveryDate?: DayKey | ''; note?: string }
interface ListOrders { status?: string /* one or 'A,B' */; routeId?; bookedById?; customerId?; loadSheetId?; shopId?; from?: DayKey; to?: DayKey; search?: string; unloaded?: boolean; page?: number; limit?: number /* ≤200 */ }

interface OrderItem {
  id: ID; productId: ID; variantId: ID | null; unitId: ID | null; unitName: string | null; conversionRate: number;
  qty: number; baseQty: number; price: Money /* per pack */; schemeDiscount: Money; discount: Money; total: Money;
  schemeId: ID | null; schemeNote: string | null; freeBaseQty: number; freeProductId: ID | null;
  saleItemId: ID | null; freeSaleItemId: ID | null; deliveredBaseQty: number | null; deliveredFreeQty: number | null; sortOrder: number;
  productName: string | null; sku: string | null; baseUnit: string; variantName: string | null; freeProductName: string | null;
}
interface Order {
  id: ID; orderNumber: string /* SO-000042 */; clientRef: string | null; customerId: ID; routeId: ID | null; shopId: ID | null;
  bookedById: ID; priceListId: ID | null; status: OrderStatus;
  subtotal: Money; schemeDiscount: Money; discount: Money; taxAmount: Money; total: Money;
  bookedAt: ISO; latitude: number | null; longitude: number | null; gpsAccuracy: number | null; deliveryDate: ISO | null; note: string | null;
  creditWarning: string | null /* shown at booking */; approvedById: ID | null; approvedAt: ISO | null;
  invoiceError: string | null /* why the last invoice try failed */; cancelReason: string | null; cancelledAt: ISO | null;
  saleId: ID | null; invoicedAt: ISO | null; loadSheetId: ID | null;
  deliveryStatus: DeliveryOutcome | null; deliveredAt: ISO | null; cashCollected: Money; returnsValue: Money; returnId: ID | null; returnReason: string | null;
  createdAt: ISO; updatedAt: ISO;
}
interface OrderRow extends Order { itemCount: number; customer: CustomerCard | null; bookedByName: string | null; routeName: string | null; saleNumber: string | null; loadSheetNumber: string | null }
interface OrderDetail extends Order { items: OrderItem[]; customer: CustomerCard | null; bookedByName; approvedByName; routeName; shopName; saleNumber; loadSheetNumber: string | null }

interface PricedLine { index: number; productId; variantId; unitId; unitName; conversionRate; qty; baseQty; price: Money; priceSource: 'LIST_ITEM' | 'LIST_RULE' | 'TIER' | 'OVERRIDE'; listPrice: Money; gross: Money; schemeDiscount: Money; discount: Money; total: Money; schemeId; schemeNote; freeBaseQty; freeProductId; retailPrice: Money; taxRate: number }
interface Preview { lines: PricedLine[]; subtotal; schemeDiscount; discount; total: Money; warnings: string[]; priceListId: ID | null;
  credit: { overLimit: boolean; overdue: boolean; dueDays: number | null; message: string | null } | null /* null when creditMode OFF */; customer: CustomerCard }

interface InvoiceRun {
  results: { id: ID; orderNumber: string | null; ok: boolean; status: string | null; saleId?: ID; saleNumber?: string; error?: string; needsPin?: boolean }[];
  invoiced: number; failed: number; needsPin: boolean;
}
```

How an order is priced:
- The server always prices the order again on save. Typed prices are kept only with `price_override`; otherwise a warning comes back.
- Lines that cannot be priced (item missing or off, wrong pack) are dropped with a warning. If no line is left, the request is a 400.

Credit:
- At booking it is only a warning (`creditWarning`).
- At invoicing:
  - `WARN_THEN_PIN` asks for the manager PIN. The PIN is checked once per call. A staff PIN needs `khata.manage`. With no owner PIN set, the order is refused, the same strict rule as the counter credit limit.
  - `BLOCK` refuses.
  - `OFF` skips the check.
- "Overdue" means the oldest unpaid khata credit (FIFO) is older than `Customer.creditDays`.

### What invoicing does

Approve moves BOOKED to APPROVED and invoices straight away (owner decision: the invoice is made at approval). Each order becomes a normal Sale through `SalesService.create`:

- **Bill fields:** `shopId` = the order's godown, `soldById` = booker, `createdById` = approver, `source = DISTRIBUTION`, `sourceRef = orderNumber`, credit (khata) bill for the full total.
- **Lines:**
  - Pack lines become base-unit lines at `price ÷ pack size`.
  - The scheme and hand discount go in as `lineDiscount`.
  - `unitName`, `unitQty`, `conversionRate` and `schemeId` are stored on SaleItem.
  - `priceTier = WHOLESALE`.
  - Free goods are their own `price 0` line, noted `Scheme: …`.
- **Stock:** comes out of the godown by FEFO batches. Too little stock leaves the order APPROVED with `invoiceError`.
- **Safe retries:** chunks of 20, one order at a time, each bill in its own transaction.
  - The order is claimed (`INVOICING`) before its bill is made.
  - A bill already made for the order (same `sourceRef`) is linked, never made twice.

## 7. Load sheets and settlement

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/distribution/load-sheets` | loadsheets.manage OR orders.view | `?status&from&to&deliveryUserId(=me)&page&limit` | `{ total; page; limit; sheets: LoadSheet[] }` |
| POST | `/distribution/load-sheets` | loadsheets.manage | `{ orderIds: ID[]; date?: DayKey; deliveryUserId?; driverName?; vehicleNo?; routeId?; note? }` | `LoadSheetDetail`: INVOICED orders of one godown, on no other sheet |
| GET | `/distribution/load-sheets/:id` | as list | – | `LoadSheetDetail` |
| PATCH | `/distribution/load-sheets/:id` | loadsheets.manage | `{ deliveryUserId?; driverName?; vehicleNo?; note? }` | `LoadSheetDetail` |
| POST | `/distribution/load-sheets/:id/orders` | loadsheets.manage | `{ orderIds: ID[] }` | `LoadSheetDetail` (OPEN only) |
| DELETE | `/distribution/load-sheets/:id/orders/:orderId` | loadsheets.manage | – | `LoadSheetDetail` (OPEN only; the order goes back to INVOICED) |
| POST | `/distribution/load-sheets/:id/dispatch` | loadsheets.manage | – | `LoadSheetDetail` (OPEN to DISPATCHED) |
| POST | `/distribution/load-sheets/:id/cancel` | loadsheets.manage | – | `LoadSheetDetail` (OPEN only; orders go back to INVOICED) |
| GET | `/distribution/load-sheets/:id/print` | as list | `?invoices=0` to leave out invoices | `{ kind: 'load-sheet'; business: Business; sheet: LoadSheetDetail; invoices?: InvoicePrint['invoices'] }` |
| GET | `/distribution/load-sheets/:id/settlement` | settle OR loadsheets.manage | – | `SettlementPreview` (with the delivery man's reports, §7a) |
| POST | `/distribution/load-sheets/:id/settle` | settle | `Settle` | `{ results: { orderId; orderNumber; ok; status?; returnsValue?; error? }[]; recoveries: { customerId; ok; id?; status?; error? }[]; sheet: LoadSheetDetail }` |

```ts
interface LoadSheet {
  id: ID; number: string /* LS-000001 */; date: ISO; shopId: ID | null; routeId: ID | null; deliveryUserId: ID | null; driverName: string | null; vehicleNo: string | null;
  status: LoadSheetStatus; invoiceCount: number; totalValue: Money;
  expectedCash: Money /* CASH-method money of the trip */; collectedCash: Money /* invoice money */; recoveryCash: Money; handedIn: Money | null; returnsValue: Money;
  shortAmount: Money /* expected − handedIn; >0 short, <0 excess */; note: string | null; dispatchedAt; settledById; settledAt; createdById; createdAt; updatedAt;
  deliveryUserName?: string | null; settledByName?: string | null; shopName?: string | null; routeName?: string | null;
}
interface GoodsRow { productId: ID; variantId: ID | null; name: string | null; sku: string | null; variantName: string | null; baseUnit: string; baseQty: number; packName: string | null; packSize: number | null; packs: number; loose: number; text: string /* '3 Carton + 5 pcs' */; value?: Money }
interface LoadSheetDetail extends LoadSheet {
  createdByName: string | null;
  orders: (Order & { itemCount; customer: CustomerCard | null; bookedByName; routeName; saleNumber: string | null })[];   // in route visit order
  goods: GoodsRow[];          // paid goods to pick
  freeGoods: GoodsRow[];      // scheme free goods, kept separate
  goodsTotals: { lines: number; baseQty: number; packs: number; value: Money; freeBaseQty: number };
}
interface SettlementPreview {
  sheet: Omit<LoadSheetDetail, 'orders'>;
  orders: { id; orderNumber; saleId; saleNumber; customer; total; status; deliveryStatus; cashCollected; returnsValue; settled: boolean;
            items: { id /* orderItemId */; productId; productName; baseUnit; unitName; conversionRate; qty; baseQty; total; netPerBase: number; freeBaseQty; freeProductId; freeProductName; deliveredBaseQty; deliveredFreeQty }[] }[];
  collections: (DistCollection & { collectedByName: string | null })[];
  deliveryReport: { invoices; reported; pending; delivered; partial; returned: number; cash: Money; otherMoney: Money; reportedByName: string | null; lastReportedAt: ISO } | null;
  money: { invoiceCollected; recoveries; recoveriesPending; expectedCash: Money; handedIn: Money | null; short: Money | null };
}
// Each order also carries `report: DeliveryReport | null` (§7a).
interface Settle {
  orders: { orderId: ID; outcome: DeliveryOutcome;
            lines?: { orderItemId: ID; returnBaseQty?: number; returnFreeQty?: number; damaged?: boolean }[];   // PARTIAL: what came back
            cashCollected?: Money; method?: MoneyMethod; returnReason?: string }[];
  recoveries?: { customerId: ID; amount: Money; method?: MoneyMethod; reference?: string }[];
  handedIn?: Money;           // send on the call that settles the last invoice
  verifyRecoveries?: boolean; // needs collections.verify: posts these and the sheet's pending ones now
  managerPin?: string;        // when Settings ask for a PIN on returns (refund PIN)
  note?: string;
}
```

Settlement rules:
- **Returns:** RETURNED or PARTIAL goods go through `ReturnsService.create` against the invoice, with refundMethod CASH. Because the bill is a credit bill, the return lowers the khata and pays out no cash. Damaged goods are not restocked.
- **Invoice cash:** recorded as an `INVOICE_CASH` collection and posted to the khata at once, in the same transaction that sets the order's outcome.
- **Order status:** becomes the outcome. Each order is settled once; a second try is refused.
- **Closing the sheet:** it becomes SETTLED once every invoice is settled and `handedIn` is known. Settling can be split over several calls.

### 7a. Delivery app (`/distribution/delivery/*`)

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/distribution/delivery/today` | delivery.report | – | `DeliveryToday`: the caller's DISPATCHED sheets |
| POST | `/distribution/delivery/sync` | delivery.report (recoveries also need collections.collect) | `DeliverySync` | `{ serverTime; results: DeliverySyncResult[]; counts }` |
| GET | `/distribution/delivery/staff` | loadsheets.manage OR routes.manage | – | `{ id; fullName; role; phone }[]`: active staff with delivery.report, for the "Delivery wala" pickers |

```ts
interface DeliveryToday {
  serverTime: ISO; today: DayKey; me: { id: ID; canCollect: boolean; canSeeBalance: boolean };
  sheets: { id; number; date; status; dispatchedAt; shopName; routeName; driverName; vehicleNo; note; invoiceCount; totalValue;
    invoices: { orderId; orderNumber; saleId; saleNumber; stop: number /* route order */; total; status; settled: boolean; deliveryStatus;
      customer: { id; name; businessName; phone; address; area; city; latitude; longitude; balance? /* khata.view only */ } | null;
      lines: { orderItemId; productId; name; variantName; baseUnit; unitName; conversionRate; qty; baseQty; total; netPerBase; freeBaseQty; freeProductId; freeProductName }[];
      report: DeliveryReport | null }[];
    recoveries: { id; clientRef; customerId; amount; method; status; collectedAt }[] /* the caller's, against this sheet */ }[];
}
interface DeliveryReport { id; clientRef; outcome: DeliveryOutcome; lines: SettleLine[]; cashCollected: Money; method: MoneyMethod; returnReason; note; reportedAt: ISO;
  status: 'PENDING' | 'USED' | 'CHANGED' /* closed at settlement: USED as reported, CHANGED by the office */ }
interface DeliverySync {
  reports?: { clientRef /* new uuid per change */; orderId; outcome: DeliveryOutcome; lines?: SettleLine[] /* PARTIAL */; cashCollected?; method?; returnReason?; note?; reportedAt?: ISO; latitude?; longitude?; accuracyM? }[];  // ≤200
  recoveries?: { clientRef; loadSheetId; customerId; amount; method?; reference?; note?; collectedAt?; latitude?; longitude? }[];                     // ≤200
}
interface DeliverySyncResult { kind: 'report' | 'recovery'; clientRef: string | null; status: SyncStatus; id?: ID; reason?: string; warnings?: string[] }
```

Rules:
- A report is only a record of what the delivery man says happened. It moves no stock and posts no money. One report per invoice: a newer report replaces the older one; an older one arriving late (smaller `reportedAt`) answers `duplicate`.
- Reports are accepted only for invoices on the caller's own DISPATCHED sheet that the office has not settled; the same rules as settlement apply (all returned with cash, more back than sent, PARTIAL with nothing back are conflicts).
- The settlement screen starts every invoice from its report. **Cash is counted once, at office settlement** (`/settle` with `cashCollected`).
- Recoveries on the trip are normal field collections against the sheet (PENDING until verified) and count in the sheet's expected cash once.
- `POST /distribution/collections` with a `saleId` whose order is on an unsettled load sheet is refused: that money belongs in the delivery report.

## 8. Collections and recoveries

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/distribution/collections` | collections.verify OR collections.collect | `?status&kind&customerId&routeId&collectedById&loadSheetId&from&to&page&limit` | `{ total; page; limit; totals: Record<CollectionStatus, { count; amount }>; collections: (DistCollection & { customer; collectedByName; verifiedByName; saleNumber })[] }`. Without verify, only your own |
| POST | `/distribution/collections` | collections.collect | `CreateCollection` | `{ collection: DistCollection; duplicate: boolean }` |
| POST | `/distribution/collections/verify` | collections.verify | `{ ids: ID[] }` | `{ results: ItemResult[]; verified: number }` |
| POST | `/distribution/collections/reject` | collections.verify | `{ ids: ID[]; reason?: string }` | `{ results: ItemResult[]; rejected: number }` |
| GET | `/distribution/collections/recoveries` | khata.view | `?routeId&overdueOnly&search&page&limit(≤500)` | `Recoveries` |
| GET | `/distribution/collections/recovery-sheet` | khata.view | `?routeId (required)&date` | `RecoverySheet` (kind `recovery-sheet`) |

```ts
interface CreateCollection { clientRef?: string; customerId: ID; amount: Money; method?: MoneyMethod; reference?: string; note?: string; saleId?: ID /* invoice; empty = recovery */; loadSheetId?: ID; collectedAt?: ISO; latitude?: number; longitude?: number }
interface DistCollection {
  id: ID; customerId: ID; loadSheetId: ID | null; saleId: ID | null; salesOrderId: ID | null; kind: CollectionKind; amount: Money; method: MoneyMethod;
  reference: string | null; note: string | null; status: CollectionStatus; ledgerId: ID | null /* CustomerLedger row once verified */; shopId: ID | null;
  collectedById: ID; collectedAt: ISO; verifiedById: ID | null; verifiedAt: ISO | null; rejectReason: string | null; clientRef: string | null; latitude; longitude; createdAt; updatedAt;
}
interface Ageing { d0_7: Money; d8_15: Money; d16_30: Money; d31_60: Money; d60_plus: Money }
interface RecoveryRow { customer: CustomerCard; balance: Money; ageing: Ageing; oldestDueAt: ISO | null; dueDays: number | null; creditDays: number | null; overdue: boolean; lastPaymentAt: ISO | null; lastPaymentAmount: Money | null; pendingCollected: Money; routeName?: string | null }
interface Recoveries { total: number; page; limit; totals: { customers; balance; pending; overdueCustomers; overdueBalance; ageing: Ageing }; customers: RecoveryRow[] }
interface RecoverySheet { kind: 'recovery-sheet'; business: { shopName; shopPhone; shopAddress } | null; date: DayKey; route: { id; name; code; area; bookerName; deliveryUserName }; rows: RecoveryRow[]; totals: { customers; balance; overdue; pending } }
```

Verification is atomic:
- In one transaction the collection is claimed (PENDING to VERIFIED), the customer's balance goes down, and `PAYMENT_RECEIVED` is written with the payment method. The khata row's `shopId` is the godown, so the cash register counts it.
- Paying more than is owed leaves an advance, as at the counter.
- With `settings.recoveryNeedsVerify = false`, a collection is posted when it is recorded.

## 9. Visits

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/distribution/visits` | orders.view | `?userId&routeId&customerId&outcome&from&to&page&limit` | `{ total; page; limit; from; to; byOutcome: Record<VisitOutcome, number>; visits: (Visit & { customer; userName; routeName; noOrderReasonLabel })[] }` |
| POST | `/distribution/visits` | orders.book | `CreateVisit` | `{ visit: Visit; duplicate: boolean; warning?: string \| null }` |

```ts
interface CreateVisit { clientRef?: string; customerId: ID; routeId?: ID; checkInAt?: ISO; checkOutAt?: ISO; latitude?: number; longitude?: number; accuracyM?: number;
  outcome: VisitOutcome; noOrderReason?: string /* required for NO_ORDER; code from meta.noOrderReasons */; note?: string;
  salesOrderId?: ID; salesOrderClientRef?: string; photoUrl?: string }
interface Visit extends Required<Pick<CreateVisit, 'customerId' | 'outcome'>> { id: ID; userId: ID; routeId: ID | null; checkInAt: ISO; checkOutAt: ISO | null; latitude; longitude; accuracyM;
  distanceM: number | null /* from the customer's saved GPS */; withinRadius: boolean | null /* radius + accuracy (≤100 m) */; noOrderReason; note; salesOrderId; photoUrl; clientRef; createdAt }
```

A visit far from the customer is saved and flagged (`withinRadius: false`), never refused. With `requireCheckIn` on, a warning also comes back.

## 10. Booker app (`/distribution/booker/*`, permission `distribution.orders.book`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/distribution/booker/bootstrap` | `?all=true` (needs orders.manage) | `Manifest` |
| GET | `/distribution/booker/bootstrap?entity=customers` | `&updatedSince&cursor&limit(≤1000, default 500)&all` | `Page<BootCustomer>`; also needs customers.view |
| GET | `/distribution/booker/bootstrap?entity=products` | same | `Page<BootProduct>`; also needs products.view |
| GET | `/distribution/booker/bootstrap?entity=priceListItems` | `&priceListId (required)&cursor&limit` | `Page<PriceListItemInput & { id }> & { priceListId; listUpdatedAt }` |
| POST | `/distribution/booker/sync` | `Sync` | `SyncResponse` |
| GET | `/distribution/booker/summary` | `?date` | `DaySummary` |
| GET | `/distribution/booker/orders` | `ListOrders` | own orders only (same shape as `/distribution/orders`) |
| GET | `/distribution/booker/orders/:id` | – | own `OrderDetail` |
| POST | `/distribution/booker/orders` | `CreateOrder` | online booking, same as `POST /distribution/orders` |
| PATCH | `/distribution/booker/orders/:id` | `UpdateOrder` | own BOOKED orders |
| POST | `/distribution/booker/orders/preview` | `{ customerId; items }` | `Preview` |
| GET | `/distribution/booker/visits` | `ListVisits` | own visits |
| GET | `/distribution/booker/collections` | `ListCollections` | own collections |

```ts
interface Manifest {
  serverTime: ISO; today: DayKey; weekday: number; timezone: string;
  me: { id; fullName; email; phone; canOverridePrice: boolean; canCollect: boolean; canSeeBalance: boolean; canSeeCustomers: boolean; canSeeProducts: boolean };
  settings: DistributionSettings; meta: SettingsResponse['meta'];
  routes: { id; name; code; area; shopId; visitDays: number[]; dueToday: boolean; updatedAt: ISO }[];   // the caller's routes
  shops: { id; name; type: 'SHOP' | 'WAREHOUSE' | 'GODOWN' }[];
  priceLists: { id; name; code; basedOn; adjustPct; isDefault; updatedAt: ISO; itemCount: number }[];
  schemes: Scheme[];          // all active; filter with the resolver
  noOrderReasons: { code; label }[];
  counts: { customers: number; products: number };
  pageSize: number;
}
interface Page<T> { entity: string; serverTime: ISO; items: T[]; nextCursor: string | null }
interface BootCustomer { id; name; businessName; phone; address; area; city; routeId; routeSeq; priceListId; priceTier; latitude; longitude; ntn; strn; licenseNo; licenseExpiry;
  creditDays; creditLimit?: Money; balance?: Money; oldestDueAt?: ISO | null /* money fields only with khata.view */; isActive: boolean; updatedAt: ISO }
interface BootProduct { id; name; sku; barcode; unit; price; wholesalePrice; creditPrice; brandId; categoryId; brandName; categoryName; imageUrl; taxRate; isActive: boolean; updatedAt: ISO;
  variants: { id; name; price; wholesalePrice; creditPrice }[];
  units: { id; variantId; unitName; conversionRate; price; wholesalePrice; creditPrice; barcode; isDefault }[];
  stock: { shopId; variantId; qty: number /* free stock in the caller's godowns */ }[] }

interface Sync { orders?: CreateOrder[]; visits?: CreateVisit[]; collections?: CreateCollection[] }   // ≤200 each; every item MUST carry clientRef
type SyncStatus = 'ok' | 'duplicate' | 'conflict' | 'error';
interface SyncResult { kind: 'order' | 'visit' | 'collection'; clientRef: string | null; status: SyncStatus; id?: ID; number?: string /* order number */;
  reason?: string /* Roman Urdu, for conflict and error */; warnings?: string[] /* accepted with server changes */; total?: Money /* server order total */; orderStatus?: OrderStatus }
interface SyncResponse { serverTime: ISO; results: SyncResult[]; counts: Record<SyncStatus, number> }
interface DaySummary { date: DayKey; routes: { id; name }[]; planned: number; visited: number; productive: number; strikeRate: number;
  orders: { count; value; lines }; noOrder: { reason; label; count }[]; collections: { count; amount; cash; pending }; notVisited: { id; name; routeId }[] }
```

## 11. Reports, dashboard and print

| Method | Path | Permission | Query | Response |
|---|---|---|---|---|
| GET | `/distribution/dashboard` | orders.view | – | `Dashboard` |
| GET | `/distribution/reports/dsr` | orders.view AND reports.view | `?date&bookerId&routeId` | `Dsr` |
| GET | `/distribution/reports/summary` | orders.view AND reports.view | `?from&to&routeId&bookerId` | `Summary` |
| GET | `/admin/distribution/usage` | SUPER_ADMIN | `?tenantId` | `AdminUsage` |

```ts
interface Dashboard { date: DayKey; today: { orders; value; visits; productiveVisits };
  waiting: { toApprove: { count; value }; approvedNotInvoiced: { count; value }; invoiceProblems: number; toLoad: { count; value }; onVans: { count; value };
             openSheets: Partial<Record<'OPEN' | 'DISPATCHED', { count; value }>>; collectionsToVerify: { count; amount } };
  receivable: { customers: number; amount: Money } }
interface DsrRow { bookerId; bookerName; routes: string[]; planned; visited; productive; strikeRate /* % */; orders; value; lines; linesPerCall; dropSize; schemeDiscount;
  outOfRangeCheckIns; noOrder: { reason; label; count }[]; collected; collectedPending; firstActivityHour: number | null; lastActivityHour: number | null }
interface Dsr { date: DayKey; weekday: number; bookers: DsrRow[]; totals: { planned; visited; productive; strikeRate; orders; value; lines; collected } }
interface Summary { from: DayKey; to: DayKey;
  booked: { orders; value; cancelled };
  invoiced: { invoices; value; delivered; partial; returned; notSettled; returnsValue; cashAtDelivery; schemeDiscount };
  recoveries: { verified; verifiedCount; pending; pendingCount };
  byRoute: { routeId; routeName; invoices; value; returns; cash }[]; byBooker: { bookerId; bookerName; invoices; value; returns; cash }[];
  topProducts: { productId; name; baseUnit; baseQty; value }[];
  bySchemes: { schemeId; name; type; isClaimable; lines; discount; freeBaseQty; freeCost?: Money /* cost.view only */ }[] }
interface AdminUsage { tenants: { tenantId; name; status; businessType; enabled; plan: { name; slug; featureDistribution } | null; subscriptionStatus;
  bookerLogins: number /* active non-owner users with orders.book */; activeBookers30d: number; orders30d: number; orderValue30d: Money }[];
  totals: { tenants: number; bookerLogins: number } }

interface Business { name; legalName; address; city; phone; email; logoUrl; footer; ntn; strn }   // ntn/strn from FBR settings
interface InvoicePrint { kind: 'invoice-a4'; business: Business; invoices: {
  orderId; orderNumber; saleId; invoiceNumber /* Sale.saleNumber */; date: ISO; bookedAt; deliveryDate; status /* Sale status */;
  customer: (CustomerCard & { licenseNo; licenseExpiry; cnic }) | null; bookedByName; routeName;
  lines: { no; productId; name; sku; unitName; conversionRate; qty; baseQty; rate /* per pack */; gross; schemeDiscount; discount; net; schemeNote; taxRate; taxIncluded }[];
  free: { productId; name; baseQty; text; schemeNote }[];
  totals: { gross; schemeDiscount; discount; total; taxIncluded; paid; returned; previousBalance: Money | null; balanceAfterInvoice: Money | null };
  note }[] }
```

## 12. AI tools (Nafaa AI)

Two tools are added at the end of `TOOL_SPECS`, so the cached prompt prefix is unchanged:
- `distribution_dsr`: needs `distribution.orders.view` and `reports.view`.
- `route_recovery`: needs `khata.view`.

Both answer `NOT_ENABLED` when distribution is off. Their links are `/distribution/reports?tab=dsr&date=…` and `/distribution/recoveries[?routeId=]`.

## 13. Shared sales path changes (all optional)

- `CreateSaleDto.items[]` accepts `unitName`, `unitQty`, `conversionRate` and `schemeId`. These are stored on SaleItem only when sent. `quantity` and `priceOverride` stay per base unit.
- `price-cut.helper` (the counter discount guard) treats these as owner-set prices, not discounts, when distribution is on:
  - the customer's price-list price (any pack, per base unit);
  - that price after a running scheme's rupees off;
  - free lines (`price 0`, note starting `Scheme: `) up to the free quantity the bill's paid lines earned.
- With distribution off, nothing changes.

## 14. Phase 2

Migration `20261031300000_distribution_phase2` (additive: new tables, defaulted columns). Every new field is optional; the shared sales path is unchanged.

### 14.0 New permissions (explicit; MANAGER defaults include all of them)

| Key | What it allows |
|---|---|
| `distribution.vans.manage` | Add vans, load from the godown, open and close the van day (count, short / excess, unload) |
| `distribution.vans.sell` | Spot invoices from the van given to you (`POST /distribution/vans/:id/sell`), see that van |
| `distribution.returns.collect` | Record market returns (PENDING), in the office or through booker sync |
| `distribution.returns.approve` | Approve / reject market returns; typed credit rates are kept only with this |
| `distribution.claims.manage` | Principals (brand mapping), claims: make, print, submit, record money received (other income) |
| `distribution.targets.manage` | Monthly targets |
| `distribution.cheques.manage` | Cheque register: deposit, clear, bounce, cancel |

Presets: `ORDER_BOOKER` and `DELIVERY` gain `returns.collect`; new `VAN_SALESMAN` (STAFF): `vans.sell`, `collections.collect`, `returns.collect`, `customers.view`, `products.view`, `khata.view`; `DISTRIBUTION_MANAGER` gains all seven.

Route rules: `vans/:id/sell` POST vans.sell; `vans` GET vans.manage | vans.sell | orders.view, write vans.manage; `returns/(approve|reject)` returns.approve; `returns` GET returns.approve | returns.collect (own only) | orders.view, write returns.collect; `principals` GET claims.manage | targets.manage | schemes.manage | orders.view, write claims.manage; `claims` claims.manage; `targets` GET targets.manage | orders.view, write targets.manage; `cheques` GET cheques.manage | collections.verify, write cheques.manage.

### 14.1 Vans (`/distribution/vans`)

A van is a `DistVan` plus its own WAREHOUSE-type Shop (`shopId`, named "Van: …"), created with the van. Its stock is ordinary ShopStock.

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/distribution/vans` | – | `{ vans: VanRow[] }` (a salesman without manage/view sees only his) |
| GET | `/distribution/vans/mine` | – | the caller's own vans |
| POST | `/distribution/vans` | `{ name; vehicleNo?; homeShopId? (godown); salesmanId?; routeId?; note? }` | `VanDetail` |
| GET / PATCH | `/distribution/vans/:id` | same fields, `isActive?` | `VanDetail` |
| POST | `/distribution/vans/:id/open` | `{ salesmanId?; note? }` | van day (`DistVanSession`, one OPEN per van) |
| POST | `/distribution/vans/:id/load` | `{ items: { productId; variantId?; unitId?; qty /* pack */ }[]; note? }` | `{ transferId; transferNumber; van: VanDetail }` — a transfer godown → van sent and received at once; opens the day when needed |
| POST | `/distribution/vans/:id/sell` | `VanSell` | `{ order: OrderDetail; duplicate; invoice: { saleId; saleNumber }; collection: DistCollection \| null; warnings }` |
| GET | `/distribution/vans/:id/close` | – | `{ session; lines: VanLine[] }` |
| POST | `/distribution/vans/:id/close` | `{ counts?: { productId; variantId?; counted /* base */ }[]; handedIn?; unload? (default true); verifyCollections?; note? }` | closed session with `lines` |
| GET | `/distribution/vans/:id/sessions` | – | `{ sessions }` |
| GET | `/distribution/vans/sessions/:sessionId` | – | session with invoices, returns, money, `lines` |

```ts
interface VanSell { clientRef?; customerId; items: OrderLine[]; cashReceived?: Money; method?: FieldMethod; bankName?; chequeNo?; chequeDate?; managerPin?; note?; latitude?; longitude? }
type FieldMethod = MoneyMethod | 'CHEQUE';
interface VanLine { productId; variantId; name; baseUnit; opening; loaded; sold; returnsIn; writtenOff; other; expected /* system stock */; counted?; variance?; unloaded?; text }
```

Rules:
- Sell: the order is priced like any order (price list, schemes), approved, invoiced from the van shop through `SalesService.create` (source DISTRIBUTION) and marked DELIVERED. Only the unpaid part counts for the credit limit; over it, `managerPin` (WARN_THEN_PIN) or refusal (BLOCK). A failed invoice leaves no order behind (the phone may resend the same clientRef); the error body carries `needsPin`.
- Cash taken is an INVOICE_CASH collection of the van day (`vanSessionId`), PENDING unless settings post at once; verified at close (`verifyCollections`) or on Recoveries.
- Close: lines come from the van's stock movements since the day opened. `counted − expected` is booked as stock adjustments (short: LOSS, reason THEFT; extra: ADJUSTMENT_IN, AUDIT_FOUND). Then everything left is transferred back to the godown. `shortAmount = expectedCash (CASH collections of the day) − handedIn`.

### 14.2 Market returns (`/distribution/returns`)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/distribution/returns` | `?status&customerId&routeId&collectedById&from&to&page&limit` | `{ total; page; limit; totals: Record<status, { count; value; credited }>; returns }` |
| POST | `/distribution/returns` | `CreateMarketReturn` | `{ marketReturn; duplicate }` |
| POST | `/distribution/returns/preview` | same body | `{ lines (rate, value, costValue, supplierId, claimable); total }` |
| GET | `/distribution/returns/:id` | – | detail with items, sale returns made |
| POST | `/distribution/returns/approve` | `{ ids; managerPin? }` | `{ results: { id; number; ok; status; credited?; error?; needsPin? }[]; approved; needsPin }` |
| POST | `/distribution/returns/reject` | `{ ids; reason? }` | `{ results; rejected }` |

```ts
interface CreateMarketReturn { clientRef?; customerId; shopId? /* godown */; vanId?; note?; collectedAt?; latitude?; longitude?; approve?: boolean; managerPin?;
  items: { productId; variantId?; unitId?; qty /* pack */; condition: 'GOOD' | 'DAMAGED' | 'EXPIRED'; reason?; batchNo?; expiryDate?; rate? /* per pack, returns.approve only */; claimable?; supplierId? }[] }
```

- Credit rate: the customer's latest invoice price of the item (after discounts), else their price list.
- Approve posts against the customer's invoices first (newest bill with that item unreturned) through `ReturnsService` (refund method CASH, restock only GOOD; damaged / expired go out as damage). Whatever the khata cannot absorb stays as an advance (REFUND row on the khata, never drawer cash). Quantity no invoice covers: stock in (RETURN_IN), damaged / expired written off by stock adjustment (DAMAGE / EXPIRY, LOSS), value credited as a khata ADJUSTMENT. Note: this last part has no sale behind it, so profit reports do not see its margin.
- `claimable` defaults to true for DAMAGED / EXPIRED lines whose brand has a principal.
- Booker sync takes `returns: CreateMarketReturn[]` (needs `returns.collect`); results kind `return`.

### 14.3 Principals and claims

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/distribution/principals` | – | `{ suppliers: { id; name; brandIds; brandNames; schemes; isPrincipal }[]; brands: { id; name; supplierId }[] }` |
| PUT | `/distribution/principals/:supplierId/brands` | `{ brandIds }` | same; a brand moves from another principal |
| GET | `/distribution/claims/pending` | `?from&to` (default this month) | `{ from; to; principals: { supplierId; supplierName; schemeDiscount; freeGoodsValue; returnsValue; total; lines }[]; total; openClaims }` |
| GET | `/distribution/claims/preview` | `?supplierId&from&to` | lines a claim would take |
| GET | `/distribution/claims` | `?status&supplierId` | `{ claims }` |
| POST | `/distribution/claims` | `{ supplierId; from?; to?; note? }` | claim statement |
| GET | `/distribution/claims/:id` | – | `{ kind: 'claim-statement'; business; claim (lines, totals, balance); supplier; receipts }` |
| POST | `/distribution/claims/:id/submit` | `{ reference?; note? }` | DRAFT → SUBMITTED |
| POST | `/distribution/claims/:id/receive` | `{ amount; receivedVia: 'SUPPLIER_KHATA' \| 'CASH_DRAWER' \| 'ACCOUNT'; moneyAccountId?; shopId?; date?; note? }` | RECEIVED when paid in full |
| POST | `/distribution/claims/:id/cancel` | – | lines become claimable again (not after money arrived) |

- Scheme lines: settled invoices of the period (by invoice date) whose line used a claimable scheme of the principal. Rupees off are claimed for the delivered share; free goods at cost (the free bill line's cost) for what was delivered.
- Return lines: approved market return lines marked claimable for the principal, at cost.
- Each line is stamped with its claim (`claimId`), so it is never claimed twice.
- Money received is written as other income, category SCHEME_CLAIM, through the income module: SUPPLIER_KHATA sets it off on the supplier khata (ADJUSTMENT), CASH_DRAWER / ACCOUNT as cash or a deposit. It counts in net profit.
- A product's principal is its brand's (`DistPrincipalBrand`). Claims, targets and commission by principal use this.

### 14.4 Targets and commission

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/distribution/targets` | `?period=YYYY-MM&userId` | `{ period; today; pace /* % of month gone */; daysLeft; targets: TargetRow[] }` |
| POST | `/distribution/targets` | `{ period; userId?; routeId?; brandId?; supplierId?; metric: 'VALUE' \| 'QTY'; target; unitName?; note? }` | target |
| PATCH / DELETE | `/distribution/targets/:id` | partial | |
| POST | `/distribution/targets/copy` | `{ from; to }` | `{ copied; skipped }` |

`TargetRow`: target plus `label, userName, routeName, brandName, supplierName, achieved, pct, expectedByNow, onTrack, remaining, perDayNeeded`. Achievement = invoices of the month (business time), each line for its delivered share; VALUE in rupees, QTY in base units or the target's pack. `GET /distribution/booker/summary` now also returns the caller's `targets`.

Commission: `CommissionRule` takes `brandIds` and `supplierIds` (principals) next to `categoryIds` (`POST/PATCH /commission/rules`). Sales count for a rule only when they match every list that is set. Existing rules have empty lists and work as before.

### 14.5 Cheques / PDC

- Record: any collection (`POST /distribution/collections`, booker sync, delivery sync recoveries, van sell) with `method: 'CHEQUE'` and `bankName`, `chequeNo`, `chequeDate` (YYYY-MM-DD). The cheque row is written with the collection; the same cheque (customer, bank, number) is refused twice.
- When the collection is verified, the khata gets PAYMENT_RECEIVED with payment method BANK_TRANSFER and reference "Cheque #…". Cheques never count in a load sheet's or van's expected cash.

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/distribution/cheques` | `?status&customerId&due=today\|week\|later&from&to&search&page&limit` | `{ today; total; totals: Record<status, { count; amount }>; due: { today; week }; cheques (customer, collectionStatus, postDated, overdue) }` |
| POST | `/distribution/cheques/:id/deposit` | `{ date?; moneyAccountId?; note? }` | RECEIVED → DEPOSITED |
| POST | `/distribution/cheques/:id/clear` | `{ date?; note? }` | → CLEARED (collection must be verified) |
| POST | `/distribution/cheques/:id/bounce` | `{ reason? }` | → BOUNCED: a verified payment is taken back with a khata ADJUSTMENT noted "Cheque bounce: #… (bank) — reason"; an unverified collection is rejected |
| POST | `/distribution/cheques/:id/cancel` | `{ reason? }` | RECEIVED and not verified only |

### 14.6 Stock reservation

- An order left APPROVED without its invoice (PIN needed, stock short, no godown) holds what is free of its goods (paid and free) in its godown: `ShopStock.reserved` goes up and the hold is written on the order (`reservation`, `reservedAt`). The counter and every invoice already treat reserved stock as not free.
- The hold is given back just before the order's own invoice is made, and when the order is cancelled. Van orders never hold.
- `GET /distribution/orders/stock-check?ids=a,b` → `{ lines: { shopId; productId; name; need; stock; reservedByOthers; free; short; orderIds }[]; shortLines; orders: { id; orderNumber; short; holding }[] }` for BOOKED / APPROVED orders: the desk warns before approving.
- Dashboard `phase2.ordersHoldingStock` counts them.

### 14.7 Visit analytics

`GET /distribution/reports/visits?from&to&bookerId&routeId&flags=1` (orders.view AND reports.view) → `{ from; to; rows; totals; flagged? }`. One row per booker per business day: `planned, visited, productive, unproductive, notVisited, strikeRate, coverage, orders, value, firstAt, lastAt, timeInMarketMin, avgVisitMin, longestGapMin, travelledKm` (straight line between check-ins) and `flags { farFromShop, noGps, shopWithoutGps, poorAccuracy }`. `flags=1` lists the far / no-GPS visits.

### 14.8 Sales tax invoice

`GET /distribution/orders/print?ids=…&tax=1` → kind `tax-invoice-a4`: the invoice-a4 data plus `business.taxLabel, business.taxNumber` and per invoice `tax { lines: { rate; valueExclTax; salesTax; valueInclTax }[]; valueExclTax; salesTax; valueInclTax; buyerRegistered; fbr: { status; invoiceNumber; qrCode; verificationUrl } | null }`. Rate: the item's tax rate, else the shop's (Settings → Tax) when tax is on. Prices include tax, so totals equal the bill.

### 14.9 Schemes

- `isMix` (boolean) on schemes: covered products on one order count together toward `buyQty` and the slabs. Percent and rupees per pack apply to each covered line; free goods go on the covered line with the most packs (or `freeProductId`).
- Slabs must have different `minQty`.
- The counter's discount guard checks a line against mix schemes with the rest of the bill.

### 14.10 Dashboard additions

`GET /distribution/dashboard` adds `phase2 { returnsToApprove { count; value }; chequesToDeposit { count; amount }; vansOut; ordersHoldingStock }`.

### 14.11 AI tools (appended at the end of TOOL_SPECS)

- `targets_status` (distribution.orders.view)
- `van_stock` (distribution.orders.view)
- `pending_claims` (distribution.claims.manage)

All answer NOT_ENABLED when distribution is off.

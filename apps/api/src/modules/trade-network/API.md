# Trade network API

Businesses on Nafaa linked as buyer and seller. A shop (buyer) orders from its distributor or wholesaler (seller) on Nafaa; the order lands in the seller's distribution Orders desk as a normal sales order; delivery becomes a draft Purchase in the buyer's books; payments post on both sides once the other side confirms.

All paths are under `/api/trade-network`. Responses are wrapped as `{ success, data, timestamp }`; errors as `{ success: false, statusCode, message }` with `message` in simple Roman Urdu. Money is rupees rounded to 2 decimals, quantities in base units rounded to 4.

## 0. Roles, isolation and switches

- **Any business can buy.** Selling needs distribution open (plan `featureDistribution` and `DistributionSettings.enabled`); the seller's approve, resume, profile save and new code refuse otherwise, the buyer's catalog and order placing answer `Supplier ki taraf se Order abhi band hain`, and a seller with distribution closed never appears in find or the directory.
- **A business can be both.** A wholesaler buys from its company (buyer link) and sells to shops (seller links); each link is its own record.
- **Isolation.** Every read or write of the other business starts from a `TradeLink` the caller is a party to (`linkFor` in `trade-network.support.ts`). Ids of the other business (customer, supplier, sales order, purchase) are taken only from the link or the network order, and each query also filters by that business's `tenantId`. A non-party gets 404 (no hint that the link exists). Before a link is active the other side sees only a business card (name, city, area, logo, phone with all but the last 4 digits hidden).
- **Acting user.** Automatic work in the other business uses one of its own users: the seller's `bookedById` (else the approver, else the owner) books network orders; the buyer who placed the order (else the requester, else the owner) owns draft purchases.

### Permissions (explicit; nothing is implied)

| Key | What it allows |
|---|---|
| `trade.buy` | Buyer: linked suppliers, catalogs, cart prices, suggestions, product matches, place and cancel orders, own order list and detail, receiving list |
| `trade.receive` | Buyer: "Maal mil gaya" — receive a delivered order into stock (makes and receives the Purchase, may create products when matching) |
| `trade.sell` | Seller: network customers, incoming requests list, a buyer's network orders and statement |
| `trade.links.manage` | Buyer: send and withdraw requests, auto-receive setting, unlink. Seller: approve, reject, pause, resume, unlink, terms, profile, invite code |
| `trade.payments.manage` | Record payments; confirm, dispute or cancel them |

Route rules: `common/constants/permission-routes.ts` under `^trade-network/...`. Statement and payment lists accept any of several keys at the route, then the service checks the caller's side (buyer: `trade.buy`/`payments`/`links`; seller: `trade.sell`/`payments`/`links`).

`MANAGER` defaults: `trade.buy`, `trade.receive`, `trade.sell`, `trade.payments.manage` (not `trade.links.manage`: linking sets credit terms). Defaults for new managers only. Owners have all.

## 1. Types

```ts
type LinkStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'REJECTED' | 'UNLINKED' | 'CANCELLED';
type TradeStatus = 'BOOKED' | 'APPROVED' | 'INVOICED' | 'LOADED' | 'DELIVERED' | 'PARTIAL' | 'RETURNED' | 'CANCELLED';
type ReceiveState = 'NONE' | 'PREPARING' | 'NEEDS_MAP' | 'DRAFT' | 'RECEIVING' | 'RECEIVED' | 'NOTHING';
type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'CANCELLED';
interface BusinessCard { tenantId; name; phone; city; area; address; logoUrl; businessType }
```

Seller sales order status → buyer status: `INVOICING` shows as `APPROVED`; everything else maps one to one. `LOADED` is shown as "Raste me".

## 2. Overview and profile

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/overview` | any trade key | – | `{ buyer: { suppliers; openOrders; toReceive; paymentsToConfirm }; seller: { canSell; access; customers; requests; paymentsToConfirm; newOrders }; perms: { buy; receive; sell; links; payments } }` |
| GET | `/profile` | links.manage, sell or buy | – | `{ profile: TradeProfile; card: BusinessCard; canSell; access }` (made on first read with a fresh invite code) |
| PUT | `/profile` | links.manage + distribution open | `{ acceptRequests?; listed?; displayName?; phone?; city?; area?; categories?: string[]; brands?: string[]; about?; minOrderValue?; catalogScope?: 'ALL' \| 'LISTED' }` | as GET. `listed: true` needs a city |
| POST | `/profile/new-code` | links.manage + distribution open | – | as GET. The old code stops working; existing links are untouched |
| GET | `/profile/options` | links.manage or sell | – | `{ priceLists; routes; staff }` for the approve and terms screens |

Invite code: `NF-` + 6 letters/digits (no 0/O/1/I/L). The web invite link is `/network/join/<code>`. `catalogScope: 'LISTED'` shows a buyer only products on their price list.

## 3. Finding and linking

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/find` | links.manage or buy | `?code=` or `?phone=` | `{ seller: publicCard; link: { id; status } \| null }[]` (≤5). Phone matches the network, shop, business or owner phone on the last 10 digits |
| GET | `/directory` | links.manage or buy | `?search&city&category` | `{ cities: string[]; sellers: { profileId; seller; categories; brands; about; minOrderValue; link }[] }` (listed, accepting, distribution open) |
| POST | `/requests` | links.manage | `{ code? \| phone? \| profileId?; note? }` | `LinkView`. One row per pair: a REJECTED, UNLINKED or CANCELLED link is opened again; a PENDING one is returned as is; ACTIVE/PAUSED is a 409 |
| GET | `/requests/incoming` | sell or links.manage | – | `{ id; requestNote; requestedVia; requestedAt; buyer: BusinessCard; suggestedCustomer: { id; name; phone; balance } \| null }[]` |
| GET | `/links/:id` | any trade key | – | `LinkView` (each side sees its own record of the other: seller → customer with price list, route, credit; buyer → supplier with balance, autoReceive) |
| POST | `/links/:id/approve` | links.manage (seller) + distribution open | `Terms` | `LinkView` |
| POST | `/links/:id/reject` | links.manage (seller) | `{ reason? }` | `LinkView` |
| POST | `/links/:id/cancel` | links.manage (buyer) | – | withdraw a PENDING request |
| POST | `/links/:id/pause` / `resume` | links.manage (seller) | – | PAUSED stops new orders only |
| POST | `/links/:id/unlink` | links.manage (either side) | – | UNLINKED. Placed orders still sync, receive and settle |
| PATCH | `/links/:id/terms` | links.manage (seller) | `Terms` | `LinkView` |
| PATCH | `/links/:id/buyer-settings` | links.manage (buyer) | `{ autoReceive?; receiveShopId? }` | `LinkView` |
| GET | `/customers` | sell | `?status=A,B` (default ACTIVE,PAUSED,UNLINKED) | network customers with khata, terms, 30-day orders and value, payments to confirm |
| GET | `/suppliers` | buy | – | all buyer links with seller card, Supplier record and balance, open orders, to receive, payments to confirm |

```ts
interface Terms { customerId?: ID /* approve only: use this existing customer */; priceListId?: ID | null; routeId?: ID | null; creditLimit?: number; creditDays?: number | null; bookedById?: ID }
```

Approval, in one transaction:
1. **Seller side:** the buyer becomes a Customer: `customerId` when given, else an active customer with the same phone (last 10 digits), else the same name/business name, else a new one (name, phone, address, city, `priceTier: WHOLESALE`). A customer already on another live link is refused.
2. Terms go on that customer (`priceListId`, `routeId` checked to be the seller's own).
3. **Buyer side:** the seller becomes a Supplier: the one from an earlier link, else same phone, else same name, else new.
4. Link → ACTIVE, `activatedAt` kept from the first approval.

## 4. Buying

| Method | Path | Permission | Body / query | Response |
|---|---|---|---|---|
| GET | `/suppliers/:linkId/catalog` | buy | `?search&categoryId&page&limit(≤100)` | `Catalog` |
| POST | `/suppliers/:linkId/preview` | buy | `{ items: CartLine[] }` | `CartPreview` |
| GET | `/suppliers/:linkId/suggestions` | buy | – | `{ items: { mine; seller; suggest: { unitId; unitName; conversionRate; qty; price } }[] }` |
| GET / PUT | `/suppliers/:linkId/product-map` | buy | PUT `{ maps: MapChoice[] }` | remembered matches / `{ saved }` |
| POST | `/orders` | buy | `{ linkId; items: CartLine[] (1..300); note?; clientRef?; deliveryDate? }` | `{ order: TradeOrderDetail; duplicate; warnings }` |
| GET | `/orders` | buy | `?status=A,B&linkId&page&limit` | `{ total; page; limit; counts: Record<TradeStatus, number>; orders }` |
| GET | `/orders/:id` | buy | – | `TradeOrderDetail` (journey times, seller's invoice lines, purchase, payments) |
| POST | `/orders/:id/cancel` | buy | – | only while the seller's order is BOOKED |
| GET | `/orders/my-products` | buy | `?search` | own products to match against (≤20) |

```ts
interface CartLine { productId: ID; variantId?: ID | null; unitId?: ID | null /* seller pack; empty = base */; qty: number }
interface Catalog { seller; minOrderValue; priceListName; total; page; limit; categories: { id; name }[];
  items: { productId; name; sku; barcode; baseUnit; imageUrl; brandName; categoryId; inStock: boolean /* no exact stock is shown */;
    packs: { unitId; unitName; conversionRate; price /* buyer's list price per pack */; retail }[];
    schemes: { id; name; label /* '10 Carton + 1 free' */; minOrderValue }[];
    mine: { productId; name; stock; lowStockAlert; low } | null /* the buyer's matched product */ }[] }
interface CartPreview { lines: { productId; unitId; unitName; name; qty; baseQty; price; gross; schemeDiscount; total; schemeNote; freeBaseQty; freeProductName }[]; subtotal; schemeDiscount; total; warnings: string[] }
```

Prices and schemes come from the seller's distribution helpers on the server (`pricingFor`, `priceOrder`, scheme resolver) for the buyer's customer record, so the cart matches the seller's desk exactly. Buyers cannot send prices or discounts.

Placing an order:
1. Link ACTIVE, seller distribution open, the buyer's customer record active, total ≥ `profile.minOrderValue`.
2. `OrdersService.create` (distribution) runs as the seller's acting user with `clientRef = tn-<tradeOrderId>`, the buyer's customer and the items, note `Nafaa order: <buyer>`.
3. The sales order gets `source = 'NETWORK'` (new nullable column). It shows in the Orders desk with a "Nafaa order" badge and is approved, invoiced, loaded and settled exactly as any order.
4. The buyer's `TradeOrder` keeps the link, the sales order id and a copy of the cart. `clientRef` makes the call idempotent.

Suggestions: the buyer's active products with `stock ≤ lowStockAlert`, matched to the seller's products (remembered, then barcode/pack barcode, SKU, name). Suggested quantity: up to twice the low level, in the seller's biggest pack when at least half a pack is needed.

## 5. Sync and receiving

`TradeSyncService` runs every 30 s (and on buyer and seller network reads); `DISABLE_TRADE_SYNC=1` turns the timer off.

- **Status:** each open network order is compared with its sales order. A forward move updates the TradeOrder (invoice number and total from the seller's Sale, returns, cash at delivery, times) and notifies the buyer once (the update claims the old status).
- **Delivery → draft Purchase** (DELIVERED, PARTIAL, RETURNED):
  - Lines are what was delivered: settlement's `deliveredBaseQty`/`deliveredFreeQty`; full quantity when DELIVERED without line figures; nothing when RETURNED (`receiveState: NOTHING`).
  - Cost is the invoice net per base unit (`line total ÷ baseQty`, after scheme and discount); scheme free goods are their own lines at 0 (the free product when the scheme gives another product).
  - Purchase total is balanced to the seller's khata figure, `Sale.total − returnsValue`: rounding or invoice tax goes into `discount` or `otherCharges`.
  - The purchase is made through `PurchasesService.create(receive: false)` from the link's Supplier, in base units, `supplierInvoiceNo` = invoice number, notes tagged `Nafaa network <tradeOrderId>` (a retry finds it instead of making a second).
  - Unmatched products: `receiveState: NEEDS_MAP`, the buyer is notified once and matches each line (own product or `create: true`); matches are remembered per link.
  - With `autoReceive` on, the draft is received at once.

| Method | Path | Permission | Body | Response |
|---|---|---|---|---|
| GET | `/receiving` | receive or buy | – | `{ waiting: (TradeOrderRow & { purchase; lines: ReceiveLine[] })[]; recent: TradeOrderRow[] }` |
| POST | `/orders/:id/receive` | receive | `{ maps?: MapChoice[] }` | `{ state: ReceiveState; order }` |

```ts
interface MapChoice { sellerProductId: ID; sellerVariantId?: ID | null; buyerProductId?: ID | null; buyerVariantId?: ID | null; create?: boolean }
interface ReceiveLine { sellerProductId; sellerVariantId; name; sku; barcode; baseUnit; baseQty; unitCost; value; free; mine: { productId; name; stock; matchedBy } | null }
```

"Maal mil gaya" saves the matches, makes the draft if needed, then `PurchasesService.receive` for every line with `close: true`. Stock, weighted average cost (free goods lower it), batches and the supplier khata (`PURCHASE_CREDIT`) follow the purchasing rules. A purchase already received on the Purchases page is just marked RECEIVED. The seller is told the goods arrived.

## 6. Payments and the statement

| Method | Path | Permission | Body | Response |
|---|---|---|---|---|
| POST | `/links/:id/payments` | payments.manage | `{ amount; method?; reference?; note?; paidAt?; tradeOrderId? }` | `Payment` |
| GET | `/payments` | payments.manage, buy or sell | `?status&linkId` | `Payment[]` |
| POST | `/payments/:id/confirm` | payments.manage (other side) | – | `Payment` |
| POST | `/payments/:id/dispute` | payments.manage (other side) | `{ reason }` | `Payment` |
| POST | `/payments/:id/cancel` | payments.manage (recorder) | – | `Payment` |
| GET | `/links/:id/statement` | side read | – | `Statement` |

```ts
interface Payment { id; linkId; source: 'SELLER' | 'BUYER'; status: PaymentStatus; amount; method; reference; note; paidAt; tradeOrderId; disputeReason;
  mine: boolean; postedHere: boolean; postedThere: boolean; canConfirm: boolean; canDispute: boolean; canCancel: boolean }
interface Statement { link; seller; buyer;
  totals: { delivered; returns; paid; agreedBalance /* delivered − returns − confirmed payments */; onTheWay; pendingFromSeller; pendingFromBuyer; disputed; toReceive };
  ownBalance: number | null /* caller's own khata balance with the other party; may include business from before the link */;
  entries: { at; kind: 'INVOICE' | 'RETURN' | 'PAYMENT'; ref; text; debit; credit; state; counts: boolean; balance: number | null }[] }
```

Rules (never silent double posting):
- **Recording side posts at once** in its own books:
  - Seller: a verified network collection (`DistCollection` RECOVERY + `PAYMENT_RECEIVED` on the buyer's customer, advance allowed as at the counter).
  - Buyer: `PAYMENT_MADE` on the seller's supplier (cannot exceed what is owed: receive delivered goods first).
- **Other side posts only on confirm.** The claim (`PENDING`/`DISPUTED` → `CONFIRMED` while that side's ledger id is empty), the ledger row and its id on the TradePayment are written in one transaction. Each TradePayment holds at most one ledger row per side (unique columns).
- **Payments written outside the network are mirrored.** The sync scans, since the link started:
  - the seller's `PAYMENT_RECEIVED` rows for the buyer's customer (counter payments, recoveries, settlement cash at delivery);
  - the buyer's `PAYMENT_MADE` rows for the seller's supplier.

  Each row not yet held becomes a PENDING TradePayment for the other side to confirm, matched to a network order by invoice or order number in the reference.
- **Dispute** keeps the payment out of the other side's books.
- **Cancel** is only for payments recorded through the network and not yet confirmed. It writes a reversing ADJUSTMENT in the recorder's books.
- **Statement** is built only from the link's records:
  - invoices count once delivered (before that they show as "on the way");
  - settlement returns are credits;
  - payments count when CONFIRMED.

  Both sides see the same entries and balance.

## 7. Notifications

Through `NotificationsService` (business-wide, push included), `metadata.kind = 'TRADE'`:
- **Seller:** link request, new order, order withdrawn, goods received by the buyer, payment to confirm, payment confirmed or disputed.
- **Buyer:** link approved or rejected, paused or resumed, unlinked, order approved / invoiced / on the van / delivered (partial, returned) / cancelled, items to match, purchase ready, payment to confirm, payment confirmed or disputed.

## 8. Data

Migration `20261031400000_trade_network` (additive):
- `SalesOrder.source`;
- tables `TradeLink`, `TradeProfile`, `TradeOrder`, `TradeProductMap`, `TradePayment` (FKs only to `TradeLink`, cascade).

No backfill; nothing changes for existing data.

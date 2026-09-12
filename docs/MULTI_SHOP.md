# Multi-Shop (Branches) — how it works

One tenant can run many branches: shops, warehouses, godowns. This document is
the contract every module follows. Read it before adding a feature that touches
money or stock.

---

## 1. What is shared and what is per-branch

**Shared across the whole tenant (master data)**
Products, categories, brands, units, variants, customers, suppliers, discount
codes, tax and receipt settings.

One product, one customer, one supplier — recognised at every branch. This is
what lets a customer take udhaar at Shop A and settle it at Shop B.

**Owned by one branch (transactions)**
`Sale`, `SaleReturn`, `Purchase`, `Expense`, `CustomerLedger`, `StockMovement`,
`StockAdjustment`, `CashRegister`, `ShopStock`, `StockTransfer`.

Each of these carries a `shopId`. It is nullable only so that history created
before branches existed, and rows written by background jobs, stay readable.

---

## 2. Stock has exactly one source of truth

```
ShopStock (shop × product × variant)   ← the truth
      ↓ summed
Product.stock / ProductVariant.stock   ← caches, never written directly
```

Every movement of stock — purchase in, sale out, return, damage, adjustment,
transfer — goes through **`applyStockDelta()`** in
`apps/api/src/common/shop-scope/shop-stock.helper.ts`. It updates the branch row
and re-derives the cached totals in the same transaction.

> This used to be broken: purchases incremented `Product.stock` only, while
> sales decremented `ShopStock` only, and nothing reconciled the two. A new
> branch therefore stayed at zero stock forever. Do not reintroduce a direct
> `product.update({ stock: ... })` anywhere.

A transfer is the one case that does **not** change the cached totals — it moves
units between two `ShopStock` rows, so the tenant-wide sum is unchanged.

**Repair tool:** `POST /shops/reconcile-stock` (owner only, `?dryRun=true` to
preview) recomputes every cached total from the branch rows and parks any
untracked units in the main shop.

> **Reconcile never reduces stock.** Where `Product.stock` exceeds the sum of
> the branch rows, the difference is parked in the main shop rather than being
> written off — including for variant products, whose parked units land on a
> `variantId`-NULL row. Skipping those would leave `Product.stock` above its
> branch rows, and the next `applyStockDelta()` would then quietly recache it
> downwards; the shopkeeper would see stock vanish days later with no
> explanation. Parking keeps the count and makes the correction an explicit
> stock adjustment they choose to make.

---

## 3. How a request picks its branch

The web client sends the active branch on every request:

```
x-shop-id: <shopId>     one branch
x-shop-id: all          owner's consolidated view
(header absent)         same as "all" — tenant-wide
```

`ShopScopeInterceptor` turns that into a `ShopScope` before any controller runs:

| Role | What they get |
|---|---|
| `OWNER` / `SUPER_ADMIN` | any branch of their tenant, or `all` |
| `MANAGER` / `CASHIER` / `STAFF` | **always** their assigned shop — the header is ignored entirely |

So a tampered client gains nothing: role locking happens server-side, once.

### Using it in a controller

```ts
@Get()
findAll(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
  return this.service.findAll(user, shop);
}
```

### Using it in a service

```ts
// Reads — narrow on top of tenantId
where: { tenantId: user.tenantId, ...scope.where }

// Reads where hiding legacy untagged rows would look like data loss
where: { tenantId: user.tenantId, ...scope.whereLoose }

// Writes that must land in one branch
const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
```

`scope.where` is `{}` when the scope is "all shops", so the query simply stays
tenant-wide — which is exactly the pre-multishop behaviour. That is why adding
the scope to a module is always backward compatible.

`resolveWriteShopId` prefers an explicit `dto.shopId` (offline sales replaying
after a branch switch depend on this), then the active branch, then the tenant's
main shop.

### Legacy `?shopId=` endpoints

Plenty of endpoints predate the interceptor and filter by a query param. The
interceptor fills `shopId` in from the active branch when the caller left it
out, so those routes follow the switcher too. An explicit value still wins —
report drill-downs pass one deliberately.

> **Express 5 gotcha:** `req.query` is a getter that re-parses the URL on every
> access, so `req.query.shopId = x` is silently discarded. The interceptor
> shadows the prototype getter with an own property via `Object.defineProperty`.
> If you ever need to inject another query value, do it the same way.

---

## 4. Khata (customer credit) across branches

- `Customer.balance` — what the customer owes **in total**.
- branch balance — `SUM(CustomerLedger.amount)` for that branch.

A payment is validated against the **total**, on purpose: the customer may settle
anywhere. Each branch still sees what it personally is owed, so nobody chases
money another branch already collected.

Opening balances are per branch. Setting one restates that branch's share and
moves the customer's total by the difference; other branches are untouched.

---

## 4b. Customers: one person, per-branch lists

The instinct is "every branch should have its own customers". Splitting the
*record* is the wrong way to get there:

- the same person would carry two balances, and udhaar taken at Shop A could
  never be settled at Shop B;
- one phone number would exist twice, with two loyalty pots and two credit
  limits;
- "total customers" in every report would double-count.

So the record stays shared and `Customer.shopId` marks the **home branch** — who
registered them. A branch's list is:

```
shopId = this branch   OR   has a Sale / CustomerLedger row at this branch
```

A customer added here shows up immediately; a walk-in from another branch joins
the list the moment they actually buy something. `?scope=all` shows everyone.

**Search deliberately ignores the branch filter.** A cashier typing a phone
number must never be told "not found" for someone who simply first shopped
elsewhere — that dead end is far worse than a longer list.

## 5. Frontend rules

- `currentShopId` lives in the auth store and may hold the `'all'` sentinel.
- `useShopParam()` returns `undefined` for both "all shops" and "nothing
  selected" — use it anywhere a single branch is required. `useActiveShopId()`
  returns the raw value (the shop switcher itself needs that).
- Switching branch calls `resetServerCache()`. Almost no React Query key carries
  the shop id, so the whole cache has to go — otherwise the new branch renders
  the old branch's numbers until each query happens to go stale.
- Screens that write a transaction are gated by `<RequireShop>` /
  `<PosShopGuard>`: POS (every industry pack's `/pos` route, gated centrally in
  `IndustryRoutes.tsx`) and the cash register.

---

## 6. Adding a new shop-scoped feature — checklist

1. Does the model belong to a branch? Add `shopId String?` + relation +
   `@@index([shopId])` and `@@index([tenantId, shopId])`.
2. Controller: take `@CurrentShop() shop: ShopScope` and pass it down.
3. Reads: spread `scope.where` (or `scope.whereLoose` for history views).
4. Writes: `resolveWriteShopId(...)`, never trust the body alone.
5. Stock: `applyStockDelta()` — never touch `Product.stock` directly.
6. Deleting a branch must not orphan money. `shops.service.remove` blocks the
   delete while any sales, purchases, expenses or khata entries point at it.

---

## 7. Testing a change to branch scoping

Three things go wrong often enough to be worth checking every time.

**1. The header has to survive CORS.** `x-shop-id` is a custom header, so the
browser sends a preflight. `main.ts` uses an explicit `allowedHeaders` list — a
header missing from it fails the preflight, every request is blocked in the
browser, and the offline-first client silently falls back to cached data. The
app then looks *half* working, which is the confusing part. Check with:

```bash
curl -s -D - -o /dev/null -X OPTIONS http://127.0.0.1:4000/api/shops \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,x-shop-id" | grep -i access-control
```

**2. Never inject into `req.query`.** The global `ValidationPipe` runs with
`forbidNonWhitelisted`, so an injected `shopId` on a route whose query DTO has no
such field fails the whole request with `property shopId should not exist`. Use
`@ShopIdParam()` instead — it reads the value without the pipe seeing it.

**3. `$queryRaw` fragments need `Prisma.sql`.** A nested template literal —
``${shopId ? `AND s."shopId" = '${shopId}'` : ''}`` — is bound as a *parameter*,
not spliced as SQL, and the query becomes a syntax error the moment a shopId is
actually supplied. Build the fragment with `Prisma.sql` / `Prisma.empty`.

### Smoke test both modes

The fastest way to catch a regression is to walk the read endpoints once with a
concrete branch and once with `all`, and look for anything ≥ 400. Both modes
matter: `scope.where` is `{}` for "all shops", so a query that only breaks in one
mode is easy to miss.

### Stock must come from the branch, never from `Product.stock`

Three read paths independently had this wrong, and the symptom is always the
same: every branch shows identical numbers while POS shows the right ones.

| Endpoint | Was reading | Now reads |
|---|---|---|
| `GET /products` | `Product.stock` | `ShopStock` for the branch, summed over variants |
| `GET /reports/stock` | `Product.stock`, tenant-wide rolls/IMEIs | branch `ShopStock`, branch rolls, branch IMEIs |
| `GET /products/low-stock` | `stock <= 10` hardcoded | each row's own `lowStockAlert` |

When adding a screen that shows a quantity, ask which of the two numbers it
wants. `Product.stock` is only right for a tenant-wide roll-up; anything a
shopkeeper reads about *their* shop has to come from `ShopStock`.

### All Shops is its own workspace

`Sidebar` swaps to `allShopsNavGroups` when the owner is on the consolidated
view — a short, owner-level menu (branch analytics, reports, khata, stock,
team) rather than the full operational one. Counter screens are absent because
they cannot act on every branch at once; items that need one branch carry
`needsShop: true` and are filtered out.

### All Shops is its own screen

`DashboardPage` hands off to `AllShopsDashboard` when the owner is on the
consolidated view — branch ranking, share of month, udhaar per branch, which
registers are shut. It is not the single-shop dashboard with bigger numbers,
because the question changes from "how did today go" to "which branch needs me".
The hand-off sits *after* every hook in the page: an early return above them
would change how many hooks React sees when the user switches branches.

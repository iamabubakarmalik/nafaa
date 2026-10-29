/**
 * Local demo data for distribution, on the demo-retail@nafaa.test business,
 * and an end-to-end run of the main flows through the running API.
 *
 *   npx ts-node --transpile-only scripts/seed-distribution-demo.ts            (API on http://localhost:4000)
 *   API_URL=http://localhost:4001 npx ts-node --transpile-only scripts/seed-distribution-demo.ts
 *
 * Phase 1 writes base rows straight to the database: a godown with stock,
 * carton packs, a booker and a delivery user, and 15 retailer customers.
 * Phase 2 does the rest over HTTP as the owner and the booker would: price
 * lists, routes, schemes, synced orders, visits and recoveries, approval and
 * invoicing, a load sheet, settlement and verification, then the reports.
 *
 * Everything it makes carries "seed:distribution" (customer notes, pack
 * labels, codes, notes) so it can be found and removed later. Refuses to run
 * against anything but a localhost database. Running it twice adds another
 * round of orders; base rows are reused.
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/utils/password.util';
import { applyStockDelta } from '../src/common/shop-scope/shop-stock.helper';
import { DISTRIBUTION_PRESETS } from '../src/common/constants/permissions.constants';

const TAG = 'seed:distribution';
const API = process.env.API_URL || 'http://localhost:4000';
const OWNER = { email: 'demo-retail@nafaa.test', password: 'Demo@Nafaa2026' };
const BOOKER = { email: 'demo-booker@nafaa.test', password: 'Demo@Nafaa2026', name: 'Imran (Booker)' };
const DELIVERY = { email: 'demo-delivery@nafaa.test', password: 'Demo@Nafaa2026', name: 'Akram (Delivery)' };

const prisma = new PrismaClient();
const log = (...a: unknown[]) => console.log(...a);

/* ───────────── phase 1: database ───────────── */

async function phase1() {
  const url = process.env.DATABASE_URL ?? '';
  const masked = url.replace(/:\/\/([^:@]+)(:[^@]*)?@/, '://$1:****@');
  log(`Database: ${masked}`);
  if (!/@localhost[:/]|@127\.0\.0\.1[:/]/.test(url)) throw new Error('Refusing: not a localhost database');

  const owner = await prisma.user.findUniqueOrThrow({ where: { email: OWNER.email } });
  const tenantId = owner.tenantId;

  // The plan must carry the feature locally (admin turns it on per plan in production).
  const sub = await prisma.subscription.findFirst({ where: { tenantId, status: { in: ['TRIAL', 'ACTIVE'] } }, orderBy: { createdAt: 'desc' }, select: { planId: true } });
  if (sub) await prisma.plan.update({ where: { id: sub.planId }, data: { featureDistribution: true } });

  let godown = await prisma.shop.findFirst({ where: { tenantId, name: 'Nafaa Demo Mart - Godown' } });
  if (!godown) {
    godown = await prisma.shop.create({ data: { tenantId, name: 'Nafaa Demo Mart - Godown', type: 'WAREHOUSE', address: `Badami Bagh, Lahore (${TAG})`, isActive: true } });
  }

  const mkUser = async (u: typeof BOOKER, preset: 'ORDER_BOOKER' | 'DELIVERY') => {
    const permissions = DISTRIBUTION_PRESETS.find((p) => p.key === preset)!.permissions as string[];
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) return prisma.user.update({ where: { id: existing.id }, data: { permissions, isActive: true } });
    return prisma.user.create({
      data: { tenantId, email: u.email, fullName: u.name, role: 'STAFF', passwordHash: await hashPassword(u.password), permissions, emailVerified: true },
    });
  };
  const booker = await mkUser(BOOKER, 'ORDER_BOOKER');
  const delivery = await mkUser(DELIVERY, 'DELIVERY');

  // Carton packs and godown stock for the first 12 products.
  const products = await prisma.product.findMany({ where: { tenantId, isActive: true, isRawMaterial: false }, orderBy: { name: 'asc' }, take: 12 });
  const sizes = [24, 12, 24, 36, 12, 24, 48, 12, 24, 6, 12, 24];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const size = sizes[i];
    const has = await prisma.productUnit.findFirst({ where: { tenantId, productId: p.id, unitName: 'Carton' } });
    if (!has) {
      await prisma.productUnit.create({
        data: {
          tenantId, productId: p.id, unitName: 'Carton', unitLabel: `Carton (${size}) ${TAG}`, conversionType: 'CARTON',
          conversionRate: size, price: Math.round(p.price * size * 0.97), wholesalePrice: Math.round((p.wholesalePrice || p.price * 0.92) * size * 0.97),
          costPrice: Math.round(p.costPrice * size),
        },
      });
    }
    const stock = await prisma.shopStock.findFirst({ where: { shopId: godown.id, productId: p.id, variantId: null } });
    if (!stock || stock.stock < size * 20) {
      await prisma.$transaction((tx) => applyStockDelta({
        tx, tenantId, shopId: godown!.id, productId: p.id, delta: size * 60 - (stock?.stock ?? 0) + size * 20,
        movementType: 'OPENING_BALANCE', reference: TAG, note: `Godown opening stock (${TAG})`, userId: owner.id,
      }));
    }
  }

  // 15 retailers around Lahore.
  const shops = [
    ['Haji Kiryana Store', 'Haji Aslam', 'Shadman'], ['Madina General Store', 'Bilal Ahmed', 'Shadman'], ['Al-Rehman Mart', 'Rehman', 'Ichhra'],
    ['Usman Traders', 'Usman Ghani', 'Ichhra'], ['Bismillah Store', 'Nadeem', 'Mozang'], ['Faisal Kiryana', 'Faisal', 'Garden Town'],
    ['Pak Super Store', 'Kashif', 'Garden Town'], ['Ali Brothers', 'Ali Raza', 'Model Town'], ['City Mart', 'Shahid', 'Model Town'],
    ['Zam Zam Store', 'Tariq', 'Faisal Town'], ['Fresh Point', 'Salman', 'Faisal Town'], ['Rehmat Store', 'Rehmat Ali', 'Township'],
    ['Saeed General Store', 'Saeed', 'Township'], ['Gulshan Mart', 'Waqas', 'Green Town'], ['Noor Traders', 'Noor Ahmed', 'Green Town'],
  ];
  const customers = [];
  for (let i = 0; i < shops.length; i++) {
    const [biz, name, area] = shops[i];
    const phone = `0300${String(7100000 + i)}`;
    let c = await prisma.customer.findFirst({ where: { tenantId, phone } });
    if (!c) {
      c = await prisma.customer.create({
        data: {
          tenantId, name, businessName: biz, phone, area, city: 'Lahore', address: `${area}, Lahore`, notes: TAG,
          creditLimit: i === 4 ? 2000 : 150000, creditDays: i % 3 === 0 ? 7 : 15, strn: i % 5 === 0 ? `32-77-8761-${100 + i}` : null,
          latitude: 31.52 + (i % 5) * 0.004, longitude: 74.33 + Math.floor(i / 5) * 0.006,
        },
      });
    }
    customers.push(c);
  }
  // An old balance on two customers, so recovery and ageing have something to show.
  for (const [idx, amount, daysAgo] of [[0, 18500, 40], [3, 7200, 12]] as const) {
    const c = customers[idx];
    const seeded = await prisma.customerLedger.findFirst({ where: { tenantId, customerId: c.id, reference: TAG } });
    if (seeded) continue;
    const at = new Date(Date.now() - daysAgo * 86_400_000);
    const up = await prisma.customer.update({ where: { id: c.id }, data: { balance: { increment: amount } } });
    await prisma.customerLedger.create({
      data: { tenantId, customerId: c.id, shopId: godown.id, createdById: owner.id, type: 'OPENING_BALANCE', amount, balanceAfter: up.balance, reference: TAG, note: `Purana khata (${TAG})`, createdAt: at },
    });
  }

  return { tenantId, godown, booker, delivery, products, customers };
}

/* ───────────── phase 2: HTTP ───────────── */

async function call<T = any>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/api${path}`, {
    method, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(json?.message ?? json).slice(0, 300)}`);
  return (json?.data ?? json) as T;
}

async function login(u: { email: string; password: string }) {
  const res = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: u.email, password: u.password }) });
  const json = (await res.json()) as any;
  if (!res.ok) throw new Error(`login ${u.email}: ${JSON.stringify(json).slice(0, 200)}`);
  return json.data.accessToken as string;
}

async function phase2(base: Awaited<ReturnType<typeof phase1>>) {
  const { godown, booker, delivery, products, customers } = base;
  const owner = await login(OWNER);
  const ok = (label: string, v: unknown) => log(`  ✓ ${label}`, v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v).slice(0, 220));

  log('Settings');
  ok('enable', (await call(owner, 'PUT', '/distribution/settings', { enabled: true, defaultShopId: godown.id, creditMode: 'WARN_THEN_PIN' })).settings);

  log('Price lists');
  const lists = await call<any[]>(owner, 'GET', '/distribution/price-lists');
  let retail = lists.find((l) => l.name === 'Retailers');
  if (!retail) retail = await call(owner, 'POST', '/distribution/price-lists', { name: 'Retailers', code: 'RET', basedOn: 'WHOLESALE', adjustPct: 0, isDefault: true, note: TAG });
  let key = lists.find((l) => l.name === 'Key accounts');
  if (!key) key = await call(owner, 'POST', '/distribution/price-lists', { name: 'Key accounts', code: 'KEY', basedOn: 'WHOLESALE', adjustPct: -3, note: TAG });
  const units = await base.products.length;
  const cartonIds = await prisma.productUnit.findMany({ where: { productId: { in: products.map((p) => p.id) }, unitName: 'Carton' }, select: { id: true, productId: true, wholesalePrice: true } });
  ok('rows', await call(owner, 'PUT', `/distribution/price-lists/${retail.id}/items`, {
    items: [
      { productId: products[0].id, price: Math.round((products[0].wholesalePrice || products[0].price * 0.92) * 0.98) },
      ...cartonIds.slice(0, 4).map((c) => ({ productId: c.productId, unitId: c.id, price: Math.round((c.wholesalePrice || 0) * 0.98) })),
    ],
  }));
  ok('grid', (await call(owner, 'GET', `/distribution/price-lists/${retail.id}/grid?limit=3`)).products.map((p: any) => p.rows.length));
  ok(`${units} products have cartons`, undefined);

  log('Customers on lists (customer form fields)');
  for (let i = 0; i < customers.length; i++) {
    await call(owner, 'PATCH', `/customers/${customers[i].id}`, { priceListId: i % 4 === 0 ? key.id : retail.id, licenseNo: i % 5 === 0 ? `DL-${2000 + i}` : undefined, licenseExpiry: i % 5 === 0 ? '2027-06-30' : undefined });
  }
  ok('price lists set', customers.length);

  log('Routes');
  const existing = await call<any[]>(owner, 'GET', '/distribution/routes');
  const routeDefs = [
    { name: 'Shadman - Ichhra', code: 'SEED-R1', area: 'Shadman, Ichhra, Mozang', visitDays: [1, 4] },
    { name: 'Garden Town - Model Town', code: 'SEED-R2', area: 'Garden Town, Model Town', visitDays: [4, 6] },
    { name: 'Faisal Town - Township', code: 'SEED-R3', area: 'Faisal Town, Township, Green Town', visitDays: [2, 5] },
  ];
  const routes = [];
  for (let i = 0; i < routeDefs.length; i++) {
    let r = existing.find((x) => x.code === routeDefs[i].code);
    if (!r) r = await call(owner, 'POST', '/distribution/routes', { ...routeDefs[i], shopId: godown.id, bookerId: booker.id, deliveryUserId: delivery.id });
    await call(owner, 'POST', `/distribution/routes/${r.id}/customers`, { customerIds: customers.slice(i * 5, i * 5 + 5).map((c) => c.id), replace: true });
    routes.push(r);
  }
  ok('routes', routes.map((r) => r.name));
  ok('day view', (await call(owner, 'GET', '/distribution/routes/day')).routes.map((r: any) => `${r.name}: ${r.customers}`));

  log('Schemes');
  const schemes = await call<any[]>(owner, 'GET', '/distribution/schemes');
  const free = cartonIds[0];
  if (!schemes.some((s) => s.note === TAG && s.type === 'FREE_QTY')) {
    await call(owner, 'POST', '/distribution/schemes', { name: '10+1 Carton', type: 'FREE_QTY', productIds: [free.productId], buyQty: 10, buyUnitName: 'Carton', freeQty: 1, note: TAG });
  }
  if (!schemes.some((s) => s.note === TAG && s.type === 'PERCENT_OFF')) {
    await call(owner, 'POST', '/distribution/schemes', { name: '3% on 2+ cartons', type: 'PERCENT_OFF', productIds: cartonIds.slice(1, 4).map((c) => c.productId), buyQty: 2, buyUnitName: 'Carton', value: 3, note: TAG });
  }
  if (!schemes.some((s) => s.note === TAG && s.type === 'SLAB')) {
    await call(owner, 'POST', '/distribution/schemes', { name: 'Slab: 5 ctn 2%, 10 ctn 4%', type: 'SLAB', productIds: [cartonIds[4].productId], buyUnitName: 'Carton', slabs: [{ minQty: 5, percent: 2 }, { minQty: 10, percent: 4 }], note: TAG });
  }
  ok('schemes', (await call<any[]>(owner, 'GET', '/distribution/schemes?status=live')).map((s) => s.name));

  log('Booker app');
  const bk = await login(BOOKER);
  const manifest = await call(bk, 'GET', '/distribution/booker/bootstrap');
  ok('manifest', { routes: manifest.routes.length, lists: manifest.priceLists.length, schemes: manifest.schemes.length, counts: manifest.counts });
  const cPage = await call(bk, 'GET', '/distribution/booker/bootstrap?entity=customers&limit=6');
  const cPage2 = await call(bk, 'GET', `/distribution/booker/bootstrap?entity=customers&limit=6&cursor=${cPage.nextCursor}`);
  ok('customer pages', [cPage.items.length, cPage2.items.length, !!cPage.nextCursor]);
  const pPage = await call(bk, 'GET', '/distribution/booker/bootstrap?entity=products&limit=5');
  ok('products page', { items: pPage.items.length, units: pPage.items[0]?.units?.length, stock: pPage.items[0]?.stock });
  const lPage = await call(bk, 'GET', `/distribution/booker/bootstrap?entity=priceListItems&priceListId=${retail.id}`);
  ok('list rows', lPage.items.length);

  const run = Date.now().toString(36);
  const line = (i: number, ctn: number, pcs = 0) => [
    ...(ctn ? [{ productId: cartonIds[i].productId, unitId: cartonIds[i].id, qty: ctn }] : []),
    ...(pcs ? [{ productId: products[(i + 5) % products.length].id, qty: pcs }] : []),
  ];
  const orders = [
    { c: 0, items: [...line(0, 11), ...line(1, 2, 6)] },
    { c: 1, items: [...line(2, 3), ...line(4, 6)] },
    { c: 2, items: [...line(3, 1, 12)] },
    { c: 3, items: [...line(1, 4), ...line(2, 1)] },
    { c: 4, items: [...line(0, 2)] }, // over the Rs 2000 credit limit
    { c: 5, items: [...line(4, 10)] },
    { c: 6, items: [...line(3, 2)] },
  ].map((o, i) => ({
    clientRef: `${TAG}-${run}-o${i}`, customerId: customers[o.c].id, items: o.items,
    latitude: customers[o.c].latitude, longitude: customers[o.c].longitude, gpsAccuracy: 12, note: TAG,
    bookedAt: new Date(Date.now() - (7 - i) * 600_000).toISOString(),
  }));
  const visits = [
    { clientRef: `${TAG}-${run}-v0`, customerId: customers[0].id, outcome: 'ORDER', salesOrderClientRef: orders[0].clientRef, latitude: customers[0].latitude, longitude: customers[0].longitude, accuracyM: 10 },
    { clientRef: `${TAG}-${run}-v1`, customerId: customers[7].id, outcome: 'NO_ORDER', noOrderReason: 'STOCK_AVAILABLE', latitude: (customers[7].latitude ?? 0) + 0.01, longitude: customers[7].longitude, accuracyM: 25 },
    { clientRef: `${TAG}-${run}-v2`, customerId: customers[8].id, outcome: 'CLOSED', noOrderReason: 'SHOP_CLOSED', latitude: customers[8].latitude, longitude: customers[8].longitude },
  ];
  const collections = [
    { clientRef: `${TAG}-${run}-c0`, customerId: customers[0].id, amount: 5000, method: 'CASH', note: TAG },
    { clientRef: `${TAG}-${run}-c1`, customerId: customers[3].id, amount: 2000, method: 'JAZZCASH', reference: 'JC-77812', note: TAG },
    { clientRef: `${TAG}-${run}-bad`, customerId: '00000000-0000-0000-0000-000000000000', amount: 100 },
  ];
  const sync1 = await call(bk, 'POST', '/distribution/booker/sync', { orders, visits, collections });
  ok('sync', sync1.counts);
  for (const r of sync1.results) if (r.status !== 'ok') ok(`  ${r.kind} ${r.status}`, r.reason);
  const sync2 = await call(bk, 'POST', '/distribution/booker/sync', { orders: orders.slice(0, 2) });
  ok('sync again (duplicates)', sync2.counts);
  ok('booker summary', await call(bk, 'GET', '/distribution/booker/summary'));

  const orderIds = sync1.results.filter((r: any) => r.kind === 'order' && r.status === 'ok').map((r: any) => r.id);

  log('Office: preview, approve and invoice');
  ok('preview', (await call(owner, 'POST', '/distribution/orders/preview', { customerId: customers[0].id, items: line(0, 11) })).lines.map((l: any) => [l.total, l.freeBaseQty, l.schemeNote]));
  const approved = await call(owner, 'POST', '/distribution/orders/approve', { ids: orderIds.slice(0, 6) });
  ok('approve', { invoiced: approved.invoiced, failed: approved.failed, needsPin: approved.needsPin });
  for (const r of approved.results) if (!r.ok) ok(`  ${r.orderNumber}`, r.error);

  log('Load sheet');
  const invoiced = approved.results.filter((r: any) => r.ok).map((r: any) => r.id).slice(0, 4);
  const sheet = await call(owner, 'POST', '/distribution/load-sheets', { orderIds: invoiced, deliveryUserId: delivery.id, vehicleNo: 'LES-4471', driverName: 'Akram', note: TAG });
  ok('sheet', { number: sheet.number, invoices: sheet.invoiceCount, value: sheet.totalValue, goods: sheet.goods.map((g: any) => g.text).slice(0, 4), free: sheet.freeGoods.map((g: any) => g.text) });
  await call(owner, 'POST', `/distribution/load-sheets/${sheet.id}/dispatch`);
  const printed = await call(owner, 'GET', `/distribution/load-sheets/${sheet.id}/print`);
  ok('print', { invoices: printed.invoices.length, firstLines: printed.invoices[0]?.lines.length, prevBalance: printed.invoices[0]?.totals.previousBalance });

  log('Settlement');
  const pre = await call(owner, 'GET', `/distribution/load-sheets/${sheet.id}/settlement`);
  const [o1, o2, o3, o4] = pre.orders;
  const settle = await call(owner, 'POST', `/distribution/load-sheets/${sheet.id}/settle`, {
    orders: [
      { orderId: o1.id, outcome: 'DELIVERED', cashCollected: Math.round(o1.total * 0.5) },
      ...(o2 ? [{ orderId: o2.id, outcome: 'PARTIAL', cashCollected: 1000, returnReason: 'Dukaan wale ne kam maal liya', lines: [{ orderItemId: o2.items[0].id, returnBaseQty: o2.items[0].conversionRate }] }] : []),
      ...(o3 ? [{ orderId: o3.id, outcome: 'RETURNED', returnReason: 'Dukaan band thi' }] : []),
      ...(o4 ? [{ orderId: o4.id, outcome: 'DELIVERED', cashCollected: o4.total }] : []),
    ],
    recoveries: [{ customerId: customers[3].id, amount: 1500, method: 'CASH' }],
    handedIn: Math.round(o1.total * 0.5) + 1000 + (o4?.total ?? 0) + 1500 - 200,
    verifyRecoveries: true,
  });
  ok('settle', settle.results.map((r: any) => `${r.orderNumber}: ${r.ok ? r.status : r.error}${r.returnsValue ? ` (wapsi ${r.returnsValue})` : ''}`));
  ok('sheet after', { status: settle.sheet.status, expectedCash: settle.sheet.expectedCash, handedIn: settle.sheet.handedIn, short: settle.sheet.shortAmount, returns: settle.sheet.returnsValue });

  log('Recoveries');
  const pending = await call(owner, 'GET', '/distribution/collections?status=PENDING');
  ok('pending', pending.totals);
  const v = await call(owner, 'POST', '/distribution/collections/verify', { ids: pending.collections.map((c: any) => c.id) });
  ok('verified', v.verified);
  const rec = await call(owner, 'GET', '/distribution/collections/recoveries');
  ok('recoveries', rec.totals);
  ok('recovery sheet', (await call(owner, 'GET', `/distribution/collections/recovery-sheet?routeId=${routes[0].id}`)).totals);

  log('Reports');
  ok('dashboard', await call(owner, 'GET', '/distribution/dashboard'));
  ok('dsr', (await call(owner, 'GET', '/distribution/reports/dsr')).totals);
  ok('summary', (await call(owner, 'GET', '/distribution/reports/summary')).invoiced);
  ok('admin usage needs super admin', 'skipped');
}

async function main() {
  const base = await phase1();
  log(`Phase 1 done: godown ${base.godown.name}, ${base.products.length} products, ${base.customers.length} customers`);
  if (process.argv.includes('--db-only')) return;
  await phase2(base);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());

/**
 * Offline engine harness against the local API (http://localhost:4000).
 *
 *   npx tsx scripts/offline-harness/run.mts
 *
 * 1. Offline: new customer -> khata bill for them -> khata payment -> online.
 *    Each change is sent once, temp ids are replaced, balances match the server.
 * 2. Lost answer: the server makes the bill but the phone never hears back;
 *    the retry gets the stored answer (Idempotent-Replayed) and no second bill.
 * 3. Conflict: a product deleted on the server, then sold offline -> Sync issues.
 *
 * Uses the demo business (demo-retail@nafaa.test). Writes real rows to the
 * LOCAL database only.
 */

import { execFileSync } from 'node:child_process';
import { OfflineEngine } from '../../src/core/offline/engine/engine.ts';
import { HttpError } from '../../src/core/offline/engine/types.ts';
import { fetchHttp, nodeDb, uuid } from './adapters.mts';

const EMAIL = process.env.HARNESS_EMAIL ?? 'demo-retail@nafaa.test';
const PASSWORD = process.env.HARNESS_PASSWORD ?? 'Demo@Nafaa2026';

let failures = 0;
function check(label: string, ok: boolean, extra?: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`);
  if (!ok) failures++;
}

/** Counts on the local Postgres (never prod: host is localhost). */
function sql(query: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-d', 'nafaa', '-Atc', query], { encoding: 'utf8' }).trim();
}

const http = fetchHttp();
await http.login(EMAIL, PASSWORD);
const me = (await http.raw<{ id: string; tenantId: string; role: string; shopId: string | null; permissions?: string[] }>({ method: 'GET', path: '/auth/me' })).data as unknown as {
  user: { id: string; tenantId: string; role: string; shopId: string | null; permissions?: string[] };
};
const user = me.user ?? (me as unknown as { id: string; tenantId: string; role: string; shopId: string | null });
const db = nodeDb();
const engine = new OfflineEngine({
  db, http, uuid,
  session: () => ({ tenantId: user.tenantId, userId: user.id, shopId: user.shopId, role: user.role, permissions: user.permissions }),
  log: (m) => { if (process.env.HARNESS_VERBOSE) console.log(m); },
});
await engine.init();

/* ── first full download ── */
const t0 = Date.now();
await engine.syncNow({ full: true });
const manifest = (await engine.manifest())!;
const shop = manifest.shops.find((s) => s.isMain) ?? manifest.shops[0];
http.shopId = shop.id;
console.log(`Full download: ${await engine.products.count()} products in ${Date.now() - t0} ms, shop "${shop.name}"`);
check('manifest has counter rules', !!manifest.settings && typeof manifest.settings.allowNegativeStock === 'boolean');

// A product with stock in this branch.
const products = await engine.products.search({ shopId: shop.id, stock: 'in', limit: 20 });
const product = products.find((p) => !p.hasVariants && (p.stock ?? 0) >= 5 && p.price > 0);
if (!product) throw new Error('No product with stock to sell in the demo shop');
const stockBefore = product.stock!;
console.log(`Selling "${product.name}" (stock ${stockBefore}, Rs ${product.price})`);

/* ═════ 1. offline: customer -> khata bill -> payment -> online ═════ */
http.offline = true;
engine.setOnline(false);
const stamp = Date.now().toString().slice(-6);
const { customerId: tempCustomer } = await engine.enqueue.customerCreate({ name: `Offline Harness ${stamp}`, phone: `0300${stamp}1`.slice(0, 11) });
check('customer usable at once (temp id)', tempCustomer.startsWith('tmp_customer_'));
const found = await engine.customers.search({ query: `harness ${stamp}` });
check('offline customer search finds it', found.some((c) => c.id === tempCustomer));

const qty = 2;
const total = product.price * qty;
const bill = await engine.enqueue.sale({
  shopId: shop.id, customerId: tempCustomer, paymentMethod: 'CASH', paidAmount: total - 100,
  items: [{ productId: product.id, quantity: qty }],
});
check('bill in history as pending', bill.sale.pending && bill.sale.creditAmount === 100, { credit: bill.sale.creditAmount });
check('stock down at once', (await engine.products.stock(shop.id, product.id)) === stockBefore - qty);
check('khata up at once', (await engine.customers.get(tempCustomer))?.balance === 100);

await engine.enqueue.khataPayment({ customerId: tempCustomer, amount: 40, shopId: shop.id });
check('khata after payment (offline)', (await engine.customers.get(tempCustomer))?.balance === 60);
check('3 changes waiting', (await engine.outbox.list()).length === 3);

const salesBefore = Number(sql(`select count(*) from "Sale" where "tenantId" = '${user.tenantId}'`));
http.offline = false;
engine.setOnline(true);
await engine.syncNow();
const ops = await engine.outbox.list({ status: ['done'] });
const serverCustomerId = (await engine.sales.get(bill.saleId))?.customerId;
check('all 3 sent', ops.filter((o) => ['customer.create', 'sale.create', 'khata.payment'].includes(o.kind)).length === 3, ops.map((o) => `${o.kind}:${o.status}`));
check('temp customer id remapped', !!serverCustomerId && !serverCustomerId.startsWith('tmp_'), serverCustomerId);
const serverSale = (await engine.sales.get(bill.saleId))!;
check('bill has the server id and number', !serverSale.id.startsWith('tmp_') && !serverSale.pending && !serverSale.saleNumber.startsWith('OFF-'), serverSale.saleNumber);
check('exactly one new sale on the server', Number(sql(`select count(*) from "Sale" where "tenantId" = '${user.tenantId}'`)) === salesBefore + 1);
check('one customer on the server', Number(sql(`select count(*) from "Customer" where "tenantId" = '${user.tenantId}' and name = 'Offline Harness ${stamp}'`)) === 1);
const serverBalance = Number(sql(`select balance from "Customer" where id = '${serverCustomerId}'`));
const local = await engine.customers.get(serverCustomerId!);
check('balance matches server (60)', serverBalance === 60 && local?.balance === 60, { server: serverBalance, phone: local?.balance });
const serverStock = Number(sql(`select stock from "ShopStock" where "shopId" = '${shop.id}' and "productId" = '${product.id}' and "variantId" is null`));
check('stock matches server', (await engine.products.stock(shop.id, product.id)) === serverStock, { server: serverStock });
check('local effects settled', Number((await db.first<{ c: number }>('SELECT COUNT(*) AS c FROM effects'))?.c) === 0);
check('no POST was replayed in the normal run', !http.calls.some((c) => c.replayed));

/* ═════ 2. lost answer, then retry ═════ */
const before2 = Number(sql(`select count(*) from "Sale" where "tenantId" = '${user.tenantId}'`));
http.dropAnswers.push({ method: 'POST', path: '/sales', times: 1 });
const bill2 = await engine.enqueue.sale({ shopId: shop.id, paymentMethod: 'CASH', paidAmount: product.price, items: [{ productId: product.id, quantity: 1 }] });
await engine.upload(); // first send: the server makes the bill, the answer is lost
check('after the lost answer the bill still waits', (await engine.sales.get(bill2.saleId))?.pending === true);
check('server made it once', Number(sql(`select count(*) from "Sale" where "tenantId" = '${user.tenantId}'`)) === before2 + 1);
engine.setOnline(true);
await db.run('UPDATE outbox SET nextAttemptAt = 0'); // skip the backoff wait
await engine.upload(); // retry with the same Idempotency-Key
const replay = http.calls.filter((c) => c.method === 'POST' && c.path === '/sales').slice(-1)[0];
check('retry answered from the stored response', replay?.replayed === true && replay.status === 201, replay);
check('still exactly one new sale on the server', Number(sql(`select count(*) from "Sale" where "tenantId" = '${user.tenantId}'`)) === before2 + 1);
const s2 = await engine.sales.get(bill2.saleId);
check('phone has the server bill', !!s2 && !s2.pending && !s2.id.startsWith('tmp_'), s2?.saleNumber);
const localSales = Number((await db.first<{ c: number }>(`SELECT COUNT(*) AS c FROM sales WHERE data LIKE '%${s2?.id}%'`))?.c);
check('one copy of the bill on the phone', localSales === 1, localSales);

/* ═════ 3. conflict: product deleted on the server ═════ */
const created = (await http.raw<{ id: string }>({ method: 'POST', path: '/products', body: { name: `Harness Temp ${stamp}`, price: 50, stock: 10, shopId: shop.id } })).data;
await engine.syncNow();
check('new server product arrived on the phone', !!(await engine.products.get(created.id)));
http.offline = true;
engine.setOnline(false);
const bill3 = await engine.enqueue.sale({ shopId: shop.id, paymentMethod: 'CASH', paidAmount: 50, items: [{ productId: created.id, quantity: 1 }] });
// Meanwhile someone deletes the product on the computer.
http.offline = false;
await http.raw({ method: 'DELETE', path: `/products/${created.id}` });
engine.setOnline(true);
await engine.syncNow();
const issues = await engine.issues.list();
const issue = issues.find((i) => i.id === bill3.opId);
check('bill for the deleted product is in Sync issues', !!issue, issues.map((i) => ({ kind: i.kind, code: i.issue, msg: i.serverMessage })));
check('issue has plain words', !!issue?.explanation && !!issue.issue, { code: issue?.issue, explanation: issue?.explanation, server: issue?.serverMessage });
check('status says issues', engine.status.state === 'issues', engine.status.state);
await engine.issues.discard(bill3.opId);
check('discarded bill removed from history', !(await engine.sales.get(bill3.saleId)));
check('no issues left', (await engine.issues.list()).length === 0);

/* ═════ server idempotency directly ═════ */
const key = `harness-${uuid()}`;
const body = { shopId: shop.id, paymentMethod: 'CASH', paidAmount: product.price, items: [{ productId: product.id, quantity: 1 }] };
const before4 = Number(sql(`select count(*) from "Sale" where "tenantId" = '${user.tenantId}'`));
const a = await http.raw<{ id: string }>({ method: 'POST', path: '/sales', body, idempotencyKey: key });
const b = await http.raw<{ id: string }>({ method: 'POST', path: '/sales', body, idempotencyKey: key });
check('same key twice: one sale, same answer, replay header', a.data.id === b.data.id && b.replayed && !a.replayed
  && Number(sql(`select count(*) from "Sale" where "tenantId" = '${user.tenantId}'`)) === before4 + 1);
try {
  await http.raw({ method: 'POST', path: '/sales', body: { ...body, paidAmount: body.paidAmount + 1 }, idempotencyKey: key });
  check('same key, other body: 422', false);
} catch (e) {
  check('same key, other body: 422', e instanceof HttpError && e.status === 422, (e as HttpError).status);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

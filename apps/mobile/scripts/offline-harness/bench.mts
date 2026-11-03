/**
 * Lookup speed on 20,000 products (node:sqlite, same SQL as the app).
 *
 *   npx tsx scripts/offline-harness/bench.mts [count]
 *
 * Saves the products the way a download does (pages of 1000), then times
 * barcode scans, name searches in English, Roman Urdu (with spelling
 * variants) and Urdu script, and customer lookups by phone and name.
 */

import { saveCustomers, saveProducts } from '../../src/core/offline/engine/mirror.ts';
import { migrate } from '../../src/core/offline/engine/schema.ts';
import { findByCode, searchCustomers, searchProducts } from '../../src/core/offline/engine/lookups.ts';
import { nodeDb } from './adapters.mts';

const COUNT = Number(process.argv[2] ?? 20000);
const db = nodeDb(process.env.BENCH_FILE ?? ':memory:');
await migrate(db);

const roman = ['chawal', 'chaawal', 'daal', 'doodh', 'cheeni', 'aata', 'ghee', 'masala', 'namak', 'sabun', 'shampoo', 'biscuit', 'chai', 'basmati', 'gosht', 'anda', 'makhan', 'dahi'];
const urdu = ['چاول', 'دال', 'دودھ', 'چینی', 'آٹا', 'گھی', 'مصالحہ', 'نمک', 'صابن', 'چائے', 'بسکٹ', 'انڈے'];
const english = ['Rice', 'Lentils', 'Milk', 'Sugar', 'Flour', 'Cooking Oil', 'Spice Mix', 'Salt', 'Soap', 'Tea', 'Biscuits', 'Eggs', 'Juice', 'Noodles'];
const brands = ['Shan', 'National', 'Nestle', 'Tapal', 'Lipton', 'Olpers', 'Dalda', 'Habib', 'Peek Freans', 'Knorr', 'Lux', 'Surf'];
const sizes = ['250g', '500g', '1kg', '5kg', '1L', '1.5L', '12pc', 'Family', 'Large', 'Small'];
const pick = <T,>(a: T[], i: number) => a[i % a.length];

const now = new Date().toISOString();
const t0 = performance.now();
for (let page = 0; page < COUNT; page += 1000) {
  const rows = [];
  for (let i = page; i < Math.min(page + 1000, COUNT); i++) {
    const lang = i % 3;
    const k = Math.floor(i / 3);
    const base = lang === 0 ? pick(english, k) : lang === 1 ? pick(roman, k) : pick(urdu, k);
    const hasVariants = i % 25 === 0;
    rows.push({
      id: `p-${i.toString().padStart(6, '0')}`, name: `${pick(brands, Math.floor(i / 7))} ${base} ${pick(sizes, Math.floor(i / 5))} ${i}`, sku: `SKU${i}`,
      barcode: `89${(1000000000 + i * 7919).toString().slice(0, 11)}`, unit: 'pcs', productType: null, price: 50 + (i % 900), costPrice: 40,
      wholesalePrice: null, creditPrice: null, taxRate: 0, lowStockAlert: 5, hasVariants, isRawMaterial: false, expiryTracked: false,
      isActive: true, isFeatured: i % 50 === 0, categoryId: `c${i % 30}`, categoryName: `Category ${i % 30}`, categoryColor: '#0a0',
      brandId: `b${i % 12}`, brandName: pick(brands, Math.floor(i / 7)), imageUrl: null, updatedAt: now,
      variants: hasVariants ? [{ id: `v-${i}-a`, name: 'Red', sku: `SKU${i}R`, barcode: `77${i}01`, color: 'Red', size: null, unit: null, price: 100, wholesalePrice: null, creditPrice: null, lowStockAlert: null, imageUrl: null }] : [],
      units: i % 10 === 0 ? [{ id: `u-${i}`, variantId: null, unitName: 'carton', unitLabel: 'Carton (12)', conversionRate: 12, isBase: false, isDefault: false, price: 1100, wholesalePrice: null, creditPrice: null, mrpPrice: null, barcode: `55${i}12`, sku: null }] : [],
    });
  }
  await saveProducts(db, rows as never, 1);
}
const saveMs = performance.now() - t0;
await db.run("INSERT INTO stock (shopId, productId, variantId, qty, reserved) SELECT 's1', id, '', 20, 0 FROM products");

const customers = Array.from({ length: 5000 }, (_, i) => ({
  id: `c-${i}`, name: `${pick(['Ahmed', 'Bilal', 'Fatima', 'Ayesha', 'Usman', 'Zainab', 'Hamza', 'Sana'], i)} ${pick(['Khan', 'Malik', 'Butt', 'Sheikh', 'Qureshi'], i * 3)} ${i}`,
  businessName: null, phone: `0300${(1000000 + i).toString()}`, email: null, cnic: null, address: null, city: 'Lahore', area: null, shopId: null,
  priceTier: null, priceListId: null, creditLimit: 0, creditDays: null, balance: i % 4 === 0 ? 500 : 0, loyaltyPoints: 0, totalSpent: 0,
  isVip: false, isActive: true, oldestDueAt: null, updatedAt: now,
}));
await saveCustomers(db, customers as never, 1);

async function time(label: string, fn: () => Promise<unknown>, runs = 30) {
  await fn();
  const times: number[] = [];
  let result: unknown;
  for (let i = 0; i < runs; i++) {
    const s = performance.now();
    result = await fn();
    times.push(performance.now() - s);
  }
  times.sort((a, b) => a - b);
  const n = Array.isArray(result) ? result.length : result ? 1 : 0;
  console.log(`${label.padEnd(44)} median ${times[Math.floor(runs / 2)].toFixed(2).padStart(6)} ms   p95 ${times[Math.floor(runs * 0.95)].toFixed(2).padStart(6)} ms   hits ${n}`);
}

console.log(`Saved ${COUNT} products in ${saveMs.toFixed(0)} ms (${(COUNT / (saveMs / 1000)).toFixed(0)}/s)\n`);
await time('barcode scan (product)', () => findByCode(db, `89${(1000000000 + 12345 * 7919).toString().slice(0, 11)}`, 's1'));
await time('barcode scan (pack)', () => findByCode(db, '55120012', 's1'));
await time('barcode scan (miss)', () => findByCode(db, '0000000000000', 's1'));
await time('search "rice" (English)', () => searchProducts(db, { query: 'rice', shopId: 's1', limit: 50 }));
await time('search "chawal" (Roman)', () => searchProducts(db, { query: 'chawal', shopId: 's1', limit: 50 }));
await time('search "chaawal" (Roman variant)', () => searchProducts(db, { query: 'chaawal', shopId: 's1', limit: 50 }));
await time('search "dudh" (Roman variant of doodh)', () => searchProducts(db, { query: 'dudh', shopId: 's1', limit: 50 }));
await time('search "doodh 1l" (two words)', () => searchProducts(db, { query: 'doodh 1l', shopId: 's1', limit: 50 }));
await time('search "چاول" (Urdu script)', () => searchProducts(db, { query: 'چاول', shopId: 's1', limit: 50 }));
await time('search "shan masala" (brand + word)', () => searchProducts(db, { query: 'shan masala', shopId: 's1', limit: 50 }));
await time('search "x" (one letter)', () => searchProducts(db, { query: 'x', shopId: 's1', limit: 50 }));
await time('browse category, low stock filter', () => searchProducts(db, { categoryId: 'c7', shopId: 's1', stock: 'in', limit: 50 }));
await time('customer by phone "03001004"', () => searchCustomers(db, { query: '03001004' }));
await time('customer by name "ayesha malik"', () => searchCustomers(db, { query: 'ayesha malik' }));
await time('khata list (owing)', () => searchCustomers(db, { owing: true, limit: 50 }));

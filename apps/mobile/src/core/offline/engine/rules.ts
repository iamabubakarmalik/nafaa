/**
 * Counter rules checked on the phone, the same ones the server checks
 * (sales.service enforceCounterRules and stock claims), so an offline bill
 * is refused at the counter instead of failing at sync.
 *
 * A rule that needs the owner's or manager's PIN cannot be checked offline
 * (the PIN is only on the server), so such a bill needs internet.
 */

import { stockOf, tierPrice } from './lookups';
import type { Manifest } from './mirror';
import type { Ctx } from './queue';
import { isTempId } from './queue';
import type { PriceTier, Translate } from './types';

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'JAZZCASH' | 'EASYPAISA' | 'TRADE_IN';

export interface SaleItemInput {
  productId?: string;
  variantId?: string;
  usedPhoneId?: string;
  imeiId?: string;
  serialId?: string;
  batchId?: string;
  /** In the product's base unit (a carton of 12 sold as 12). */
  quantity: number;
  /** Price of one base unit; empty means the tier price. */
  priceOverride?: number;
  lineDiscount?: number;
  priceTier?: PriceTier;
  useWholesale?: boolean;
  note?: string;
  internalNote?: string;
  unitName?: string;
  unitQty?: number;
  conversionRate?: number;
  schemeId?: string;
  /** Shown on the offline receipt and in history until the server's bill arrives. */
  name?: string;
  variantName?: string;
}

export interface SaleInput {
  shopId: string;
  customerId?: string | null;
  soldById?: string;
  paymentMethod: PaymentMethod;
  /** Money tendered (before change). */
  paidAmount: number;
  payments?: Array<{ method: PaymentMethod; amount: number; reference?: string; note?: string }>;
  discount?: number;
  discountCode?: string;
  loyaltyPointsToUse?: number;
  /** Rupee value of the code and points at the counter (kept for the offline total and the fallback). */
  codeDiscount?: number;
  loyaltyDiscount?: number;
  note?: string;
  receivedByName?: string;
  receivedByPhone?: string;
  receivedByCnic?: string;
  serviceCharges?: Array<{ type: string; label: string; amount: number; cost?: number; passThrough?: boolean; note?: string }>;
  items: SaleItemInput[];
  managerPin?: string;
}

export type RuleCode =
  | 'empty'
  | 'customer_required'
  | 'customer_for_credit'
  | 'discount_off'
  | 'credit_off'
  | 'stock'
  | 'pin_needed'
  | 'online_needed'
  | 'busy'
  | 'not_synced'
  | 'not_found';

/** A rule stopped the action. `message` is ready to show. */
export class OfflineRuleError extends Error {
  constructor(public code: RuleCode, message: string, public details?: unknown) {
    super(message);
    this.name = 'OfflineRuleError';
  }
}

export interface SaleTotals {
  lines: Array<{ unitPrice: number; quantity: number; lineDiscount: number; lineTotal: number; listPrice: number }>;
  subtotal: number;
  lineDiscounts: number;
  discount: number;
  serviceCharges: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  creditAmount: number;
}

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

/** Totals worked out the way the server does (typed price, else tier price; less discounts; plus kept charges). */
export async function saleTotals(ctx: Ctx, input: SaleInput): Promise<SaleTotals> {
  const lines: SaleTotals['lines'] = [];
  for (const it of input.items) {
    let list = 0;
    if (it.productId) {
      const p = await ctx.db.first<{ price: number; wholesalePrice: number | null; creditPrice: number | null }>(
        'SELECT price, wholesalePrice, creditPrice FROM products WHERE id = ?', [it.productId]);
      const v = it.variantId
        ? await ctx.db.first<{ price: number; wholesalePrice: number | null; creditPrice: number | null }>(
          'SELECT price, wholesalePrice, creditPrice FROM variants WHERE id = ?', [it.variantId])
        : null;
      const tier = it.priceTier ?? (it.useWholesale ? 'WHOLESALE' : null);
      const src = v ?? p;
      list = src ? tierPrice(src, tier) : 0;
    }
    const unitPrice = Number(it.priceOverride ?? list) || 0;
    const quantity = Number(it.quantity) || 0;
    const lineDiscount = Math.max(Number(it.lineDiscount) || 0, 0);
    lines.push({ unitPrice, quantity, lineDiscount, lineTotal: r2(Math.max(unitPrice * quantity - lineDiscount, 0)), listPrice: list });
  }
  const subtotal = r2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const lineDiscounts = r2(lines.reduce((s, l) => s + l.lineDiscount, 0));
  const discount = r2((input.discount || 0) + (input.codeDiscount || 0) + (input.loyaltyDiscount || 0));
  const serviceCharges = r2((input.serviceCharges ?? []).filter((c) => !c.passThrough).reduce((s, c) => s + (Number(c.amount) || 0), 0));
  const total = r2(Math.max(subtotal - lineDiscounts - discount + serviceCharges, 0));
  const paidAmount = r2(Number(input.paidAmount) || 0);
  return {
    lines, subtotal, lineDiscounts, discount, serviceCharges, total, paidAmount,
    changeAmount: r2(Math.max(paidAmount - total, 0)),
    creditAmount: r2(Math.max(total - paidAmount, 0)),
  };
}

export interface SaleCheck {
  totals: SaleTotals;
  /** Hard stops (show the message; the bill cannot go). */
  problems: Array<{ code: RuleCode; message: string; productId?: string }>;
  /** Reasons that need the owner's or manager's PIN (online only). */
  needsPin: string[];
}

const can = (perms: string[] | undefined, role: string | undefined, key: string) =>
  role === 'OWNER' || role === 'SUPER_ADMIN' || !!perms?.includes(key);

/**
 * Checks a bill against the shop's counter rules and the stock on this
 * phone. Run before enqueueSale (enqueueSale runs it too).
 */
export async function checkSale(ctx: Ctx, manifest: Manifest | null, input: SaleInput, opts: { allowOversell?: boolean } = {}): Promise<SaleCheck> {
  const t = ctx.t;
  const s = manifest?.settings ?? {};
  const session = ctx.session();
  const totals = await saleTotals(ctx, input);
  const problems: SaleCheck['problems'] = [];
  const needsPin: string[] = [];

  if (!input.items.length) problems.push({ code: 'empty', message: t('Add at least one item to the bill.') });
  if (s.requireCustomerForSale && !input.customerId) problems.push({ code: 'customer_required', message: t('Choose a customer for every bill (shop setting).') });

  const manual = r2((input.discount || 0) + totals.lineDiscounts);
  const priceCut = r2(totals.lines.reduce((sum, l) => sum + Math.max(l.listPrice - l.unitPrice, 0) * l.quantity, 0));
  if (manual > 0 && s.allowDiscount === false) problems.push({ code: 'discount_off', message: t('Discounts are turned off in this shop (Settings).') });
  const given = manual + priceCut;
  if (given > 0.005) {
    const trusted = can(session?.permissions, session?.role, 'pos.discount_override');
    const base = totals.subtotal + priceCut;
    const percent = base > 0 ? (given / base) * 100 : 100;
    const max = Number(s.maxDiscountPercent ?? 100);
    if (!trusted && percent > max + 0.01) needsPin.push(t('Discount over {{max}}%', { max }));
    else if (!trusted && s.requirePinForDiscount) needsPin.push(t('Discount'));
  }

  if (totals.creditAmount > 0.005) {
    if (!input.customerId) {
      problems.push({ code: 'customer_for_credit', message: t('Choose a customer to put the rest on khata.') });
    } else {
      const c = await ctx.db.first<{ balance: number | null; creditLimit: number | null; d: number }>(
        `SELECT balance, creditLimit, COALESCE((SELECT SUM(delta) FROM effects WHERE kind = 'balance' AND k1 = customers.id), 0) AS d
         FROM customers WHERE id = ?`, [input.customerId]);
      const balance = (c?.balance ?? 0) + (c?.d ?? 0);
      const held = Math.max(-balance, 0);
      if (s.allowCredit === false && totals.creditAmount > held + 0.01) {
        problems.push({ code: 'credit_off', message: t('Khata (credit) is turned off in this shop (Settings).') });
      }
      const limit = Number(c?.creditLimit ?? 0);
      if (limit > 0 && balance + totals.creditAmount > limit + 0.01) needsPin.push(t('Khata over the credit limit (Rs {{limit}})', { limit }));
    }
  }

  // Stock in this branch, pending bills already taken off.
  if (!s.allowNegativeStock && !opts.allowOversell) {
    const want = new Map<string, { productId: string; variantId: string | null; qty: number }>();
    for (const it of input.items) {
      if (!it.productId || it.usedPhoneId) continue;
      // Carpet cut from a roll or a piece: the roll / piece stock is checked on the server.
      if (it.note && (it.note.startsWith('Cut from ') || it.note.startsWith('Cut piece '))) continue;
      const key = `${it.productId}|${it.variantId ?? ''}`;
      const cur = want.get(key) ?? { productId: it.productId, variantId: it.variantId ?? null, qty: 0 };
      cur.qty += Number(it.quantity) || 0;
      want.set(key, cur);
    }
    for (const w of want.values()) {
      if (isTempId(w.productId)) continue;
      const have = await stockOf(ctx.db, input.shopId, w.productId, w.variantId);
      // No stock row at all: the item is not stocked in this branch (services, made on sale); the server decides.
      if (have === null) continue;
      if (have + 1e-9 < w.qty) {
        const p = await ctx.db.first<{ name: string; unit: string }>('SELECT name, unit FROM products WHERE id = ?', [w.productId]);
        problems.push({
          code: 'stock',
          productId: w.productId,
          message: t('Only {{have}} {{unit}} of {{name}} left.', { have: Math.max(0, Math.round(have * 1000) / 1000), unit: p?.unit ?? '', name: p?.name ?? '' }),
        });
      }
    }
  }
  return { totals, problems, needsPin };
}

/* ───────────── what needs the server ───────────── */

/**
 * Features that only work with internet. Screens call requiresOnline() and,
 * when offline, show a friendly "internet needed" state with the last
 * cached data.
 */
export const ONLINE_ONLY = {
  onlineOrders: 'Online orders, packing and returns from couriers',
  courier: 'Booking a courier',
  ai: 'Nafaa AI',
  paymentGateway: 'Taking a card or wallet payment through Nafaa (QR, payment link)',
  reports: 'Reports that add up every phone and computer (day report, profit, stock value)',
  team: 'Team, roles and permissions',
  settings: 'Changing shop settings',
  managerPin: 'Anything that needs the owner\'s or manager\'s PIN',
  voidWithPin: 'Cancelling a bill when the shop asks for a PIN',
  refundWithPin: 'Returns when the shop asks for a PIN (default)',
  transfers: 'Stock transfers between branches',
  billing: 'Plan and billing',
  integrations: 'Online store, marketplace and channel links',
  messaging: 'SMS and WhatsApp messages',
  backup: 'Backup and restore',
  ledgerHistory: 'Full khata history older than what the phone keeps',
  imageUpload: 'Uploading photos',
  restaurantOrders: 'Table orders, kitchen tickets and bills shared with other phones',
  kitchenDisplay: 'The kitchen screen (it shows orders from every phone and computer)',
  bakeryOrders: 'Cake and bulk orders (bookings)',
  production: 'Baking plans and raw material stock',
  garmentsDesk: 'Stitching orders, alterations, holds, instalment plans, exchanges and collections',
  shoeDesk: 'Size requests, size charts and exchanges',
  petshopAnimals: 'Live animals, grooming visits and groomers',
  floristOrders: 'Flower orders, wedding contracts and subscriptions',
  bookstoreDesk: 'Schools, school lists, book rentals and publishers',
  jewelryDesk: 'Gold rates, metal stock, karigars, custom orders, repairs and old gold',
  sportsDesk: 'Team orders and repair jobs',
  opticalDesk: 'Eye tests, prescriptions, glasses and repair orders, and optometrists',
  toystoreDesk: 'Birthday reminders, gift packs and the safety review',
  pharmacyDesk: 'Prescriptions, doctors, salts, expiry actions, the narcotic register and cold chain log',
  cosmeticsDesk: 'Tester stock and the expiry list',
  agriDesk: 'Farmers, bulk orders, crop advice, seasonal plans and subsidy claims',
  dairyDesk: 'Milk routes, farmer supplies, production, quality tests, deliveries and monthly bills',
  appliancesDesk: 'Installations, repairs, deliveries, technicians, AMC contracts, serial register, warranty claims and old appliances',
  hardwareDesk: 'Quotations, projects, deliveries, credit accounts and reorder rules',
  mobileDesk: 'IMEI stock, used phones, repair jobs, instalment plans and mobile reports',
  electronicsDesk: 'Serial register, warranty claims and bundles',
  carpetDesk: 'Carpet rolls, cut pieces and cutting a bill from stock',
  furnitureDesk: 'Custom orders, deliveries and carpenters',
  autopartsDesk: 'Workshop jobs, vehicles, mechanics, service reminders and core returns',
  meatDesk: 'Weight orders, cutting jobs, live animals, slaughter log, subscriptions, qurbani and wholesale',
  salonDesk: 'Appointments, stylists, services, memberships, packages, gift vouchers and salon bills',
  clinicDesk: 'Patients, appointments, queue, visits, prescriptions, lab orders, panels and fees',
  gymDesk: 'Members, plans, renewals, check-ins, trainers, classes, lockers and equipment',
  hotelDesk: 'Rooms, bookings, check-in and check-out, folios, housekeeping and guests',
  gamingDesk: 'Stations, timed sessions, rentals, tournaments and top-ups',
  servicesDesk: 'Jobs, quotations, technicians, dispatch, AMC contracts, warranty and invoices',
} as const;

export type OnlineFeature = keyof typeof ONLINE_ONLY;

export function requiresOnline(feature: OnlineFeature | string): boolean {
  return feature in ONLINE_ONLY;
}

export function onlineReason(feature: OnlineFeature, t: Translate): string {
  return t(ONLINE_ONLY[feature]);
}

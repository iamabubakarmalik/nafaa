/**
 * How the price list is shown: add-on icons, sections, price text, the state
 * of each add-on for this shop, plan totals and feature labels. Prices and
 * texts come from GET /plans/catalog; the seeded names and descriptions are
 * listed here with msg() so they are translated (an admin edit shows as typed).
 */

import {
  BadgeCheck, Bot, Boxes, Brain, Building2, Calculator, Code2, Gift, GraduationCap, Landmark, Layers, Lock, Megaphone,
  Package, Palette, Receipt, Rocket, ShoppingBag, Store, Tag, Truck, UserPlus, Users, Wallet, Wrench, type LucideIcon,
} from 'lucide-react';
import type { BrandName } from '@/assets/brands/BrandLogo';
import { formatPKR } from '@core/lib/format';
import { msg, t } from '@core/i18n';
import type { BillingInterval } from '@modules/billing/subscriptions/api/subscriptions.api';
import type {
  BillingOverview, CatalogAddOn, CatalogPlan, Entitlements, LimitKey, PricingCatalog, ShopAddOn,
} from '../api/pricing.api';

export const UNLIMITED = 999_999;

/** "Rs 1,500" without paisa. */
export const rs = (n: number) => formatPKR(n, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const fmtDate = (v: string | null | undefined) =>
  v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—';

export const daysLeft = (v: string | null | undefined) =>
  v ? Math.max(0, Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000)) : 0;

// ─── Sections of the add-on store ───────────────────────────────

export type SectionId = 'online' | 'operations' | 'capacity' | 'services';

export const SECTIONS: Array<{ id: SectionId; title: string; desc: string; icon: LucideIcon; color: string }> = [
  { id: 'online', title: msg('Online selling'), desc: msg('Website, Shopify, Daraz, courier aur social media'), icon: ShoppingBag, color: '#0ea5e9' },
  { id: 'operations', title: msg('Operations'), desc: msg('Wholesale, tax aur hisaab-kitaab'), icon: Truck, color: '#ea580c' },
  { id: 'capacity', title: msg('Capacity'), desc: msg('Zyada dukaanen, zyada staff, zyada Nafaa AI'), icon: Layers, color: '#7c3aed' },
  { id: 'services', title: msg('Setup & training'), desc: msg('Hamari team aap ki dukaan Nafaa par set karti hai — ek dafa ka kharcha'), icon: GraduationCap, color: '#16a34a' },
];

export function sectionOf(category: string): SectionId {
  if (category === 'integrations' || category === 'sales') return 'online';
  if (category === 'capacity') return 'capacity';
  if (category === 'services') return 'services';
  return 'operations';
}

// ─── Add-on looks ───────────────────────────────────────────────

interface AddOnLook { icon: LucideIcon; color: string; brand?: BrandName }

const LOOKS: Record<string, AddOnLook> = {
  shopify: { icon: ShoppingBag, color: '#5e8e3e', brand: 'shopify' },
  woocommerce: { icon: ShoppingBag, color: '#7f54b3', brand: 'woocommerce' },
  daraz: { icon: ShoppingBag, color: '#f57224', brand: 'daraz' },
  website: { icon: Code2, color: '#0284c7', brand: 'website' },
  foodpanda: { icon: Store, color: '#d70f64', brand: 'foodpanda' },
  courier: { icon: Truck, color: '#ea580c' },
  online_seller_bundle: { icon: Gift, color: '#db2777' },
  online_store: { icon: Store, color: '#0ea5e9' },
  meta: { icon: Megaphone, color: '#1877f2', brand: 'meta' },
  distribution: { icon: Truck, color: '#ea580c' },
  booker: { icon: UserPlus, color: '#f97316' },
  fbr: { icon: Landmark, color: '#475569' },
  accounting: { icon: Calculator, color: '#0d9488' },
  extra_shop: { icon: Building2, color: '#0891b2' },
  extra_user: { icon: Users, color: '#2563eb' },
  ai_plus: { icon: Bot, color: '#7c3aed' },
  setup: { icon: GraduationCap, color: '#16a34a' },
  full_activation: { icon: Wrench, color: '#0d9488' },
};

// ─── One-time services (setup and training) ─────────────────────

export const SETUP_KEY = 'setup';
export const FULL_ACTIVATION_KEY = 'full_activation';

/** What each service package includes, for the comparison cards. */
export const SERVICE_DETAILS: Record<string, { how: string; includes: string[] }> = {
  [SETUP_KEY]: {
    how: msg('Online call par'),
    includes: [msg('500 tak products hum daalte hain'), msg('Settings, bill aur printer ki setting'), msg('Staff ki training (online)')],
  },
  [FULL_ACTIVATION_KEY]: {
    how: msg('Team aap ki dukaan par aati hai'),
    includes: [msg('Saare products aur purana data'), msg('Printer, scanner aur galla setup'), msg('Staff ki training dukaan par'), msg('1 mahina pehle support')],
  },
};

export const isService = (a: Pick<CatalogAddOn, 'kind'>) => a.kind === 'ONE_TIME';

/** Price of a one-time service, with the yearly-plan offer applied. */
export function servicePrice(a: CatalogAddOn, interval: BillingInterval | null | undefined, catalog: PricingCatalog | undefined) {
  const offer = !!catalog?.offers?.yearlyFreeSetup && interval === 'YEARLY';
  const setup = catalog?.addOns.find((x) => x.key === (catalog.offers?.setupKey ?? SETUP_KEY));
  if (!offer || !setup) return { amount: a.priceMonthly, note: null as string | null };
  if (a.key === setup.key) return { amount: 0, note: t('Saal ke plan ke saath muft') };
  if (a.key === (catalog?.offers?.fullActivationKey ?? FULL_ACTIVATION_KEY)) {
    return { amount: Math.max(0, a.priceMonthly - setup.priceMonthly), note: t('Saal ke plan par {{amount}} kam', { amount: rs(setup.priceMonthly) }) };
  }
  return { amount: a.priceMonthly, note: null };
}

export const lookOf = (key: string): AddOnLook => LOOKS[key] ?? { icon: Package, color: '#64748b' };

/** Seeded catalog texts, marked for translation. */
export const CATALOG_TEXTS = [
  msg('Shopify store ke orders aur stock Nafaa se jude rahein.'),
  msg('WordPress/WooCommerce website ke orders aur stock.'),
  msg('Daraz ke orders aur stock ek jagah.'),
  msg('Apni website / API'),
  msg('Apni banayi website ko Nafaa se jodein.'),
  msg('Foodpanda ke orders seedha kitchen aur POS me.'),
  msg('Courier pack'),
  msg('TCS, Leopards aur CallCourier booking aur tracking.'),
  msg('Shopify + WooCommerce + Daraz + Courier ek saath, 1,000 ki bachat.'),
  msg('Nafaa Online Store'),
  msg('WhatsApp/Instagram orders, order desk aur payment links.'),
  msg('Facebook aur Instagram'),
  msg('Catalog, ads aur sales ki tracking.'),
  msg('Distribution / Wholesale'),
  msg('Routes, booker app, load sheets aur recoveries. Har booker ka alag.'),
  msg('Booker login'),
  msg('Distribution ke liye har booker ka login.'),
  msg('FBR / tax'),
  msg('FBR aur provincial tax ko bill khud jayein.'),
  msg('Accounting sync'),
  msg('Bikri accounting software me khud jaye.'),
  msg('Extra dukaan / branch'),
  msg('Plan se zyada dukaan.'),
  msg('Extra user'),
  msg('Plan se zyada staff login.'),
  msg('Nafaa AI se zyada sawal aur reports.'),
  msg('Setup aur training'),
  msg('Assisted setup'),
  msg('Full activation'),
  msg('Hamari team products daalti hai aur staff ko sikhati hai. Ek dafa.'),
  msg('Choti dukaan ke liye hamesha muft: 1 dukaan, 1 user, 300 bill mahana.'),
];

const UNIT_LABELS: Record<string, string> = { booker: msg('booker'), shop: msg('dukaan'), user: msg('user') };
export const unitText = (unit: string | null) => (unit ? t(UNIT_LABELS[unit] ?? unit) : t('unit'));

/** "Rs 1,000/mahina", "Rs 500 har booker/mahina" or "Rs 5,000 ek dafa". */
export function addOnPriceText(a: Pick<CatalogAddOn, 'kind' | 'priceMonthly' | 'unitLabel'>): string {
  if (a.kind === 'ONE_TIME') return t('{{price}} ek dafa', { price: rs(a.priceMonthly) });
  if (a.kind === 'PER_UNIT') return t('{{price}} har {{unit}}/mahina', { price: rs(a.priceMonthly), unit: unitText(a.unitLabel) });
  return t('{{price}}/mahina', { price: rs(a.priceMonthly) });
}

// ─── State of one add-on for this shop ──────────────────────────

export type AddOnStateId = 'soon' | 'on' | 'trial' | 'due' | 'lapsed' | 'ending' | 'bundled' | 'included' | 'paused' | 'service' | 'off';

export interface AddOnState {
  id: AddOnStateId;
  label: string;
  tone: 'success' | 'info' | 'warning' | 'danger' | 'default';
  /** Date shown with the label (free until, pay by, ends on). */
  date?: string | null;
  quantity: number;
  /** The shop has it now (menu shows it, it can be turned off). */
  active: boolean;
}

type AnyRow = Pick<ShopAddOn, 'key' | 'status' | 'free'> & Partial<ShopAddOn>;

export function addOnState(a: CatalogAddOn, ent: Entitlements | undefined, overview: BillingOverview | undefined, catalog: CatalogAddOn[]): AddOnState {
  if (a.comingSoon) return { id: 'soon', label: t('Jald aa raha hai'), tone: 'default', quantity: 0, active: false };
  const rows: AnyRow[] = (overview?.addOns ?? ent?.addOns ?? []).filter((r) => r.status !== 'CANCELLED');
  const row = rows.find((r) => r.key === a.key);
  const qty = row?.quantity ?? 1;
  // One-time services: bought (paid) → the team gets in touch; bill open → pay it.
  if (isService(a)) {
    if (row) return { id: 'service', label: t('Team rabta karegi'), tone: 'success', quantity: 1, active: true };
    const bill = overview?.openInvoices.find((i) => i.description === a.name || i.items?.some((it) => it.description.startsWith(a.name)));
    if (bill) return { id: 'due', label: t('Payment baqi'), tone: 'warning', date: bill.dueDate, quantity: 1, active: false };
    return { id: 'off', label: '', tone: 'default', quantity: 0, active: false };
  }
  if (row) {
    if (row.status === 'PENDING_PAYMENT') {
      return row.free
        ? { id: 'due', label: t('Payment baqi'), tone: 'warning', date: row.paymentDueAt, quantity: qty, active: true }
        : { id: 'lapsed', label: t('Band — payment karein'), tone: 'danger', quantity: qty, active: false };
    }
    if (row.status === 'PAST_DUE') return { id: 'lapsed', label: t('Band — payment karein'), tone: 'danger', quantity: qty, active: false };
    if (row.freeUntil && new Date(row.freeUntil) > new Date()) {
      return { id: 'trial', label: ent?.state === 'trial' ? t('Trial me free') : t('Free'), tone: 'info', date: row.freeUntil, quantity: qty, active: true };
    }
    if (row.free && !row.currentPeriodEnd && overview) return { id: 'on', label: t('Chalu'), tone: 'success', quantity: qty, active: true };
    if (!overview && row.free) return { id: ent?.state === 'trial' ? 'trial' : 'on', label: ent?.state === 'trial' ? t('Trial me free') : t('Chalu'), tone: ent?.state === 'trial' ? 'info' : 'success', date: ent?.state === 'trial' ? ent.trialEndsAt : null, quantity: qty, active: true };
    if (row.cancelAtPeriodEnd) return { id: 'ending', label: t('Band hoga'), tone: 'warning', date: row.currentPeriodEnd, quantity: qty, active: true };
    return { id: 'on', label: t('Chalu'), tone: 'success', date: null, quantity: qty, active: true };
  }
  const bundle = rows.find((r) => catalog.find((c) => c.key === r.key)?.bundleKeys.includes(a.key));
  if (bundle) return { id: 'bundled', label: t('Bundle me shamil'), tone: 'success', quantity: 1, active: true };
  const features = ent?.features ?? [];
  const hasFeatures = a.grantsFeatures.length > 0 && a.grantsFeatures.every((f) => features.includes(f));
  if (ent && (ent.state === 'active' || ent.state === 'free' || ent.state === 'grace') && !ent.grandfatheredUntil && hasFeatures) {
    return { id: 'included', label: t('Plan me shamil'), tone: 'success', quantity: 1, active: true };
  }
  if (ent?.apps.includes(a.key)) {
    return hasFeatures
      ? { id: 'on', label: ent.grandfatheredUntil ? t('Free') : t('Chalu'), tone: ent.grandfatheredUntil ? 'info' : 'success', date: ent.grandfatheredUntil, quantity: 1, active: true }
      : { id: 'paused', label: t('Ruka hua'), tone: 'warning', quantity: 1, active: false };
  }
  return { id: 'off', label: '', tone: 'default', quantity: 0, active: false };
}

// ─── Plan prices and totals (same rules as the server's checkout) ──

export const INTERVAL_MONTHS: Record<BillingInterval, number> = { MONTHLY: 1, QUARTERLY: 3, YEARLY: 12 };

export const planPrice = (p: CatalogPlan, i: BillingInterval) =>
  i === 'YEARLY' ? p.priceYearly : i === 'QUARTERLY' ? p.priceQuarterly : p.priceMonthly;

/** Saving against paying month by month. */
export function planSaving(p: CatalogPlan, i: BillingInterval) {
  const full = p.priceMonthly * INTERVAL_MONTHS[i];
  const amount = full - planPrice(p, i);
  return amount > 0 && full > 0 ? { amount, percent: Math.round((amount / full) * 100) } : null;
}

const money = (n: number) => Math.max(0, Math.round(n / 10) * 10);

export function addOnAllowedOn(a: CatalogAddOn, plan: CatalogPlan | null | undefined) {
  if (!plan || plan.isFree) return false;
  return !a.availableOnPlans.length || a.availableOnPlans.includes(plan.slug);
}

export interface CheckoutLine { key: string; label: string; amount: number; quantity: number }

/** Bill lines for a plan period with its add-ons (bundled add-ons are dropped). */
export function checkoutTotal(plan: CatalogPlan, interval: BillingInterval, picks: Record<string, number>, addOns: CatalogAddOn[], catalog?: PricingCatalog) {
  const months = INTERVAL_MONTHS[interval];
  const full = plan.priceMonthly * months;
  const factor = full > 0 && planPrice(plan, interval) > 0 ? planPrice(plan, interval) / full : 1;
  const chosen = addOns.filter((a) => (picks[a.key] ?? 0) > 0 && addOnAllowedOn(a, plan) && !a.comingSoon);
  const inBundles = new Set(chosen.flatMap((a) => a.bundleKeys));
  const lines: CheckoutLine[] = [{ key: 'plan', label: t('{{plan}} plan', { plan: plan.name }), amount: planPrice(plan, interval), quantity: 1 }];
  for (const a of chosen) {
    if (inBundles.has(a.key)) continue;
    const qty = a.kind === 'PER_UNIT' ? picks[a.key] : 1;
    const amount = a.kind === 'ONE_TIME' ? money(servicePrice(a, interval, catalog).amount) : money(a.priceMonthly * months * factor) * qty;
    lines.push({ key: a.key, label: a.kind === 'PER_UNIT' ? `${t(a.name)} × ${qty}` : t(a.name), amount, quantity: qty });
  }
  // A yearly plan brings Assisted setup free (the server adds it to the bill).
  const setup = catalog?.offers?.yearlyFreeSetup && interval === 'YEARLY' ? catalog.addOns.find((a) => a.key === (catalog.offers?.setupKey ?? SETUP_KEY) && !a.comingSoon) : null;
  if (setup && !lines.some((l) => l.key === setup.key)) {
    lines.push({ key: setup.key, label: `${t(setup.name)} · ${t('muft')}`, amount: 0, quantity: 1 });
  }
  return { lines, total: lines.reduce((n, l) => n + l.amount, 0), dropped: chosen.filter((a) => inBundles.has(a.key)).map((a) => a.key) };
}

// ─── Limits and features ────────────────────────────────────────

export const LIMITS: Array<{ key: LimitKey; label: string; icon: LucideIcon; color: string }> = [
  { key: 'products', label: msg('Products'), icon: Package, color: '#7c3aed' },
  { key: 'salesPerMonth', label: msg('Is mahine ke bill'), icon: Receipt, color: '#16a34a' },
  { key: 'users', label: msg('Users'), icon: Users, color: '#2563eb' },
  { key: 'shops', label: msg('Dukaanen'), icon: Building2, color: '#0891b2' },
  { key: 'bookers', label: msg('Booker login'), icon: UserPlus, color: '#ea580c' },
];

export const limitText = (n: number | undefined) => (n == null ? '—' : n >= UNLIMITED ? t('Unlimited') : n.toLocaleString('en-PK'));

/** Short, simple names for features in the plan comparison and the upgrade dialog. */
const FEATURE_LABELS: Record<string, string> = {
  pos: msg('POS counter'),
  khata: msg('Udhaar (khata)'),
  inventory: msg('Products aur stock'),
  returns: msg('Returns'),
  barcode: msg('Barcode aur labels'),
  cash_register: msg('Galla aur din ka band'),
  reports: msg('Day report aur reports'),
  offline: msg('Internet ke bagair bikri'),
  profit_report: msg('Profit report'),
  expenses: msg('Expenses aur doosri aamdani'),
  whatsapp_receipt: msg('WhatsApp par bill'),
  backup: msg('Backup aur restore'),
  ai: msg('Nafaa AI'),
  loyalty: msg('Loyalty points'),
  discount_rules: msg('Discount rules aur coupons'),
  promotions: msg('Promotions aur campaigns'),
  stock_transfer: msg('Dukaanon me stock transfer'),
  purchase_orders: msg('Purchase orders aur suppliers'),
  exports: msg('Excel/CSV files'),
  approvals: msg('Manager approval aur staff ki ijazatein'),
  hr: msg('Staff haazri aur tankhwah'),
  multi_shop: msg('Ek se zyada dukaan'),
  branding: msg('Apna logo aur rang'),
  api: msg('Developer API aur webhooks'),
  priority_support: msg('Pehle support'),
  'integration.shopify': msg('Shopify'),
  'integration.woocommerce': msg('WooCommerce'),
  'integration.daraz': msg('Daraz'),
  'integration.website': msg('Apni website'),
  'integration.foodpanda': msg('Foodpanda'),
  courier: msg('Courier booking'),
  online_store: msg('Online store aur order desk'),
  meta: msg('Facebook aur Instagram'),
  distribution: msg('Distribution aur wholesale'),
  fbr: msg('FBR aur tax'),
  accounting: msg('Accounting sync'),
  ai_plus: msg('Nafaa AI Plus'),
};

export const featureLabel = (key: string | null | undefined, fallback?: string) =>
  key ? t(FEATURE_LABELS[key] ?? fallback ?? key) : '';

export const FEATURE_GROUPS: Array<{ id: 'Core' | 'Business' | 'Growth' | 'Advanced'; title: string; icon: LucideIcon }> = [
  { id: 'Core', title: msg('Roz ka kaam'), icon: Store },
  { id: 'Business', title: msg('Hisaab aur reports'), icon: Wallet },
  { id: 'Growth', title: msg('Barhne ke liye'), icon: Rocket },
  { id: 'Advanced', title: msg('Bare business ke liye'), icon: BadgeCheck },
];

/** Icons for a few features in plan cards. */
export const FEATURE_ICONS: Record<string, LucideIcon> = {
  loyalty: Gift, discount_rules: Tag, stock_transfer: Boxes, hr: Users, api: Code2, branding: Palette, ai: Brain, exports: Layers, backup: Lock,
};

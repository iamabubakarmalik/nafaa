/**
 * Blog categories and posts. One file per post under `posts/`; the shared
 * shape and builder are in `_post.ts`.
 *
 * Twelve posts came from apps/marketing blog/posts.ts. Their invented numbers,
 * surveys, customers and fake authors (Fatima Khan, Ahmed Malik, Hassan Raza,
 * Zara Ahmed, Bilal Sheikh) were dropped and the posts were rewritten from
 * the product code, plain trade knowledge and official sources. The rest are
 * new. Posts get a real PERSON author once the owner names one (O4).
 * The 8 old slugs from blog.ts become redirects (content/redirects.ts).
 */

import { richText, withIds } from '../../lib/blocks';
import type { IconName } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import type { EntryRef, SeedEntry } from '../../lib/types';
import { post, type PostSpec } from './_post';

import bestPosKiryana from './posts/best-pos-kiryana-2026';
import digitalKhata from './posts/digital-khata-vs-paper-ledger';
import drapPharmacy from './posts/drap-compliance-pharmacy';
import fbrGuide from './posts/fbr-e-invoicing-complete-guide-2026';
import goldRate from './posts/gold-rate-pricing-jewelry-shops';
import startKiryana from './posts/how-to-start-kiryana-store-pakistan';
import multiShop from './posts/multi-shop-management-guide';
import aiAssistant from './posts/nafaa-ai-assistant-launch';
import ramadanEid from './posts/ramadan-eid-retail-strategy';
import restaurantKot from './posts/restaurant-kot-system-guide';
import salesTaxPunjab from './posts/sales-tax-guide-punjab-2026';
import whatsappRetention from './posts/whatsapp-customer-retention';
import profitMargin from './posts/how-to-calculate-profit-margin';
import stockTaking from './posts/stock-taking-guide';
import reduceUdhaar from './posts/how-to-reduce-udhaar';
import barcodeSetup from './posts/barcode-setup-guide';
import posPrinter from './posts/choosing-a-pos-printer';
import startPharmacy from './posts/how-to-start-a-pharmacy-pakistan';
import startBakery from './posts/how-to-start-a-bakery-pakistan';
import sellingOnline from './posts/selling-online-pakistan';
import counterTheft from './posts/staff-theft-prevention-counter';
import clothingSizes from './posts/clothing-size-inventory-guide';
import pricingStrategy from './posts/pricing-strategy-small-shop';
import readPnl from './posts/how-to-read-profit-and-loss-report';
import cashVsCredit from './posts/cash-vs-credit-sales';
import cashClosing from './posts/daily-cash-closing-routine';
import wholesaleRetail from './posts/wholesale-vs-retail-pricing';
import bakeryWastage from './posts/reduce-bakery-wastage';
import menuEngineering from './posts/restaurant-menu-engineering';
import pharmacyExpiry from './posts/pharmacy-expiry-management';
import mobileImei from './posts/mobile-shop-imei-records';
import garmentSeasons from './posts/garment-shop-seasonal-stock-planning';
import hardwareSkus from './posts/hardware-store-inventory-many-skus';
import barcodeOrNot from './posts/barcode-vs-no-barcode-store';
import hardwareKit from './posts/pos-hardware-kit-guide';
import secondBranch from './posts/opening-a-second-branch';
import loadShedding from './posts/load-shedding-proof-billing';
import counterStaff from './posts/hire-and-train-counter-staff';
import whatsappBusiness from './posts/whatsapp-business-for-shops';
import loyaltyPrograms from './posts/loyalty-programs-pakistan';
import digitalPayments from './posts/digital-payments-jazzcash-easypaisa-raast';
import festivalSeasons from './posts/festival-season-planning-pakistan';

const CHECKED_ON = '2026-10-20';

// ─── Categories ───

interface CategorySpec { slug: string; title: string; summary: string; icon: IconName }
const CATEGORIES: CategorySpec[] = [
  { slug: 'guides', title: 'How-to guides', summary: 'Step-by-step guides for running a shop in Pakistan: keeping khata, counting stock, setting prices, billing at the counter and getting started with Nafaa.', icon: 'book-open' },
  { slug: 'industry', title: 'Industry guides', summary: 'Practical guides for specific businesses in Pakistan: kiryana, pharmacy, restaurant, bakery, jewellery, garments, mobile shops, hardware stores and more.', icon: 'store' },
  { slug: 'compliance', title: 'FBR and tax', summary: 'FBR POS integration, provincial sales tax on services, DRAP rules for pharmacies and other rules Pakistani businesses must follow, with official sources.', icon: 'landmark' },
  { slug: 'business', title: 'Running a business', summary: 'Articles on running a small or mid-size business in Pakistan: customers, staff, cash, pricing, seasons such as Ramadan and Eid, and opening another branch.', icon: 'trending-up' },
  { slug: 'product', title: 'Product news', summary: 'News about Nafaa: new features, what they do at the counter and in the back office, and how to use them, along with the full changelog of what shipped.', icon: 'sparkles' },
];

/** Pages each category links to beside its posts. */
const CATEGORY_RELATED: Record<string, EntryRef[]> = {
  guides: ['PAGE:guides', 'PAGE:tools', 'PAGE:templates'],
  industry: ['PAGE:industries', 'INDUSTRY:kiryana', 'INDUSTRY:pharmacy', 'INDUSTRY:restaurant'],
  compliance: ['COMPLIANCE:fbr-pos-integration', 'COMPLIANCE:pra-punjab', 'COMPLIANCE:srb-sindh', 'COMPLIANCE:drap-pharmacy'],
  business: ['GUIDE:running-a-retail-shop-pakistan', 'GUIDE:managing-udhaar-and-khata', 'PAGE:tools'],
  product: ['PAGE:changelog', 'PAGE:product', 'PAGE:roadmap'],
};

export const blogCategories: SeedEntry[] = CATEGORIES.map((c, i) => ({
  type: 'BLOG_CATEGORY',
  slug: c.slug,
  title: c.title,
  summary: c.summary,
  data: { icon: c.icon },
  blocks: withIds(`BLOG_CATEGORY:${c.slug}`, [richText(c.summary)]),
  relations: (CATEGORY_RELATED[c.slug] ?? []).map((ref) => ({ ref, kind: 'RELATED' as const })),
  sortOrder: i + 1,
  origin: `apps/marketing/src/lib/data/blog/types.ts#blogCategories.${c.slug}`,
  evidence: [],
  factCheck: { checkedOn: CHECKED_ON, note: 'Category labels rewritten; no claims.' },
  dropped: ['Emoji and colour.'],
  needsOwner: [],
}));

// ─── Posts (display order) ───

const POSTS: PostSpec[] = [
  fbrGuide,
  digitalKhata,
  goldRate,
  startKiryana,
  bestPosKiryana,
  drapPharmacy,
  restaurantKot,
  multiShop,
  whatsappRetention,
  salesTaxPunjab,
  ramadanEid,
  aiAssistant,
  profitMargin,
  stockTaking,
  reduceUdhaar,
  barcodeSetup,
  posPrinter,
  startPharmacy,
  startBakery,
  sellingOnline,
  counterTheft,
  clothingSizes,
  pricingStrategy,
  readPnl,
  cashVsCredit,
  cashClosing,
  wholesaleRetail,
  bakeryWastage,
  menuEngineering,
  pharmacyExpiry,
  mobileImei,
  garmentSeasons,
  hardwareSkus,
  barcodeOrNot,
  hardwareKit,
  secondBranch,
  loadShedding,
  counterStaff,
  whatsappBusiness,
  loyaltyPrograms,
  digitalPayments,
  festivalSeasons,
];

export const blogPosts: SeedEntry[] = POSTS.map(post);

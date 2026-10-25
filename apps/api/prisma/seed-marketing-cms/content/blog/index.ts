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
import type { SeedEntry } from '../../lib/types';
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

const CHECKED_ON = '2026-10-20';

// ─── Categories ───

interface CategorySpec { slug: string; title: string; summary: string; icon: IconName }
const CATEGORIES: CategorySpec[] = [
  { slug: 'guides', title: 'How-to guides', summary: 'Step-by-step guides for running a shop in Pakistan: khata, stock, billing and setting up Nafaa.', icon: 'book-open' },
  { slug: 'industry', title: 'Industry guides', summary: 'Practical notes for specific businesses: kiryana, pharmacy, restaurant, jewellery and more.', icon: 'store' },
  { slug: 'compliance', title: 'FBR and tax', summary: 'FBR POS integration, provincial sales tax and other rules shops must follow, with official sources.', icon: 'landmark' },
  { slug: 'business', title: 'Running a business', summary: 'Customers, staff, seasons and growth for small and mid-size shops.', icon: 'trending-up' },
  { slug: 'product', title: 'Product news', summary: 'What is new in Nafaa, and what is coming next.', icon: 'sparkles' },
];

export const blogCategories: SeedEntry[] = CATEGORIES.map((c, i) => ({
  type: 'BLOG_CATEGORY',
  slug: c.slug,
  title: c.title,
  summary: c.summary,
  data: { icon: c.icon },
  blocks: withIds(`BLOG_CATEGORY:${c.slug}`, [richText(c.summary)]),
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
];

export const blogPosts: SeedEntry[] = POSTS.map(post);

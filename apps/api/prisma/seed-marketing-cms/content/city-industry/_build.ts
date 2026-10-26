/**
 * Builder for city + industry pages (/pos-software/{city}/{industry}).
 *
 * A pair page is only written where public, local material makes it
 * different from every other pair: the trade's known markets in that city,
 * how goods reach the shops there, and how customers pay. Each city file
 * supplies all prose; this file fixes the block order, the screenshots of the
 * industry, the evidence for the product claims and the internal links.
 *
 * Market notes describe what each place is publicly known for, with the
 * source in `sources`. Nothing here claims Nafaa customers, offices or staff
 * in a city. `data.evidence` (real customers) is optional: the pages publish
 * on their own local content, checked by the word and similarity gates.
 */

import { withIds } from '../../lib/blocks';
import type { EntryRef, SeedEntry } from '../../lib/types';
import type { Source } from '../../../../src/admin-marketing/cms/contract/cms-contract';
import { BASE_EVIDENCE } from '../cities/_hub';
import { SHOT, heroBlock, pricing, prose, shot, steps, table } from '../main-pages/_build';

export const CHECKED_ON = '2026-10-26';

interface IndustryKit {
  /** Short trade name used in the eyebrow. */
  label: string;
  hero: { id: string; url: string };
  /** Two further screenshots of the same industry pack. */
  shots: [{ id: string; url: string }, { id: string; url: string }];
  /** Files in apps/web that prove the claims made for this trade. */
  evidence: string[];
}

/** Screenshots are the SHOT keys the industry page itself uses. */
export const KITS = {
  kiryana: {
    label: 'Kiryana POS',
    hero: { id: SHOT.dashboard, url: 'app.nafaa.pk/dashboard' },
    shots: [{ id: SHOT.pos, url: 'app.nafaa.pk/pos' }, { id: SHOT.khata, url: 'app.nafaa.pk/khata' }],
    evidence: ['apps/web/src/industries/retail/RetailPack.tsx', 'apps/web/src/modules/pos/quick-keys', 'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx', 'apps/web/src/modules/inventory/low-stock/pages/LowStockPage.tsx'],
  },
  pharmacy: {
    label: 'Pharmacy POS',
    hero: { id: SHOT.pharmacyExpiry, url: 'app.nafaa.pk/pharmacy/expiring' },
    shots: [{ id: SHOT.pharmacyLowStock, url: 'app.nafaa.pk/low-stock' }, { id: SHOT.pharmacyKhata, url: 'app.nafaa.pk/khata' }],
    evidence: ['apps/web/src/industries/pharmacy/PharmacyPack.tsx', 'apps/web/src/industries/pharmacy/pages/SaltsPage.tsx', 'apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx', 'apps/web/src/industries/pharmacy/pages/ControlledLogPage.tsx', 'apps/web/src/industries/pharmacy/pages/TemperatureLogPage.tsx', 'apps/web/src/industries/pharmacy/api/substitutes.api.ts'],
  },
  restaurant: {
    label: 'Restaurant POS',
    hero: { id: SHOT.restaurantDashboard, url: 'app.nafaa.pk/restaurant/dashboard' },
    shots: [{ id: SHOT.kot, url: 'app.nafaa.pk/restaurant/kitchen' }, { id: SHOT.restaurantMenu, url: 'app.nafaa.pk/restaurant/menu' }],
    evidence: ['apps/web/src/industries/restaurant/RestaurantPack.tsx', 'apps/web/src/industries/restaurant/pages/TablesLayoutPage.tsx', 'apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx', 'apps/web/src/industries/restaurant/pages/StationsPage.tsx', 'apps/web/src/industries/restaurant/pages/RecipesPage.tsx', 'apps/web/src/industries/restaurant/pages/RidersPage.tsx', 'apps/web/src/industries/restaurant/pages/HappyHoursPage.tsx', 'apps/web/src/industries/restaurant/hooks/useOrderPayment.tsx', 'apps/web/src/core/lib/business-day.ts', 'apps/web/src/modules/finance/cash-register'],
  },
  'mobile-shop': {
    label: 'Mobile shop POS',
    hero: { id: SHOT.mobileImei, url: 'app.nafaa.pk/imei-inventory' },
    shots: [{ id: SHOT.mobileKhata, url: 'app.nafaa.pk/khata' }, { id: SHOT.mobileProfit, url: 'app.nafaa.pk/reports/profit' }],
    evidence: ['apps/web/src/industries/mobile/MobilePack.tsx', 'apps/web/src/industries/mobile/pages/GlobalImeiInventoryPage.tsx', 'apps/web/src/industries/mobile/pages/UsedPhonesPage.tsx', 'apps/web/src/industries/mobile/pages/RepairTicketsPage.tsx', 'apps/web/src/industries/mobile/pages/EmiPlansPage.tsx', 'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx'],
  },
  garments: {
    label: 'Clothing shop POS',
    hero: { id: SHOT.garmentsProducts, url: 'app.nafaa.pk/garments/products' },
    shots: [{ id: SHOT.branches, url: 'app.nafaa.pk/branches' }, { id: SHOT.garmentsProfit, url: 'app.nafaa.pk/reports/profit' }],
    evidence: ['apps/web/src/industries/garments/GarmentsPack.tsx', 'apps/web/src/industries/garments/pages/GarmentProductWizardPage.tsx', 'apps/web/src/industries/garments/pages/TailoringPage.tsx', 'apps/web/src/industries/garments/pages/MeasurementsPage.tsx', 'apps/web/src/industries/garments/pages/ExchangePage.tsx', 'apps/web/src/industries/garments/pages/LayawayPage.tsx', 'apps/web/src/industries/garments/pages/CollectionsPage.tsx'],
  },
  bakery: {
    label: 'Bakery and sweets POS',
    hero: { id: SHOT.bakeryCakeOrders, url: 'app.nafaa.pk/bakery/cake-orders' },
    shots: [{ id: SHOT.bakeryKhata, url: 'app.nafaa.pk/khata' }, { id: SHOT.bakeryProfit, url: 'app.nafaa.pk/reports/profit' }],
    evidence: ['apps/web/src/industries/bakery/BakeryPack.tsx', 'apps/web/src/industries/bakery/pages/ProductionPage.tsx', 'apps/web/src/industries/bakery/pages/IngredientsPage.tsx', 'apps/web/src/industries/bakery/pages/FreshnessPage.tsx', 'apps/web/src/industries/bakery/components/bulk/BulkViews.tsx'],
  },
  hardware: {
    label: 'Hardware store POS',
    hero: { id: SHOT.hardwareQuotations, url: 'app.nafaa.pk/hardware/quotations' },
    shots: [{ id: SHOT.hardwareReorder, url: 'app.nafaa.pk/hardware/reorder' }, { id: SHOT.hardwareKhata, url: 'app.nafaa.pk/hardware/credit-accounts' }],
    evidence: ['apps/web/src/industries/hardware/HardwarePack.tsx', 'apps/web/src/industries/hardware/pages/QuotationsPage.tsx', 'apps/web/src/industries/hardware/pages/DeliveryFormPage.tsx', 'apps/web/src/industries/hardware/pages/CreditAccountsPage.tsx', 'apps/web/src/industries/hardware/pages/ProjectsPage.tsx', 'apps/web/src/industries/hardware/pages/ReorderRulesPage.tsx', 'apps/web/src/industries/hardware/pages/BrandsPage.tsx'],
  },
  electronics: {
    label: 'Electronics shop POS',
    hero: { id: SHOT.electronicsSerials, url: 'app.nafaa.pk/electronics/serials' },
    shots: [{ id: SHOT.electronicsClaims, url: 'app.nafaa.pk/electronics/warranty-claims' }, { id: SHOT.electronicsBundles, url: 'app.nafaa.pk/electronics/bundles' }],
    evidence: ['apps/web/src/industries/electronics/ElectronicsPack.tsx', 'apps/web/src/industries/electronics/pages/SerialTrackingPage.tsx', 'apps/web/src/industries/electronics/pages/WarrantyClaimsPage.tsx', 'apps/web/src/industries/electronics/pages/ElectronicsBundlesPage.tsx', 'apps/web/src/industries/electronics/components/TradeInModal.tsx'],
  },
  shoe: {
    label: 'Shoe shop POS',
    hero: { id: SHOT.shoeProducts, url: 'app.nafaa.pk/products' },
    shots: [{ id: SHOT.shoeSizeReorder, url: 'app.nafaa.pk/shoes/size-reorder' }, { id: SHOT.shoeSizeRequests, url: 'app.nafaa.pk/shoes/size-requests' }],
    evidence: ['apps/web/src/industries/shoe/ShoePack.tsx', 'apps/web/src/industries/shoe/pages/ShoeProductWizardPage.tsx', 'apps/web/src/industries/shoe/pages/ShoeExchangesPage.tsx', 'apps/web/src/industries/shoe/pages/ShoeSizeChartsPage.tsx', 'apps/web/src/modules/inventory/transfers/pages/TransfersPage.tsx'],
  },
  jewelry: {
    label: 'Jewellery shop software',
    hero: { id: SHOT.jewelryRates, url: 'app.nafaa.pk/jewelry/metal-rates' },
    shots: [{ id: SHOT.jewelrySales, url: 'app.nafaa.pk/jewelry/sales' }, { id: SHOT.jewelryOrders, url: 'app.nafaa.pk/jewelry/custom-orders' }],
    evidence: ['apps/web/src/industries/jewelry'],
  },
  optical: {
    label: 'Optical shop software',
    hero: { id: SHOT.opticalLensOrders, url: 'app.nafaa.pk/optical/lens-orders' },
    shots: [{ id: SHOT.opticalPrescriptions, url: 'app.nafaa.pk/optical/prescriptions' }, { id: SHOT.opticalEyeTests, url: 'app.nafaa.pk/optical/eye-tests' }],
    evidence: ['apps/web/src/industries/optical/OpticalPack.tsx', 'apps/web/src/industries/optical/pages/PrescriptionsPage.tsx', 'apps/web/src/industries/optical/pages/LensOrdersPage.tsx', 'apps/web/src/industries/optical/pages/EyeTestsPage.tsx', 'apps/web/src/industries/optical/lib/print.ts'],
  },
  autoparts: {
    label: 'Auto parts POS',
    hero: { id: SHOT.autopartsParts, url: 'app.nafaa.pk/autoparts/parts' },
    shots: [{ id: SHOT.autopartsJobs, url: 'app.nafaa.pk/autoparts/workshop-jobs' }, { id: SHOT.profitByProduct, url: 'app.nafaa.pk/reports/profit' }],
    evidence: ['apps/web/src/industries/autoparts/AutoPartsPack.tsx', 'apps/web/src/industries/autoparts/components/FitmentEditor.tsx', 'apps/web/src/industries/autoparts/pages/WorkshopJobsPage.tsx', 'apps/web/src/industries/autoparts/pages/CustomerVehiclesPage.tsx', 'apps/web/src/industries/autoparts/pages/ServiceRemindersPage.tsx'],
  },
  sports: {
    label: 'Sports shop POS',
    hero: { id: SHOT.sportsTeamOrders, url: 'app.nafaa.pk/sports/team-orders' },
    shots: [{ id: SHOT.sportsRepairs, url: 'app.nafaa.pk/sports/repairs' }, { id: SHOT.khata, url: 'app.nafaa.pk/khata' }],
    evidence: ['apps/web/src/industries/sports/SportsPack.tsx', 'apps/web/src/industries/sports/pages/TeamOrdersPage.tsx', 'apps/web/src/industries/sports/pages/RepairServicesPage.tsx', 'apps/web/src/industries/sports/pages/SportsProductsPage.tsx', 'apps/web/src/industries/sports/pages/SportsBrandsPage.tsx'],
  },
  furniture: {
    label: 'Furniture shop software',
    hero: { id: SHOT.furnitureOrders, url: 'app.nafaa.pk/furniture/custom-orders' },
    shots: [{ id: SHOT.khata, url: 'app.nafaa.pk/khata' }, { id: SHOT.profitLoss, url: 'app.nafaa.pk/reports/profit-loss' }],
    evidence: ['apps/web/src/industries/furniture/FurniturePack.tsx', 'apps/web/src/industries/furniture/pages/CustomOrdersPage.tsx', 'apps/web/src/industries/furniture/pages/CarpentersPage.tsx', 'apps/web/src/industries/furniture/pages/DeliveriesPage.tsx'],
  },
  appliances: {
    label: 'Appliance shop POS',
    hero: { id: SHOT.appliancesInstallations, url: 'app.nafaa.pk/appliances/installations' },
    shots: [{ id: SHOT.appliancesService, url: 'app.nafaa.pk/appliances/service-requests' }, { id: SHOT.staff, url: 'app.nafaa.pk/staff' }],
    evidence: ['apps/web/src/industries/appliances/AppliancesPack.tsx', 'apps/web/src/industries/appliances/pages/ApplianceSerialsPage.tsx', 'apps/web/src/industries/appliances/pages/InstallationsPage.tsx', 'apps/web/src/industries/appliances/pages/ServiceRequestsPage.tsx', 'apps/web/src/industries/appliances/pages/QistPlanPage.tsx', 'apps/web/src/industries/appliances/pages/ApplianceWarrantyClaimsPage.tsx'],
  },
  agri: {
    label: 'Agri dealer POS',
    hero: { id: SHOT.agriBulkOrders, url: 'app.nafaa.pk/agri/bulk-orders' },
    shots: [{ id: SHOT.agriFarmers, url: 'app.nafaa.pk/agri/farmers' }, { id: SHOT.lowStock, url: 'app.nafaa.pk/low-stock' }],
    evidence: ['apps/web/src/industries/agri/AgriPack.tsx', 'apps/web/src/industries/agri/pages/FarmersPage.tsx', 'apps/web/src/industries/agri/pages/BulkOrdersPage.tsx', 'apps/web/src/industries/agri/pages/SeasonalPlansPage.tsx', 'apps/web/src/industries/agri/pages/SubsidyPage.tsx', 'apps/web/src/industries/agri/lib/agriUnits.ts'],
  },
} satisfies Record<string, IndustryKit>;

export type IndustryKey = keyof typeof KITS;

export interface ShotCopy {
  heading: string;
  body: string;
}

export interface PairCopy {
  /** Parent CITY slug. */
  city: string;
  cityName: string;
  industry: IndustryKey;
  /** Page title and H1, e.g. "Kiryana POS software in Karachi". */
  title: string;
  /** 40-60 words; shown in the answer box. */
  summary: string;
  /** 120-160 characters. */
  seoDescription: string;
  focusKeyword: string;
  sub: string;
  badges: string[];
  facts: [label: string, value: string][];
  romanUrdu: string;
  /** "## ..." markdown: the trade in this city, its markets and supply chain. */
  local: string;
  shotA: ShotCopy;
  /** "## ..." markdown: how the day runs here and where Nafaa fits. */
  work: string;
  table: { heading: string; caption: string; columns: [string, string]; rows: [string, string, string][] };
  shotB: ShotCopy;
  steps: { heading: string; items: [string, string][] };
  /** "## ..." markdown with "###" questions written for this pair. */
  questions: string;
  cta: { heading: string; body: string };
  /** Sibling pairs as "city/industry"; 2-3. */
  siblings: string[];
  /** Further existing entries to link (compliance pages, guides). */
  related?: EntryRef[];
  faqKeys: string[];
  sources: Source[];
  factNote: string;
  needsOwner?: string[];
}

export function wiki(title: string): Source {
  return {
    title: `${title} (Wikipedia)`,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_')).replace(/%2C/g, ',').replace(/%28/g, '(').replace(/%29/g, ')')}`,
    publisher: 'Wikipedia',
    accessedAt: CHECKED_ON,
  };
}

export function src(title: string, url: string, publisher: string): Source {
  return { title, url, publisher, accessedAt: CHECKED_ON };
}

/** Lahore Walled City Authority's bazaar directory (government source). */
export const WCLA_BAZAARS = src('Bazaars of the Walled City', 'https://walledcitylahore.gop.pk/bazaars/', 'Walled City of Lahore Authority');

const OWNER_EVIDENCE = 'data.evidence: a case study or a note of real Nafaa customers in this city and trade is needed before publishing (CITY_INDUSTRY requires it). Not filled, so the page stays a draft.';

export function pairKey(city: string, industry: string): EntryRef {
  return `CITY_INDUSTRY:${city}/${industry}`;
}

export function pair(c: PairCopy): SeedEntry {
  const kit: IndustryKit = KITS[c.industry];
  const key = `CITY_INDUSTRY:${c.city}/${c.industry}`;
  const columns = [
    { key: 'a', label: c.table.columns[0] },
    { key: 'b', label: c.table.columns[1], highlight: true },
  ];
  return {
    type: 'CITY_INDUSTRY',
    slug: c.industry,
    parent: `CITY:${c.city}`,
    title: c.title,
    summary: c.summary,
    seoTitle: `${c.title} | Nafaa`,
    seoDescription: c.seoDescription,
    focusKeyword: c.focusKeyword,
    data: {},
    blocks: withIds(key, [
      heroBlock({
        eyebrow: `${kit.label} in ${c.cityName}`,
        heading: c.title,
        sub: c.sub,
        media: kit.hero,
        badges: c.badges,
        layout: 'split',
      }),
      { type: 'answerBox', facts: c.facts.map(([label, value]) => ({ label, value })), romanUrdu: c.romanUrdu },
      prose(c.local),
      shot({ heading: c.shotA.heading, body: c.shotA.body, id: kit.shots[0].id, url: kit.shots[0].url, layout: 'split-right' }),
      prose(c.work),
      table(c.table.heading, c.table.caption, columns, c.table.rows),
      shot({ heading: c.shotB.heading, body: c.shotB.body, id: kit.shots[1].id, url: kit.shots[1].url, layout: 'split-left' }),
      steps(c.steps.heading, c.steps.items),
      prose(c.questions),
      pricing(`Plans for ${c.cityName}`),
      { type: 'faq', heading: 'More questions' },
      {
        type: 'cta',
        heading: c.cta.heading,
        body: c.cta.body,
        primaryCta: { label: 'Start free trial', href: 'signup', variant: 'primary', trackAs: 'hero_signup' },
        secondaryCta: { label: 'Ask on WhatsApp', href: 'whatsapp', variant: 'ghost', trackAs: 'whatsapp' },
      },
    ] as never),
    faqKeys: c.faqKeys,
    relations: [
      // The first INDUSTRY relation also fills data.industryId when the seed runs.
      { ref: `INDUSTRY:${c.industry}`, kind: 'TAG' },
      { ref: `CITY:${c.city}`, kind: 'RELATED' },
      ...c.siblings.map((s) => ({ ref: `CITY_INDUSTRY:${s}` as EntryRef, kind: 'RELATED' as const })),
      ...(c.related ?? []).map((ref) => ({ ref, kind: 'RELATED' as const })),
    ],
    origin: 'new',
    evidence: [...new Set([...BASE_EVIDENCE.slice(0, 4), ...kit.evidence])],
    sources: c.sources,
    factCheck: { checkedOn: CHECKED_ON, note: c.factNote },
    dropped: [],
    needsOwner: [OWNER_EVIDENCE, ...(c.needsOwner ?? [])],
  };
}

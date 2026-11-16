/**
 * Catalog settings per industry: where the data comes from, which views,
 * filters and quick chips to show. Industries not listed use the shop
 * catalog built from products.
 */

import {
  Apple, BadgeCheck, CalendarDays, ChefHat, Cpu, Croissant, Dumbbell, Flame, Gem, Gift, Layers, Leaf, MapPin, Package,
  Ruler, Scissors, ShieldCheck, Sparkles, Sprout, Star, Stethoscope, Sun, Tag, Users, Wheat, Wrench, Zap,
} from 'lucide-react';
import { PTA_STATUS_LABELS } from '@industries/mobile/api/imei.api';
import { CONDITION_META } from '@industries/electronics/constants';
import { CATEGORIES as BAKERY_CATEGORIES } from '@industries/bakery/api/constants';
import { SEASONS } from '@industries/agri/lib/agriUnits';
import type { CatalogConfig, CatalogEntry } from './types';
import { agriSource, carpetPiecesSource, carpetRollsSource, electronicsDealsSource, electronicsSource, jewelrySource, mobileSource, pretty, productsSource } from './sources/products';
import { bakerySource, DIET_LABELS, restaurantSource, SPICE_LABELS } from './sources/food';
import { clinicSource, gymClassesSource, gymPlansSource, gymTrainersSource, PLAN_LABELS, servicesBizSource } from './sources/services';
import { t } from '@core/i18n';

const has = (e: CatalogEntry, key: string, value: string) => {
  const v = e.facets?.[key];
  return Array.isArray(v) ? v.includes(value) : v === value;
};
const labelsOf = (pairs: Array<{ value: string; label: string }>) => Object.fromEntries(pairs.map((p) => [p.value, p.label]));
const PRODUCT_BANDS: Array<[number, number]> = [[0, 1000], [1000, 5000], [5000, 20000], [20000, 100000], [100000, Infinity]];

const shop: CatalogConfig = {
  label: t('Dukaan'), title: t('Catalog'), noun: t('cheezein'), listLabel: t('Pasand list'),
  sections: [{ id: 'all', label: t('Sab cheezein'), icon: Package, source: productsSource }],
  modes: ['grid', 'list'], stock: true, priceBands: PRODUCT_BANDS,
  facets: [{ key: 'tag', label: t('Tag'), icon: Tag }],
};

const CONFIGS: Record<string, CatalogConfig> = {
  restaurant: {
    label: t('Restaurant'), title: t('Menu'), noun: 'dishes', listLabel: t('Order list'), tagline: 'Garam aur taaza',
    sections: [{ id: 'menu', label: t('Menu'), icon: ChefHat, source: restaurantSource }],
    modes: ['menu', 'grid', 'list'], stock: false,
    facets: [
      { key: 'diet', label: t('Khana'), icon: Leaf, labels: DIET_LABELS },
      { key: 'spice', label: t('Teekha'), icon: Flame, labels: SPICE_LABELS },
    ],
    quick: [
      { id: 'veg', label: t('Veg'), icon: Leaf, test: (e) => has(e, 'diet', 'VEGETARIAN') || has(e, 'diet', 'VEGAN') },
      { id: 'spicy', label: t('Teekha'), icon: Flame, test: (e) => !!e.facets?.spice },
      { id: 'chef', label: t('Chef special'), icon: ChefHat, test: (e) => !!e.badges?.some((b) => b.label === 'Chef special') },
      { id: 'best', label: t('Best seller'), icon: Star, test: (e) => !!e.badges?.some((b) => b.label === 'Best seller') },
    ],
  },
  bakery: {
    label: t('Bakery'), title: t('Bakery menu'), noun: 'cheezein', listLabel: t('Order list'), tagline: 'Roz taaza',
    sections: [{ id: 'all', label: t('Sab cheezein'), icon: Croissant, source: bakerySource }],
    modes: ['menu', 'grid', 'list'], stock: true, priceBands: [[0, 200], [200, 1000], [1000, 3000], [3000, Infinity]],
    facets: [{ key: 'bcat', label: t('Type'), icon: Croissant, labels: labelsOf(BAKERY_CATEGORIES) }],
    quick: [
      { id: 'fresh', label: t('Aaj bani'), icon: Sun, test: (e) => has(e, 'fresh', 'today') },
      { id: 'eggless', label: t('Eggless'), icon: Leaf, test: (e) => has(e, 'diet', 'eggless') },
      { id: 'vegan', label: t('Vegan'), icon: Sprout, test: (e) => has(e, 'diet', 'vegan') },
      { id: 'sugarfree', label: t('Sugar free'), icon: Apple, test: (e) => has(e, 'diet', 'sugarfree') },
      { id: 'custom', label: t('Order par cake'), icon: Gift, test: (e) => has(e, 'custom', 'yes') },
    ],
  },
  mobile: {
    label: t('Mobile shop'), title: t('Mobile catalog'), noun: 'cheezein', listLabel: t('Pasand list'),
    sections: [{ id: 'all', label: t('Sab'), icon: Package, source: mobileSource }],
    modes: ['grid', 'list'], stock: true, priceBands: [[0, 20000], [20000, 50000], [50000, 100000], [100000, 200000], [200000, Infinity]],
    facets: [
      { key: 'kind', label: t('Type'), icon: Layers, labels: { phone: 'Mobile phone', accessory: 'Accessories' } },
      { key: 'pta', label: t('PTA'), icon: ShieldCheck, labels: PTA_STATUS_LABELS },
    ],
    quick: [
      { id: 'phones', label: t('Sirf phone'), test: (e) => has(e, 'kind', 'phone') },
      { id: 'pta', label: t('PTA approved'), icon: ShieldCheck, test: (e) => has(e, 'pta', 'APPROVED') },
    ],
  },
  electronics: {
    label: t('Electronics'), title: t('Catalog'), noun: 'cheezein', listLabel: t('Pasand list'),
    sections: [
      { id: 'all', label: t('Sab cheezein'), icon: Cpu, source: electronicsSource },
      { id: 'deals', label: t('Deals'), icon: Gift, source: electronicsDealsSource },
    ],
    modes: ['grid', 'list'], stock: true, priceBands: [[0, 2000], [2000, 10000], [10000, 30000], [30000, 100000], [100000, Infinity]],
    facets: [
      { key: 'group', label: t('Type'), icon: Layers },
      { key: 'condition', label: t('Halat'), icon: BadgeCheck, labels: Object.fromEntries(Object.entries(CONDITION_META).map(([k, v]) => [k, v.label])) },
    ],
    quick: [{ id: 'warranty', label: t('Warranty wali'), icon: ShieldCheck, test: (e) => !!e.chips?.some((c) => c.label.endsWith('warranty')) }],
  },
  jewelry: {
    label: t('Jewellery'), title: t('Jewellery catalog'), noun: 'designs', listLabel: t('Pasand list'),
    sections: [{ id: 'all', label: t('Sab designs'), icon: Gem, source: jewelrySource }],
    modes: ['grid', 'list'], stock: true, priceBands: [[0, 50000], [50000, 200000], [200000, 500000], [500000, 1500000], [1500000, Infinity]],
    facets: [
      { key: 'karat', label: t('Karat'), icon: Sparkles, labels: { KARAT_24: '24K', KARAT_22: '22K', KARAT_21: '21K', KARAT_18: '18K', KARAT_14: '14K' } },
      { key: 'metal', label: t('Dhaat'), icon: Gem },
      { key: 'jtype', label: t('Zevar'), icon: Layers },
      { key: 'style', label: t('Style'), icon: Star },
    ],
    quick: [{ id: 'bridal', label: t('Bridal'), icon: Gem, test: (e) => has(e, 'collection', 'bridal') }],
  },
  carpet: {
    label: t('Carpet'), title: t('Carpet catalog'), noun: 'designs', listLabel: t('Pasand list'),
    sections: [
      { id: 'designs', label: t('Designs'), icon: Layers, source: productsSource },
      { id: 'rolls', label: t('Rolls'), icon: Ruler, source: carpetRollsSource },
      { id: 'pieces', label: t('Tayyar piece'), icon: Scissors, source: carpetPiecesSource },
    ],
    modes: ['grid', 'list'], stock: true,
    facets: [
      { key: 'width', label: t('Chorai'), icon: Ruler },
      { key: 'size', label: t('Size'), icon: Ruler, labels: { small: 'Chhota (20 sqft tak)', medium: 'Darmiyana (20–60)', large: 'Bara (60+ sqft)' } },
    ],
  },
  agri: {
    label: t('Zarai markaz'), title: t('Catalog'), noun: 'cheezein', listLabel: t('Meri list'),
    sections: [{ id: 'all', label: t('Sab cheezein'), icon: Wheat, source: agriSource }],
    modes: ['grid', 'list'], stock: true,
    facets: [
      { key: 'kind', label: t('Type'), icon: Layers, labels: { seed: 'Beej', fert: 'Khaad', spray: 'Dawa / spray', feed: 'Feed', tool: 'Auzaar', other: 'Baqi' } },
      { key: 'crop', label: t('Fasal'), icon: Wheat },
      { key: 'season', label: t('Mausam'), icon: Sun, labels: Object.fromEntries(SEASONS.map((s) => [s.v, `${s.e} ${s.l}`])) },
    ],
    quick: [{ id: 'organic', label: t('Organic'), icon: Leaf, test: (e) => !!e.badges?.some((b) => b.label === 'Organic') }],
  },
  clinic: {
    label: t('Clinic'), title: t('Services aur fees'), noun: 'services', listLabel: t('Meri list'),
    sections: [{ id: 'services', label: t('Services'), icon: Stethoscope, source: clinicSource }],
    modes: ['grid', 'list'], stock: false,
    quick: [
      { id: 'popular', label: t('Mashhoor'), icon: Star, test: (e) => has(e, 'tag', 'popular') },
      { id: 'offer', label: t('Discount'), icon: Tag, test: (e) => has(e, 'offer', 'yes') },
    ],
  },
  gym: {
    label: t('Gym'), title: t('Plans aur classes'), noun: 'plans', listLabel: t('Meri list'),
    sections: [
      { id: 'plans', label: t('Membership'), icon: Dumbbell, source: gymPlansSource },
      { id: 'trainers', label: t('Trainers'), icon: Users, source: gymTrainersSource },
      { id: 'classes', label: t('Classes'), icon: CalendarDays, source: gymClassesSource },
    ],
    modes: ['grid', 'list'], stock: false,
    facets: [{ key: 'plan', label: t('Period'), icon: CalendarDays, labels: PLAN_LABELS }],
  },
  'services-biz': {
    label: t('Services'), title: t('Services aur rates'), noun: 'services', listLabel: t('Meri list'),
    sections: [{ id: 'services', label: t('Services'), icon: Wrench, source: servicesBizSource }],
    modes: ['grid', 'list'], stock: false,
    facets: [{ key: 'biz', label: t('Kaam'), icon: MapPin }],
    quick: [{ id: 'emergency', label: t('24/7 emergency'), icon: Zap, test: (e) => has(e, 'emergency', 'yes') }],
  },
};

export function catalogConfigFor(industryId?: string | null): CatalogConfig {
  return (industryId && CONFIGS[industryId]) || shop;
}

/** Label for a facet value; unknown values are tidied, not hidden. */
export const facetLabel = (labels: Record<string, string> | undefined, v: string) => labels?.[v] ?? (/^[A-Z0-9_]+$/.test(v) ? pretty(v) : v);

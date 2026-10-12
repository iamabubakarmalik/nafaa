/**
 * Catalog data sources for businesses that sell products: the plain shop and
 * the industries that add their own details (mobile, electronics, jewelry,
 * carpet, agri). Each one maps to CatalogEntry and leaves cost out.
 */

import { formatPKR } from '@core/lib/format';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import type { Product } from '@modules/inventory/products/api/products.api';
import { mobilePosApi } from '@industries/mobile/api/mobile-pos.api';
import { PTA_STATUS_LABELS, type PtaStatus } from '@industries/mobile/api/imei.api';
import { electronicsPosApi } from '@industries/electronics/api/electronics-pos.api';
import { CATEGORY_GROUPS, CATEGORY_META, CONDITION_META, type CategoryType, type ConditionType } from '@industries/electronics/constants';
import { jewelryProductsApi, type JewelryProductProfile } from '@industries/jewelry/api/products.api';
import { metalRatesApi, type MetalRate } from '@industries/jewelry/api/metal-rates.api';
import { carpetRollsApi } from '@industries/carpet/api/carpet-rolls.api';
import { carpetCutPiecesApi } from '@industries/carpet/api/carpet-cut-pieces.api';
import { agriProductsApi, type AgriProductProfile } from '@industries/agri/api/products.api';
import { AGRI_KIND_EMOJI, deriveAgriKind, isFeedKind, isFertKind, isSeedKind, isSprayKind, isToolKind, needsGovtReg, prettyAgriKind, type AgriKind } from '@industries/agri/lib/agriCategory';
import { agriUnitLabel, certStatus, isMeasured, SEASONS } from '@industries/agri/lib/agriUnits';
import type { CatalogEntry, CatalogSource, EntryBadge } from '../types';

/** Drops empty spec rows. */
export const specs = (rows: Array<[string, string | number | null | undefined | false]>): Array<[string, string]> =>
  rows.filter(([, v]) => v !== null && v !== undefined && v !== false && v !== '' && v !== 0).map(([k, v]) => [k, String(v)]);

export const pretty = (v: string) => v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** Swallows a failed side request so the main list still shows. */
export const optional = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

export async function activeProducts(): Promise<Product[]> {
  return (await fetchAllProducts({ isActive: true })).items;
}

/** The fields every product shares. */
export function fromProduct(p: Product): CatalogEntry {
  const images = (p.images ?? []).map((i) => i.url).filter(Boolean);
  const tags = (p.tags ?? []).map((t) => t.tag?.name).filter(Boolean) as string[];
  return {
    id: p.id,
    productId: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    per: p.unit || undefined,
    image: images[0] ?? null,
    images,
    description: p.shortDescription || p.description || null,
    category: p.category ? { id: p.category.id, name: p.category.name, color: p.category.color } : null,
    brand: p.brand?.name ?? null,
    featured: !!p.isFeatured,
    inStock: Number(p.stock) > 0,
    variantCount: p._count?.variants ?? 0,
    createdAt: p.createdAt,
    facets: tags.length ? { tag: tags } : undefined,
    keywords: [p.sku, p.barcode, ...tags].filter(Boolean).join(' '),
  };
}

export const productsSource: CatalogSource = {
  key: 'products',
  load: async () => (await activeProducts()).map(fromProduct),
};

/* Mobile: phones are counted from their IMEIs, with the PTA mix and warranty. */

const PTA_TONE: Record<PtaStatus, EntryBadge['tone']> = { APPROVED: 'green', NON_PTA: 'red', PATCH: 'amber', PENDING: 'blue', EXEMPT: 'slate' };

export const mobileSource: CatalogSource = {
  key: 'mobile',
  load: async ({ shopId }) => {
    const [products, live] = await Promise.all([activeProducts(), optional(mobilePosApi.catalog({ shopId }), null)]);
    const phones = new Map<string, { count: number; pta: Partial<Record<PtaStatus, number>>; warranty: number; colors: Set<string> }>();
    for (const ph of live?.phones ?? []) {
      const row = phones.get(ph.productId) ?? { count: 0, pta: {}, warranty: 0, colors: new Set<string>() };
      row.count += 1;
      if (ph.ptaStatus) row.pta[ph.ptaStatus] = (row.pta[ph.ptaStatus] ?? 0) + 1;
      row.warranty = Math.max(row.warranty, Number(ph.warrantyMonths ?? 0));
      const color = ph.variant?.color || ph.color;
      if (color) row.colors.add(color);
      phones.set(ph.productId, row);
    }
    const accessories = new Map((live?.accessories ?? []).map((a) => [a.id, a.notInShop ? 0 : a.stock]));
    return products.map((p) => {
      const e = fromProduct(p);
      const ph = phones.get(p.id);
      const stock = ph ? ph.count : accessories.get(p.id) ?? Number(p.stock);
      const pta = ph ? (Object.entries(ph.pta) as Array<[PtaStatus, number]>).sort((a, b) => b[1] - a[1]) : [];
      return {
        ...e,
        inStock: stock > 0,
        stockNote: stock <= 0 ? undefined : stock <= 2 ? `Sirf ${stock} baqi` : `${stock} mojood`,
        chips: [
          ...pta.slice(0, 2).map(([s]) => ({ label: PTA_STATUS_LABELS[s], tone: PTA_TONE[s] })),
          ...(ph?.warranty ? [{ label: `${ph.warranty} mahine warranty`, tone: 'blue' as const }] : []),
        ],
        specs: specs([
          ['PTA', pta.map(([s, n]) => `${PTA_STATUS_LABELS[s]} (${n})`).join(', ')],
          ['Warranty', ph?.warranty ? `${ph.warranty} mahine` : null],
          ['Rang', ph ? [...ph.colors].join(', ') : null],
        ]),
        facets: { ...e.facets, kind: ph ? 'phone' : 'accessory', pta: pta.map(([s]) => s) },
      };
    });
  },
};

/* Electronics: the POS catalog already carries condition, warranty and MRP. */

const groupOf = (t: string | null) => CATEGORY_GROUPS.find((g) => g.items.includes(t as CategoryType))?.label;

export const electronicsSource: CatalogSource = {
  key: 'electronics',
  load: async ({ shopId }) => {
    const data = await electronicsPosApi.catalog({ shopId });
    return data.items.map((p): CatalogEntry => {
      const avail = p.availableStock ?? p.stock;
      const meta = p.categoryType ? CATEGORY_META[p.categoryType as CategoryType] : undefined;
      const cond = p.conditionType ? CONDITION_META[p.conditionType as ConditionType] : undefined;
      return {
        id: p.id, productId: p.id, name: p.name, price: Number(p.price) || 0, per: p.unit,
        oldPrice: p.mrp && p.mrp > p.price ? p.mrp : null,
        priceNote: p.price > 0 ? undefined : 'Rate poochein',
        image: p.imageUrl, emoji: meta?.emoji ?? '📦',
        category: p.categoryId ? { id: p.categoryId, name: p.categoryName ?? 'Category' } : null,
        brand: p.brandName, featured: p.isFeatured, inStock: avail > 0,
        stockNote: avail > 0 ? `${avail} mojood` : undefined,
        badges: [
          ...(p.isNewArrival ? [{ label: 'Naya', tone: 'blue' as const }] : []),
          ...(p.isBestSeller ? [{ label: 'Hit', tone: 'pink' as const }] : []),
        ],
        chips: [
          ...(cond && p.conditionType !== 'BRAND_NEW' ? [{ label: cond.label, tone: 'amber' as const }] : []),
          { label: p.warrantyMonths > 0 ? `${p.warrantyMonths} mahine warranty` : 'Warranty nahi', tone: p.warrantyMonths > 0 ? 'blue' : 'slate' },
        ],
        specs: specs([
          ['Qisam', meta ? `${meta.emoji} ${meta.label}` : null],
          ['Model', p.modelNumber],
          ['Halat', cond ? `${cond.label} — ${cond.hint}` : null],
          ['Warranty', p.warrantyMonths > 0 ? `${p.warrantyMonths} mahine${p.warrantyType ? ` (${pretty(p.warrantyType)})` : ''}` : null],
          ['Screen', p.screenSize],
          ['Connectivity', p.connectivity?.join(', ')],
          ['Rang', p.colorName],
          ['MRP', p.mrp ? formatPKR(p.mrp) : null],
        ]),
        facets: { group: groupOf(p.categoryType) ?? 'Baqi', condition: p.conditionType ?? 'BRAND_NEW' },
        keywords: [p.sku, p.barcode, p.modelNumber].filter(Boolean).join(' '),
      };
    });
  },
};

export const electronicsDealsSource: CatalogSource = {
  key: 'electronics-deals',
  load: async ({ shopId }) => {
    const data = await electronicsPosApi.catalog({ shopId });
    return data.bundles.map((b): CatalogEntry => ({
      id: b.id, name: b.name, price: b.bundlePrice, oldPrice: b.originalPrice > b.bundlePrice ? b.originalPrice : null,
      image: b.imageUrl ?? null, emoji: '🎁', description: b.description ?? null, featured: b.isFeatured, inStock: null,
      badges: b.savingsPct > 0 ? [{ label: `-${Math.round(b.savingsPct)}%`, tone: 'red' }] : [],
      chips: b.savings > 0 ? [{ label: `${formatPKR(b.savings)} ki bachat`, tone: 'green' }] : [],
      includes: b.items.map((i) => `${i.quantity} × ${i.name ?? 'Cheez'}`),
      specs: specs([['Kab tak', b.validUntil ? new Date(b.validUntil).toLocaleDateString('en-PK', { dateStyle: 'medium' }) : null]]),
    }));
  },
};

/* Jewelry: karat, weight and making from the jewelry profile; today's metal rate. */

const purityLabel = (p: string) => (p.startsWith('KARAT_') ? `${p.slice(6)}K` : pretty(p));

function making(j: JewelryProductProfile) {
  if (j.makingChargePerGram > 0) return `${formatPKR(j.makingChargePerGram)} / gram`;
  if (j.makingChargeFixed > 0) return formatPKR(j.makingChargeFixed);
  if (j.makingChargePct > 0) return `${j.makingChargePct}%`;
  return null;
}

export const jewelrySource: CatalogSource = {
  key: 'jewelry',
  load: async () => {
    const [products, profiles, rates] = await Promise.all([
      activeProducts(),
      optional(jewelryProductsApi.list(), [] as JewelryProductProfile[]),
      optional(metalRatesApi.current(), [] as MetalRate[]),
    ]);
    const byProduct = new Map((Array.isArray(profiles) ? profiles : []).map((j) => [j.productId, j]));
    const rateOf = (j: JewelryProductProfile) => (Array.isArray(rates) ? rates : []).find((r) => r.metalType === j.metalType && r.purity === j.purity);
    return products.map((p) => {
      const e = fromProduct(p);
      const j = byProduct.get(p.id);
      const bridal = /bridal/i.test(`${p.name} ${p.category?.name ?? ''}`) || !!j?.isBridalCollection;
      if (!j) return { ...e, facets: { ...e.facets, ...(bridal ? { collection: 'bridal' } : {}) } };
      const rate = rateOf(j);
      return {
        ...e,
        image: e.image ?? j.imageUrls?.[0] ?? null,
        images: e.images?.length ? e.images : j.imageUrls,
        description: j.descriptionLong || e.description,
        featured: e.featured || j.isFeatured,
        badges: [
          ...(j.isBestSeller ? [{ label: 'Best', tone: 'pink' as const }] : []),
          ...(bridal ? [{ label: 'Bridal', tone: 'red' as const }] : []),
        ],
        chips: [
          { label: purityLabel(j.purity), tone: 'amber' },
          ...(j.netWeight > 0 ? [{ label: `${j.netWeight} g`, tone: 'slate' as const }] : []),
          ...(j.hasDiamond ? [{ label: 'Diamond', tone: 'blue' as const }] : []),
        ],
        specs: specs([
          ['Dhaat', pretty(j.metalType)],
          ['Karat', purityLabel(j.purity)],
          ['Kul wazan', j.grossWeight > 0 ? `${j.grossWeight} g` : null],
          ['Sona / chandi', j.netWeight > 0 ? `${j.netWeight} g` : null],
          ['Nag ka wazan', j.stoneWeight > 0 ? `${j.stoneWeight} g` : null],
          ['Banwai (making)', making(j)],
          ['Wastage', j.wastagePct > 0 ? `${j.wastagePct}%` : null],
          ['Aaj ka rate', rate ? `${formatPKR(rate.sellRate || rate.ratePerGram)} / gram` : null],
          ['Size', j.size],
          ['Design #', j.designNumber],
          ['Hallmark', j.hallmarkNumber || j.purityHallmark],
          ['Certificate', j.isCertified ? j.certificateAuthority || 'Haan' : null],
          ['Wapsi', j.isReturnable ? `${j.returnDays} din me` : null],
          ['Buy-back', j.isBuyBackEligible ? `${j.buyBackPct}%` : null],
        ]),
        includes: (j.gemstones ?? []).filter((g) => g.type !== 'NONE').map((g) => `${g.count} × ${pretty(g.type)}${g.caret ? ` (${g.caret} ct)` : ''}`),
        facets: {
          ...e.facets, karat: j.purity, metal: j.metalType, jtype: j.category, style: j.style,
          ...(bridal ? { collection: 'bridal' } : {}),
        },
        keywords: [e.keywords, j.itemCode, j.designNumber].filter(Boolean).join(' '),
      };
    });
  },
};

/* Carpet: designs are products; rolls and ready pieces come from their own lists. */

const inches = (ft: number, inch: number) => `${ft}'${inch ? ` ${inch}"` : ''}`;

export const carpetRollsSource: CatalogSource = {
  key: 'carpet-rolls',
  load: async () => {
    const [products, res] = await Promise.all([activeProducts(), carpetRollsApi.list({ inStockOnly: true, limit: 1000 })]);
    const byId = new Map(products.map((p) => [p.id, p]));
    return res.items.map((r): CatalogEntry => {
      const p = byId.get(r.productId);
      const base = p ? fromProduct(p) : null;
      return {
        id: r.id, productId: r.productId, name: r.product?.name ?? base?.name ?? 'Carpet', price: r.salePricePerSqft || base?.price || 0, per: 'sqft',
        image: base?.image ?? null, images: base?.images, emoji: '🧶', description: base?.description,
        category: base?.category, brand: base?.brand, featured: base?.featured ?? false,
        inStock: r.remainingSqft > 0, stockNote: `${Math.round(r.remainingSqft)} sqft baqi`,
        chips: [{ label: `Roll ${r.rollNumber}`, tone: 'slate' }, ...(r.variant?.name ? [{ label: r.variant.name, tone: 'violet' as const }] : [])],
        specs: specs([
          ['Roll #', r.rollNumber], ['Design', r.designCode], ['Rang', r.variant?.color || r.variant?.name],
          ['Chorai', inches(r.widthFt, r.widthInch)], ['Baqi lambai', inches(r.remainingLengthFt, r.remainingLengthInch)],
          ['Baqi', `${r.remainingSqft.toFixed(1)} sqft`], ['Quality', r.quality], ['Pile', r.pile],
        ]),
        facets: { width: `${r.widthFt} ft` },
        keywords: [r.rollNumber, r.designCode, r.variant?.name].filter(Boolean).join(' '),
      };
    });
  },
};

export const carpetPiecesSource: CatalogSource = {
  key: 'carpet-pieces',
  load: async () => {
    const [products, res] = await Promise.all([activeProducts(), carpetCutPiecesApi.list({ status: 'AVAILABLE', limit: 500 })]);
    const byId = new Map(products.map((p) => [p.id, p]));
    return res.items.map((c): CatalogEntry => {
      const base = byId.get(c.productId) ? fromProduct(byId.get(c.productId)!) : null;
      const size = `${inches(c.widthFt, c.widthInch)} × ${inches(c.lengthFt, c.lengthInch)}`;
      return {
        id: c.id, productId: c.productId, name: `${c.product?.name ?? base?.name ?? 'Carpet'} · ${c.pieceCode}`, price: c.salePrice, per: 'piece',
        image: base?.image ?? null, images: base?.images, emoji: '🟫', category: base?.category, brand: base?.brand,
        featured: false, inStock: true, createdAt: c.createdAt,
        chips: [{ label: size, tone: 'slate' }, { label: `${c.totalSqft.toFixed(1)} sqft`, tone: 'blue' }],
        specs: specs([
          ['Piece #', c.pieceCode], ['Size', size], ['Raqba', `${c.totalSqft.toFixed(2)} sqft`],
          ['Rate', c.pricePerSqft ? `${formatPKR(c.pricePerSqft)} / sqft` : null], ['Rang', c.variant?.color || c.variant?.name], ['Halat', c.condition],
        ]),
        facets: { size: c.totalSqft < 20 ? 'small' : c.totalSqft < 60 ? 'medium' : 'large' },
        keywords: c.pieceCode,
      };
    });
  },
};

/* Agri: crop, season and use from the agri profile; expired registrations stay hidden. */

const agriGroup = (k: AgriKind) =>
  isSeedKind(k) ? 'seed' : isFertKind(k) ? 'fert' : isSprayKind(k) ? 'spray' : isFeedKind(k) ? 'feed' : isToolKind(k) ? 'tool' : 'other';

export const agriSource: CatalogSource = {
  key: 'agri',
  load: async () => {
    const [products, profiles] = await Promise.all([activeProducts(), optional(agriProductsApi.list({}), [] as AgriProductProfile[])]);
    const byProduct = new Map((Array.isArray(profiles) ? profiles : []).map((a) => [a.productId, a]));
    const out: CatalogEntry[] = [];
    for (const p of products) {
      const e = fromProduct(p);
      const a = byProduct.get(p.id);
      const kind = (a?.category as AgriKind | undefined) ?? deriveAgriKind(p.category?.name, p.name);
      // Selling a spray, seed or fertilizer after its registration ends is not allowed.
      if (needsGovtReg(kind) && certStatus(a?.govtRegExpiry).state === 'expired') continue;
      const unit = agriUnitLabel(p.unit || 'bag');
      const pack = Number(a?.packSize || 0) > 0 && !isMeasured(p.unit || 'bag') ? Number(a?.packSize) : 0;
      const season = SEASONS.find((s) => s.v === a?.season);
      out.push({
        ...e,
        per: unit,
        image: e.image ?? a?.imageUrls?.[0] ?? null,
        emoji: AGRI_KIND_EMOJI[kind] ?? '🌾',
        description: a?.descriptionLong || e.description,
        brand: a?.brand || e.brand,
        featured: e.featured || !!a?.isFeatured,
        badges: [
          ...(a?.isBestSeller ? [{ label: 'Best', tone: 'pink' as const }] : []),
          ...(a?.isOrganic ? [{ label: 'Organic', tone: 'green' as const }] : []),
        ],
        chips: [
          ...(pack ? [{ label: `1 ${unit} = ${pack} ${a?.packUnit || 'kg'}`, tone: 'slate' as const }] : []),
          ...(season ? [{ label: `${season.e} ${season.l}`, tone: 'amber' as const }] : []),
          ...(a?.isRestricted || a?.requiresLicense ? [{ label: 'License chahiye', tone: 'red' as const }] : []),
          ...(a?.bulkDiscountPct && a.bulkDiscountThreshold ? [{ label: `${a.bulkDiscountThreshold}+ par ${a.bulkDiscountPct}% chhoot`, tone: 'green' as const }] : []),
        ],
        specs: specs([
          ['Qisam', prettyAgriKind(kind)],
          ['Fasal', a?.targetCrops?.join(', ')],
          ['Keeray / bimari', a?.targetPests?.join(', ')],
          ['Janwar', a?.targetAnimals?.join(', ')],
          ['Mausam', season ? `${season.l} — ${season.hint}` : null],
          ['NPK', a?.npkRatio],
          ['Asal dawa', a?.activeIngredient],
          ['Kitna dalein', a?.applicationRate],
          ['Kaise dalein', a?.applicationMethod],
          ['Pack', pack ? `${pack} ${a?.packUnit || 'kg'} — ${formatPKR(e.price / pack)} / ${a?.packUnit || 'kg'}` : null],
          ['Ehtiyat', a?.toxicityLevel],
          ['Khet me dobara', a?.reEntryPeriod ? `${a.reEntryPeriod} din baad` : null],
          ['Katai se pehle', a?.ppePeriod ? `${a.ppePeriod} din chhor dein` : null],
          ['Rakhne ka tareeqa', a?.storageInstructions],
          ['Mulk', a?.countryOfOrigin],
        ]),
        includes: a?.usageInstructions ? [a.usageInstructions] : undefined,
        facets: { ...e.facets, kind: agriGroup(kind), crop: (a?.targetCrops ?? []).map((c) => c.trim()).filter(Boolean), ...(a?.season ? { season: a.season } : {}) },
        keywords: [e.keywords, a?.activeIngredient, a?.npkRatio, ...(a?.targetPests ?? [])].filter(Boolean).join(' '),
      });
    }
    return out;
  },
};

/**
 * Industry details for the product catalog. Electronics and bakery keep extra
 * facts about a product in their own profile tables (condition, serials,
 * warranty, shelf life). This loads them once per request so the catalog can
 * filter and count on them over the whole catalog and attach them to items.
 * A tenant without such profiles gets empty maps and pays two cheap queries.
 */

import { PrismaService } from '../../../prisma/prisma.service';

export interface ElectronicsFacts {
  condition: string;
  categoryType: string | null;
  warrantyMonths: number;
  mrp: number | null;
  model: string | null;
  brandId: string | null;
  tracked: boolean;
  serials: number;
}

export interface BakeryFacts {
  kind: 'made' | 'bought';
  category: string;
  shelfLifeDays: number | null;
  shelfLifeHours: number | null;
  fridge: boolean;
}

export interface CatalogExtensions {
  electronics: Map<string, ElectronicsFacts>;
  bakery: Map<string, BakeryFacts>;
  tags: Map<string, string[]>;
}

export async function loadExtensions(prisma: PrismaService, tenantId: string, shopId?: string): Promise<CatalogExtensions> {
  const [elec, serials, bakery, tags] = await Promise.all([
    prisma.electronicsProductProfile.findMany({
      where: { tenantId },
      select: {
        productId: true, conditionType: true, categoryType: true, warrantyMonths: true, mrp: true,
        modelNumber: true, partNumber: true, brandId: true, requiresSerial: true, hasImei: true,
      },
    }),
    prisma.electronicsSerialTracking.groupBy({
      by: ['productId'],
      where: { tenantId, status: 'IN_STOCK', ...(shopId && { shopId }) },
      _count: { _all: true },
    }),
    prisma.bakeryProductProfile.findMany({
      where: { tenantId },
      select: {
        productId: true, category: true, isCustomizable: true, isCakeCustomizable: true,
        shelfLifeDays: true, shelfLifeHours: true, requiresRefrigeration: true,
      },
    }),
    prisma.productTag.findMany({ where: { tag: { tenantId } }, select: { productId: true, tagId: true } }),
  ]);

  const serialCount = new Map(serials.map((s) => [s.productId, s._count._all]));
  const tagMap = new Map<string, string[]>();
  for (const t of tags) tagMap.set(t.productId, [...(tagMap.get(t.productId) ?? []), t.tagId]);

  return {
    electronics: new Map(elec.map((e) => [e.productId, {
      condition: e.conditionType,
      categoryType: e.categoryType,
      warrantyMonths: e.warrantyMonths,
      mrp: e.mrp,
      model: e.modelNumber || e.partNumber || null,
      brandId: e.brandId,
      tracked: e.requiresSerial || e.hasImei,
      serials: serialCount.get(e.productId) ?? 0,
    }])),
    bakery: new Map(bakery.map((b) => [b.productId, {
      kind: b.isCustomizable || b.isCakeCustomizable ? 'made' : 'bought',
      category: b.category,
      shelfLifeDays: b.shelfLifeDays,
      shelfLifeHours: b.shelfLifeHours,
      fridge: b.requiresRefrigeration,
    }])),
    tags: tagMap,
  };
}

type Fitment = { makeName?: string | null; modelName?: string | null; yearFrom?: number | null; yearTo?: number | null };

/**
 * Extra words the text search matches per product, from industry profiles:
 * part, OEM and alternate numbers plus fitment ("Toyota Corolla 2014-2020")
 * for auto parts; generic (salt) names and schedule for medicines. Loaded only
 * when there is a search term.
 */
export async function loadSearchWords(prisma: PrismaService, tenantId: string): Promise<Map<string, string>> {
  const [parts, salts, medicines] = await Promise.all([
    prisma.autoPartProfile.findMany({
      where: { tenantId },
      select: { productId: true, partNumber: true, oemNumber: true, alternateNumbers: true, compatibility: true },
    }),
    prisma.productSalt.findMany({
      where: { product: { tenantId } },
      select: { productId: true, salt: { select: { name: true, genericName: true } } },
    }),
    prisma.pharmacyMedicine.findMany({ where: { tenantId }, select: { productId: true, scheduleClass: true } }),
  ]);
  const words = new Map<string, string[]>();
  const add = (id: string, ...w: Array<string | null | undefined>) => {
    const clean = w.filter((x): x is string => !!x && !!x.trim());
    if (clean.length) words.set(id, [...(words.get(id) ?? []), ...clean]);
  };
  for (const p of parts) {
    const c = p.compatibility as { fitments?: Fitment[] } | Fitment[] | null;
    const fits: Fitment[] = Array.isArray(c) ? c : Array.isArray(c?.fitments) ? c.fitments : [];
    add(p.productId, p.partNumber, p.oemNumber, ...p.alternateNumbers,
      ...fits.map((f) => [f.makeName, f.modelName, f.yearFrom && f.yearTo ? `${f.yearFrom}-${f.yearTo}` : f.yearFrom ?? f.yearTo ?? null].filter(Boolean).join(' ')));
  }
  for (const s of salts) add(s.productId, s.salt.name, s.salt.genericName);
  for (const m of medicines) add(m.productId, m.scheduleClass);
  return new Map([...words].map(([id, w]) => [id, w.join(' ').toLowerCase()]));
}

/** Industry filters accepted by the catalog. Each narrows to products whose profile matches. */
export interface ExtensionQuery {
  tagId?: string;
  condition?: string;
  etype?: string;
  serial?: 'tracked' | 'mismatch';
  kind?: 'made' | 'bought';
}

export function matchesExtensions(x: CatalogExtensions, id: string, stock: number, q: ExtensionQuery): boolean {
  if (q.tagId) {
    const t = x.tags.get(id) ?? [];
    if (q.tagId === 'none' ? t.length > 0 : !t.includes(q.tagId)) return false;
  }
  const e = x.electronics.get(id);
  if (q.condition && e?.condition !== q.condition) return false;
  if (q.etype && (q.etype === 'none' ? !!e?.categoryType : e?.categoryType !== q.etype)) return false;
  if (q.serial === 'tracked' && !e?.tracked) return false;
  if (q.serial === 'mismatch' && !(e?.tracked && Math.round(stock) !== e.serials)) return false;
  if (q.kind && (x.bakery.get(id)?.kind ?? 'bought') !== q.kind) return false;
  return true;
}

/** Counts per option over the given products, for filter chips. */
export function extensionFacets(x: CatalogExtensions, rows: Array<{ id: string; stock: number }>) {
  const tally = (m: Map<string, number>, k: string | null | undefined) => { if (k) m.set(k, (m.get(k) ?? 0) + 1); };
  const tags = new Map<string, number>();
  const conditions = new Map<string, number>();
  const etypes = new Map<string, number>();
  const kinds = new Map<string, number>();
  let tracked = 0;
  let mismatch = 0;
  for (const r of rows) {
    for (const t of x.tags.get(r.id) ?? []) tally(tags, t);
    const e = x.electronics.get(r.id);
    if (e) {
      tally(conditions, e.condition);
      tally(etypes, e.categoryType ?? 'none');
      if (e.tracked) { tracked += 1; if (Math.round(r.stock) !== e.serials) mismatch += 1; }
    }
    if (x.bakery.size) tally(kinds, x.bakery.get(r.id)?.kind ?? 'bought');
  }
  const list = (m: Map<string, number>) => [...m.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
  return {
    tags: list(tags),
    conditions: list(conditions),
    etypes: list(etypes),
    kinds: list(kinds),
    serial: { tracked, mismatch },
  };
}

/** Industry facts for one product, attached to catalog items. */
export function itemExtensions(x: CatalogExtensions, id: string) {
  return {
    tagIds: x.tags.get(id) ?? [],
    electronics: x.electronics.get(id) ?? null,
    bakery: x.bakery.get(id) ?? null,
  };
}

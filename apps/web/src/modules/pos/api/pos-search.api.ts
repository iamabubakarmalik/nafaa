import { apiClient } from '@core/api/client';
import { db } from '@core/lib/offline/db';

export type PosSearchItemType = 'product' | 'roll' | 'cut_piece' | 'imei';

export interface PosSearchResult {
  type: PosSearchItemType;
  id: string;
  name: string;
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  variantColorHex?: string | null;
  variantImage?: string | null;
  price: number;
  unit: string;
  categoryName?: string | null;
  categoryColor?: string | null;
  primaryImage?: string | null;
  hasVariants?: boolean;
  stock?: number;
  lowStockAlert?: number;
  isFeatured?: boolean;
  wholesalePrice?: number | null;
  sku?: string | null;
  barcode?: string | null;
  rollNumber?: string;
  designCode?: string | null;
  widthFt?: number;
  widthInch?: number;
  remainingLengthFt?: number;
  remainingLengthInch?: number;
  remainingSqft?: number;
  salePricePerSqft?: number;
  wholesalePricePerSqft?: number | null;
  rackNumber?: string | null;
  pieceCode?: string;
  cutWidthFt?: number;
  cutLengthFt?: number;
  cutTotalSqft?: number;
  sourceRollNumber?: string | null;
  condition?: string | null;
  imei1?: string;
  imei2?: string | null;
  ptaStatus?: string;
}

function unwrapArr<T>(res: any): T[] {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

const isNetFail = (e: any): boolean => {
  const s = e?.response?.status;
  return !s || s === 0 || s === 408 || s >= 502;
};

/* ══ OFFLINE SEARCH — Dexie se products, IMEI, carpet rolls/pieces ══ */

function scoreProduct(p: any, q: string): number {
  let score = 0;
  const name = (p.name || '').toLowerCase();
  const barcode = (p.barcode || '').toLowerCase();
  const sku = (p.sku || '').toLowerCase();
  if (barcode === q) score += 1000;
  if (sku === q) score += 900;
  if (name === q) score += 800;
  if (name.startsWith(q)) score += 500;
  if (name.includes(q)) score += 300;
  if (barcode.includes(q)) score += 200;
  if (sku.includes(q)) score += 150;
  return score;
}

async function offlineSearch(query: string, limit: number): Promise<PosSearchResult[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: PosSearchResult[] = [];

  // ── Products ──
  const products = (await db.products.toArray()).filter(
    (p: any) => !p._localDeleted && p.isActive !== false,
  );
  const scored = products
    .map((p: any) => ({ p, score: scoreProduct(p, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const { p } of scored) {
    results.push({
      type: 'product',
      id: p.id,
      name: p.name,
      productId: p.id,
      productName: p.name,
      variantId: null,
      variantName: null,
      price: p.price ?? 0,
      unit: p.unit || 'pcs',
      categoryName: p.category?.name ?? null,
      categoryColor: p.category?.color ?? null,
      primaryImage: p.images?.[0]?.url ?? null,
      hasVariants: !!p.hasVariants,
      stock: p.stock ?? 0,
      lowStockAlert: p.lowStockAlert ?? 0,
      isFeatured: !!p.isFeatured,
      wholesalePrice: p.wholesalePrice ?? null,
      sku: p.sku ?? null,
      barcode: p.barcode ?? null,
    });
  }

  // ── Carpet rolls (if cached) ──
  try {
    const { getMeta } = await import('@core/lib/offline/db');
    const cachedRolls = await getMeta<any[]>('cached-carpet-rolls');
    if (Array.isArray(cachedRolls)) {
      const rollMatches = cachedRolls
        .filter((r: any) =>
          (r.rollNumber || '').toLowerCase().includes(q) ||
          (r.designCode || '').toLowerCase().includes(q) ||
          (r.product?.name || '').toLowerCase().includes(q),
        )
        .slice(0, 20);
      for (const r of rollMatches) {
        results.push({
          type: 'roll',
          id: r.id,
          name: r.rollNumber,
          productId: r.productId,
          productName: r.product?.name || 'Carpet',
          price: r.salePricePerSqft ?? 0,
          unit: 'sqft',
          rollNumber: r.rollNumber,
          designCode: r.designCode,
          widthFt: r.widthFt,
          remainingLengthFt: r.remainingLengthFt,
          remainingSqft: r.remainingSqft,
          salePricePerSqft: r.salePricePerSqft,
          rackNumber: r.rackNumber,
        });
      }
    }
    const cachedPieces = await getMeta<any[]>('cached-carpet-cut-pieces');
    if (Array.isArray(cachedPieces)) {
      const pieceMatches = cachedPieces
        .filter((p: any) => (p.pieceCode || '').toLowerCase().includes(q))
        .slice(0, 20);
      for (const p of pieceMatches) {
        results.push({
          type: 'cut_piece',
          id: p.id,
          name: p.pieceCode,
          productId: p.productId || p.id,
          productName: p.product?.name || 'Cut piece',
          price: p.salePrice ?? 0,
          unit: 'piece',
          pieceCode: p.pieceCode,
          cutWidthFt: p.widthFt,
          cutLengthFt: p.lengthFt,
          cutTotalSqft: p.totalSqft,
          sourceRollNumber: p.sourceRoll?.rollNumber ?? null,
          condition: p.condition ?? null,
        });
      }
    }
  } catch {}

  return results.slice(0, limit);
}

export const posSearchApi = {
  /**
   * Universal search — server first, offline pe Dexie.
   */
  search: async (query: string, limit = 50): Promise<PosSearchResult[]> => {
    if (navigator.onLine) {
      try {
        const res = await apiClient.get('/pos/universal-search', { params: { q: query, limit } });
        const serverHits = unwrapArr<PosSearchResult>(res);
        if (serverHits.length > 0) return serverHits;
        // Server ne kuch nahi diya — Dexie try karo (shayad naya product offline bana)
        return offlineSearch(query, limit);
      } catch (e) {
        if (!isNetFail(e)) return [];
        // Network fail → offline search
      }
    }
    return offlineSearch(query, limit);
  },
};

import { db } from './db';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import { carpetCutPiecesApi } from '@/features/industries/carpet/api/carpet-cut-pieces.api';

interface CachedRoll {
  id: string;
  productId: string;
  variantId?: string | null;
  rollNumber: string;
  widthFt: number;
  widthInch: number;
  lengthFt: number;
  totalSqft: number;
  salePricePerSqft: number;
  wholesalePricePerSqft?: number | null;
  status: string;
  _cachedAt: number;
}

interface CachedCutPiece {
  id: string;
  productId: string;
  pieceCode: string;
  widthFt: number;
  lengthFt: number;
  totalSqft: number;
  salePrice: number;
  status: string;
  _cachedAt: number;
}

const ROLLS_CACHE_KEY = 'carpet-rolls-cache';
const CUT_PIECES_CACHE_KEY = 'carpet-cut-pieces-cache';

/**
 * Download all carpet rolls + cut pieces for offline use
 */
export async function downloadCarpetData(): Promise<void> {
  if (!navigator.onLine) return;

  try {
    // Fetch all active rolls
    const rolls = await carpetRollsApi.list({ status: 'ACTIVE' as any });
    const rollList = Array.isArray(rolls) ? rolls : (rolls as any)?.items || [];
    
    const cachedRolls: CachedRoll[] = rollList.map((r: any) => ({
      id: r.id,
      productId: r.productId,
      variantId: r.variantId,
      rollNumber: r.rollNumber,
      widthFt: Number(r.widthFt) || 0,
      widthInch: Number(r.widthInch) || 0,
      lengthFt: Number(r.lengthFt) || 0,
      totalSqft: Number(r.totalSqft) || 0,
      salePricePerSqft: Number(r.salePricePerSqft) || 0,
      wholesalePricePerSqft: r.wholesalePricePerSqft ? Number(r.wholesalePricePerSqft) : null,
      status: r.status,
      _cachedAt: Date.now(),
    }));

    await db.meta.put({
      key: ROLLS_CACHE_KEY,
      value: cachedRolls,
      updatedAt: Date.now(),
    });

    console.log(`[offline-carpet] Cached ${cachedRolls.length} rolls`);

    // Fetch cut pieces
    try {
      const cutPieces = await carpetCutPiecesApi.list({ status: 'AVAILABLE' } as any);
      const pieceList = Array.isArray(cutPieces) ? cutPieces : (cutPieces as any)?.items || [];

      const cachedPieces: CachedCutPiece[] = pieceList.map((p: any) => ({
        id: p.id,
        productId: p.productId,
        pieceCode: p.pieceCode,
        widthFt: Number(p.widthFt) || 0,
        lengthFt: Number(p.lengthFt) || 0,
        totalSqft: Number(p.totalSqft) || 0,
        salePrice: Number(p.salePrice) || 0,
        status: p.status,
        _cachedAt: Date.now(),
      }));

      await db.meta.put({
        key: CUT_PIECES_CACHE_KEY,
        value: cachedPieces,
        updatedAt: Date.now(),
      });

      console.log(`[offline-carpet] Cached ${cachedPieces.length} cut pieces`);
    } catch (e) {
      console.warn('[offline-carpet] Cut pieces cache failed', e);
    }
  } catch (e) {
    console.warn('[offline-carpet] Roll cache failed', e);
  }
}

/**
 * Get cached rolls for a specific product (works offline)
 */
export async function getCachedRollsForProduct(
  productId: string,
  variantId?: string,
): Promise<CachedRoll[]> {
  const entry = await db.meta.get(ROLLS_CACHE_KEY);
  if (!entry?.value) return [];

  const all = entry.value as CachedRoll[];
  return all.filter((r) => {
    if (r.productId !== productId) return false;
    if (r.status !== 'ACTIVE') return false;
    if (variantId && r.variantId !== variantId) return false;
    return r.totalSqft > 0;
  });
}

/**
 * Get cached cut pieces for a specific product
 */
export async function getCachedCutPieces(productId: string): Promise<CachedCutPiece[]> {
  const entry = await db.meta.get(CUT_PIECES_CACHE_KEY);
  if (!entry?.value) return [];

  const all = entry.value as CachedCutPiece[];
  return all.filter((p) => p.productId === productId && p.status === 'AVAILABLE');
}

/**
 * Locally decrement roll stock after offline sale.
 * This keeps UI consistent until real sync happens.
 */
export async function decrementCachedRoll(rollId: string, lengthFtUsed: number): Promise<void> {
  const entry = await db.meta.get(ROLLS_CACHE_KEY);
  if (!entry?.value) return;

  const all = entry.value as CachedRoll[];
  const updated = all.map((r) => {
    if (r.id !== rollId) return r;
    const newLength = Math.max(0, r.lengthFt - lengthFtUsed);
    const fullWidth = r.widthFt + r.widthInch / 12;
    return {
      ...r,
      lengthFt: newLength,
      totalSqft: Math.max(0, newLength * fullWidth),
    };
  });

  await db.meta.put({
    key: ROLLS_CACHE_KEY,
    value: updated,
    updatedAt: Date.now(),
  });
}

/**
 * Mark cached cut piece as sold (UI consistency)
 */
export async function markCachedCutPieceSold(pieceId: string): Promise<void> {
  const entry = await db.meta.get(CUT_PIECES_CACHE_KEY);
  if (!entry?.value) return;

  const all = entry.value as CachedCutPiece[];
  const updated = all.map((p) =>
    p.id === pieceId ? { ...p, status: 'SOLD' } : p,
  );

  await db.meta.put({
    key: CUT_PIECES_CACHE_KEY,
    value: updated,
    updatedAt: Date.now(),
  });
}

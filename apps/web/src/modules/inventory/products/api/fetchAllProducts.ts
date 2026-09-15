import { productsApi, type Product } from './products.api';

/* ═════════════════════════════════════════════════════════════
   SARAY PRODUCTS — chahe kitne bhi hon
   ─────────────────────────────────────────────────────────────
   Products ka safha `limit: 1000` maang raha tha. Jis dukaan ke
   1054 products thay, uske 54 product safhe par nazar hi nahi
   aate thay — POS me dikhte thay, yahan nahi. Stock ki qeemat,
   "kam ho gaya" ki ginti, CSV, print: sab is se ghalat ho rahe
   thay, aur kisi ko pata bhi nahi chalta tha kyunke koi paighaam
   nahi aata tha.

   Ab jaadui number nahi: pehla safha la kar `meta.totalPages`
   dekhte hain aur baqi safhe bhi le aate hain.
   ═════════════════════════════════════════════════════════════ */

/** Ek dafa me itne — bara chunk kam chakkar, magar server par bojh bhi kam */
const CHUNK = 500;

/** Bhaagti hui query se bachao — 50 × 500 = 25,000 products tak */
const MAX_PAGES = 50;

export interface AllProductsResult {
  items: Product[];
  total: number;
  /** Agar hadd lag gayi to true — safhe par bata dena chahiye */
  truncated: boolean;
}

export async function fetchAllProducts(
  params: Record<string, unknown> = {},
): Promise<AllProductsResult> {
  const first: any = await productsApi.list({ ...params, page: 1, limit: CHUNK } as any);

  // Kuch endpoints seedha array dete hain, kuch { items, meta }
  if (Array.isArray(first)) {
    return { items: first as Product[], total: first.length, truncated: false };
  }

  const items: Product[] = [...(first.items ?? [])];
  const total: number = first.meta?.total ?? items.length;
  const totalPages: number = first.meta?.totalPages ?? 1;

  const lastPage = Math.min(totalPages, MAX_PAGES);

  if (lastPage > 1) {
    // Baqi safhe ek sath — ek ke baad ek mangwane me der lagti hai
    const rest = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, i) =>
        productsApi.list({ ...params, page: i + 2, limit: CHUNK } as any),
      ),
    );
    for (const r of rest as any[]) {
      items.push(...(Array.isArray(r) ? r : r?.items ?? []));
    }
  }

  return { items, total, truncated: totalPages > MAX_PAGES };
}

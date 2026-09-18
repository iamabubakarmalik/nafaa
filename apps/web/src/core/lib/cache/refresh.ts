import type { QueryClient } from '@tanstack/react-query';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

/* ═════════════════════════════════════════════════════════════
   CACHE — "POS me purana data aa raha hai"
   ─────────────────────────────────────────────────────────────
   Masla ye tha ke har safhe ki apni query key hai — `products`,
   `retail-products`, `pos-products`, `bakery-products-pos`,
   `appliance-products-list`… poore app me darjnon. Jab kharidari
   hoti thi to sirf teen chaar key invalidate hoti thin, baqi
   apna purana data dikhati rehti thin.

   Naam ginn ginn kar likhna kaam nahi karta — koi na koi hamesha
   chhoot jata hai, aur naya safha banao to phir chhoot jata hai.

   Is liye yahan NAAM ke bajaye MAZMOON dekhte hain: jis query ki
   key me "product", "stock", "pos", "catalog" jaisa lafz ho, wo
   maal se mutalliq hai — use taaza kar do.
   ═════════════════════════════════════════════════════════════ */

/** Jis key me ye lafz ho, us ka taalluq maal/stock/daam se hai */
const STOCK_WORDS = /product|stock|pos|catalog|inventory|imei|serial|variant|batch|barcode|unit|low-stock|reorder/i;

/** Jis key me ye lafz ho, us ka taalluq paise se hai */
const MONEY_WORDS = /sale|purchase|expense|khata|ledger|customer|supplier|money|cash|profit|report|dashboard|summary|analytic/i;

function invalidateByWords(qc: QueryClient, re: RegExp) {
  qc.invalidateQueries({
    predicate: (q) => {
      const key = q.queryKey;
      // Key ka koi bhi hissa lafz se mile to kaafi hai
      return key.some((part) => typeof part === 'string' && re.test(part));
    },
  });
}

/**
 * Maal ya daam badla — har wo safha taaza karein jo maal dikhata hai.
 *
 * Offline cache bhi — POS usi se parhta hai, is liye sirf React Query
 * invalidate karna kaafi nahi hota.
 */
export async function refreshAfterStockChange(qc: QueryClient) {
  invalidateByWords(qc, STOCK_WORDS);
  // POS offline cache se parhta hai — us ka apna refresh alag hai
  try { await forceRefreshProducts(); } catch { /* offline — baad me khud sync hoga */ }
}

/** Paisa hila — bikri, kharidari, kharch, khata, reports */
export function refreshAfterMoneyChange(qc: QueryClient) {
  invalidateByWords(qc, MONEY_WORDS);
}

/**
 * Bikri, kharidari, wapsi — in me maal BHI hilta hai aur paisa BHI.
 * Aksar yehi chahiye hota hai.
 */
export async function refreshAfterSaleOrPurchase(qc: QueryClient) {
  invalidateByWords(qc, MONEY_WORDS);
  await refreshAfterStockChange(qc);
}

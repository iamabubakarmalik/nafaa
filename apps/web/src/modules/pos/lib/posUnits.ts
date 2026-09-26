/* ═════════════════════════════════════════════════════════════
   UNITS — piece, dozen, carton, kilo…
   ─────────────────────────────────────────────────────────────
   Har industry ka POS yehi chaar cheezein dobara likhta tha:
   unit ka emoji, wazan wali unit pehchanna, qty ka step, aur
   product + ProductUnit[] ko milakar ek list banana.

   Ek jagah rakhne ka asli faida ye hai ke jab nayi unit ka naam
   aata hai (jaise "tray" ya "bori"), wo ek hi jagah jurta hai
   aur har POS par chalne lagta hai.
   ═════════════════════════════════════════════════════════════ */

export interface PosUnitOption {
  id: string;
  unitName: string;
  label: string;
  emoji: string;
  /** 1 unit = kitni base units. Piece = 1, dozen = 12. */
  conversionRate: number;
  price: number;
  wholesalePrice?: number | null;
  isBase?: boolean;
  /** Is unit ka apna barcode — scan par seedha yehi line banti hai. */
  barcode?: string | null;
  sku?: string | null;
}

const UNIT_EMOJI: Record<string, string> = {
  kg: '⚖️', gram: '⚖️', g: '⚖️', liter: '🧴', ml: '🧴',
  pcs: '🔢', piece: '🔢', box: '📦', carton: '📦',
  dozen: '🥚', packet: '🎁', bag: '🛍️', bottle: '🍾',
  meter: '📏', feet: '📏', tray: '🥚', bori: '🛍️',
};

export const unitEmoji = (u: string) => UNIT_EMOJI[(u || '').toLowerCase()] ?? '📦';

/**
 * Wo units jinhen tukron me nahi gina jata.
 *
 * Inka barcode sirf "kaun si cheez" batata hai, "kitni" nahi — is liye
 * scan ke baad wazan poochna parta hai. 1 se seedha cart me daal dena
 * ghalat hota: 1 kg cheeni aur 250 gram cheeni ek jaisi scan hoti hain.
 */
const WEIGHT_UNITS = ['kg', 'gram', 'g', 'liter', 'litre', 'l', 'ml', 'meter', 'metre', 'm', 'feet', 'ft'];

export const isWeightUnit = (u: string) => WEIGHT_UNITS.includes((u || '').toLowerCase());

/** +/− button ek dafa me kitna badhaye — kilo me 1 ka step be-maani hai. */
export const qtyStep = (unitName: string) => {
  const u = (unitName || '').toLowerCase();
  if (u === 'kg' || u === 'liter' || u === 'meter') return 0.25;
  if (u === 'gram' || u === 'g' || u === 'ml') return 50;
  return 1;
};

/** Alag alag hijje ek hi unit par — "kilo", "kg", "Kilogram" sab ek. */
export function unitKeyOf(unitName: string): string {
  const u = (unitName || '').toLowerCase();
  if (['kg', 'kilo', 'kilogram'].includes(u)) return 'kg';
  if (['g', 'gram', 'grams'].includes(u)) return 'gram';
  if (['l', 'liter', 'litre'].includes(u)) return 'liter';
  if (u === 'ml') return 'ml';
  if (u === 'dozen') return 'dozen';
  if (['packet', 'pack'].includes(u)) return 'packet';
  if (u === 'box') return 'box';
  if (u === 'carton') return 'carton';
  if (u === 'bag') return 'bag';
  return u;
}

interface UnitSourceProduct {
  unit?: string | null;
  price: number;
  wholesalePrice?: number | null;
  barcode?: string | null;
  sku?: string | null;
}

/**
 * Product + uski ProductUnits → POS ki unit list.
 *
 * Pehli hamesha base unit hoti hai (product ka apna rate), uske baad
 * dozen/carton jo bhi banaye gaye hon. Jo unit base ke naam se hi mel
 * khati hai wo chhori jati hai — warna picker me "PCS" do dafa aata
 * tha aur dukaan-daar ko samajh hi nahi aata tha ke farq kya hai.
 */
export function derivePosUnits(
  product: UnitSourceProduct,
  apiUnits: any[] = [],
): PosUnitOption[] {
  const base = (product.unit || 'pcs').toLowerCase();
  const out: PosUnitOption[] = [{
    id: 'base',
    unitName: base,
    label: base.toUpperCase(),
    emoji: unitEmoji(base),
    conversionRate: 1,
    price: product.price,
    wholesalePrice: product.wholesalePrice ?? null,
    isBase: true,
    barcode: product.barcode ?? null,
    sku: product.sku ?? null,
  }];

  for (const u of apiUnits) {
    if (!u?.unitName || u.unitName.toLowerCase() === base) continue;
    out.push({
      id: u.id,
      unitName: u.unitName,
      label: (u.unitLabel || u.unitName).toUpperCase(),
      emoji: unitEmoji(u.unitName),
      conversionRate: Number(u.conversionRate) || 1,
      price: Number(u.price) || product.price,
      wholesalePrice: u.wholesalePrice ?? null,
      barcode: u.barcode ?? null,
      sku: u.sku ?? null,
    });
  }

  return out;
}

/**
 * Scanner ke liye naqsha: barcode → unit, aur SKU → unit.
 *
 * Do alag naqshe is liye ke tarteeb me farq hai. Unit ka barcode
 * product ke barcode se PEHLE dekhna chahiye (wohi asal me scan hua),
 * magar SKU BAAD me — kabhi kisi unit ka SKU kisi doosre product ke
 * barcode jaisa nikal aaye to product ka haq pehle hai.
 *
 * BASE unit dono naqshon se bahar hai: uska barcode aksar product wala
 * hi hota hai, aur agar wo yahan hota to product ka main barcode scan
 * karne par unit picker khulna band ho jata — dukaan-daar ko dozen
 * chunne ka mauqa hi na milta.
 */
export function buildUnitScanIndex(allUnits: any[]) {
  const byBarcode = new Map<string, any>();
  const bySku = new Map<string, any>();
  const byProduct = new Map<string, any[]>();
  const codesByProduct = new Map<string, string[]>();

  for (const u of allUnits) {
    const list = byProduct.get(u.productId);
    if (list) list.push(u);
    else byProduct.set(u.productId, [u]);

    const codes = codesByProduct.get(u.productId) ?? [];
    if (u.barcode) codes.push(String(u.barcode).toLowerCase());
    if (u.sku) codes.push(String(u.sku).toLowerCase());
    if (codes.length) codesByProduct.set(u.productId, codes);

    if (u.isBase) continue;
    if (u.barcode) byBarcode.set(String(u.barcode).trim().toLowerCase(), u);
    if (u.sku) bySku.set(String(u.sku).trim().toLowerCase(), u);
  }

  return { byBarcode, bySku, byProduct, codesByProduct };
}

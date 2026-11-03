/*
 * Copy of apps/api/src/modules/distribution/helpers/logistics.ts so the booker app
 * prices and warns offline exactly like the server. Keep the logic identical:
 * change the server file first, then copy it here.
 */

/**
 * Small pure helpers for loading and visits: base quantity shown as cartons
 * plus pieces, the distance between two GPS points, and order and load sheet
 * numbers.
 */

const r4 = (v: number) => Math.round((Number(v) || 0) * 10_000) / 10_000;

export interface PackSize {
  unitName: string;
  conversionRate: number;
}

export interface PackSplit {
  /** Biggest pack used (e.g. Carton) and how many whole packs. */
  packName: string | null;
  packSize: number | null;
  packs: number;
  /** Base units left over. */
  loose: number;
  /** e.g. "3 Carton + 5 pcs". */
  text: string;
}

/** Splits a base quantity into whole packs of the biggest pack and loose base units. */
export function splitPacks(baseQty: number, packs: PackSize[], baseUnit = 'pcs'): PackSplit {
  const qty = r4(baseQty);
  const big = [...packs].filter((p) => Number(p.conversionRate) > 1).sort((a, b) => b.conversionRate - a.conversionRate)[0];
  if (!big) return { packName: null, packSize: null, packs: 0, loose: qty, text: `${qty} ${baseUnit}` };
  const whole = Math.floor(qty / big.conversionRate + 1e-9);
  const loose = r4(qty - whole * big.conversionRate);
  const bits = [whole ? `${whole} ${big.unitName}` : '', loose ? `${loose} ${baseUnit}` : ''].filter(Boolean);
  return { packName: big.unitName, packSize: big.conversionRate, packs: whole, loose, text: bits.join(' + ') || `0 ${baseUnit}` };
}

/** Metres between two points (haversine). */
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(a))));
}

/** "SO-" + 6 digits, e.g. SO-000042. */
export function docNumber(prefix: string, seq: number): string {
  return `${prefix || ''}${String(seq).padStart(6, '0')}`;
}

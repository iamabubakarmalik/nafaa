/**
 * Shipping rates for a cart: pick the zone for the buyer's city/province,
 * then every rate of that zone that fits the order (weight or subtotal band),
 * with free-shipping thresholds applied.
 */
import { PK_CITIES, matchCity, sameCity } from '../../online-orders/pk-cities';
import { ShippingSettings, ShippingZone } from '../store-settings';

export interface QuotedRate {
  id: string;
  name: string;
  price: number;
  eta: string | null;
  codAvailable: boolean;
  codFee: number;
}

export const PROVINCES: Array<{ code: string; name: string }> = [
  { code: 'PB', name: 'Punjab' }, { code: 'SD', name: 'Sindh' }, { code: 'KP', name: 'Khyber Pakhtunkhwa' },
  { code: 'BA', name: 'Balochistan' }, { code: 'IS', name: 'Islamabad' }, { code: 'GB', name: 'Gilgit-Baltistan' },
  { code: 'AJK', name: 'Azad Kashmir' },
];

export function pkCityList() {
  return {
    provinces: PROVINCES,
    cities: [...PK_CITIES].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ name: c.name, province: c.province })),
  };
}

/** Province code from what the buyer picked or typed ("Punjab", "PB"). */
export function provinceCode(raw?: string | null): string | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s) return null;
  const p = PROVINCES.find((x) => x.code.toLowerCase() === s || x.name.toLowerCase() === s || (s.length > 3 && x.name.toLowerCase().startsWith(s)));
  return p?.code ?? null;
}

export function zoneFor(settings: ShippingSettings, city?: string | null, province?: string | null): ShippingZone | null {
  const matched = matchCity(city);
  const prov = matched?.province ?? provinceCode(province);
  const byCity = city ? settings.zones.find((z) => z.cities.some((c) => sameCity(c, city))) : null;
  if (byCity) return byCity;
  const byProvince = prov ? settings.zones.find((z) => z.provinces.includes(prov)) : null;
  if (byProvince) return byProvince;
  return settings.zones.find((z) => !z.cities.length && !z.provinces.length) ?? null;
}

export function quoteRates(settings: ShippingSettings, q: { city?: string | null; province?: string | null; subtotal: number; weightKg: number }): { zone: ShippingZone | null; rates: QuotedRate[] } {
  const zone = zoneFor(settings, q.city, q.province);
  if (!zone) return { zone: null, rates: [] };
  const freeAll = settings.freeShippingThreshold !== null && q.subtotal >= settings.freeShippingThreshold;
  const rates = zone.rates
    .filter((r) => {
      if (r.type === 'flat') return true;
      const v = r.type === 'weight' ? q.weightKg : q.subtotal;
      return (r.min === null || v >= r.min) && (r.max === null || v <= r.max);
    })
    .map((r) => ({
      id: `${zone.id}:${r.id}`,
      name: r.name,
      price: freeAll || (r.freeAbove !== null && q.subtotal >= r.freeAbove) ? 0 : r.price,
      eta: r.eta ?? zone.eta ?? settings.defaultEta,
      codAvailable: zone.codEnabled,
      codFee: zone.codEnabled ? zone.codFee ?? settings.codFee : 0,
    }))
    .sort((a, b) => a.price - b.price);
  return { zone, rates };
}

/** "Rs 450 more for free delivery" — null when there is no threshold or it is met. */
export function freeShippingGap(settings: ShippingSettings, subtotal: number): { threshold: number; remaining: number } | null {
  if (settings.freeShippingThreshold === null) return null;
  return { threshold: settings.freeShippingThreshold, remaining: Math.max(0, Math.round((settings.freeShippingThreshold - subtotal) * 100) / 100) };
}

/** Product weight in kg from its weight + unit (g, kg, lb); unknown units count as kg. */
export function weightKg(weight: number | null | undefined, unit?: string | null): number {
  const w = Number(weight ?? 0);
  if (!Number.isFinite(w) || w <= 0) return 0;
  const u = String(unit ?? 'kg').toLowerCase();
  if (u === 'g' || u === 'gm' || u === 'gram' || u === 'grams') return w / 1000;
  if (u === 'lb' || u === 'lbs') return w * 0.4536;
  return w;
}

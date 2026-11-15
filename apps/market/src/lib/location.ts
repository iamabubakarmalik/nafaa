/**
 * The customer's location, kept in the nm_loc cookie as JSON
 * { city, lat?, lng? } so server pages can sort shops by distance.
 */
export const LOC_COOKIE = 'nm_loc';

export interface Loc {
  city: string;
  lat?: number;
  lng?: number;
}

export function parseLoc(raw: string | undefined | null): Loc | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Loc;
    if (typeof v?.city !== 'string') return null;
    return {
      city: v.city.slice(0, 60),
      lat: Number.isFinite(v.lat) ? Number(v.lat) : undefined,
      lng: Number.isFinite(v.lng) ? Number(v.lng) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/geo: the visitor's approximate location from the hosting edge
 * (Vercel's x-vercel-ip-* headers), for the "You are here" point on the home
 * globe. Read here, on the server, so the home page itself stays static.
 *
 * Returns `{ lat, lon, city, country }` when the headers are present and `{}`
 * otherwise (local development, other hosts); the globe then falls back to
 * the browser time zone. Nothing is stored or logged, and the response is
 * never cached.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function num(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function GET(request: Request) {
  const h = request.headers;
  const lat = num(h.get('x-vercel-ip-latitude'));
  const lon = num(h.get('x-vercel-ip-longitude'));
  const cityRaw = h.get('x-vercel-ip-city');
  let city: string | undefined;
  try {
    city = cityRaw ? decodeURIComponent(cityRaw).slice(0, 60) : undefined;
  } catch {
    city = undefined;
  }
  const country = h.get('x-vercel-ip-country')?.slice(0, 2).toUpperCase() || undefined;
  const body = lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon, city, country } : {};
  return NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
}

import { CourierApiError } from './types';

const TIMEOUT_MS = 25_000;

/** Courier API call — timeout ke saath, JSON wapas (ya courier ka error) */
export async function courierFetch(url: string, init: RequestInit & { json?: unknown } = {}): Promise<{ status: number; body: any; res: Response }> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(rest.headers ?? {}) },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e: any) {
    throw new CourierApiError(e?.name === 'TimeoutError' ? 'Courier ka server jawab nahi de raha — thori der baad try karein' : 'Courier ke server se rabta nahi hua');
  }
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _text: text.slice(0, 300) };
  }
  return { status: res.status, body, res };
}

/** Shehar ka naam milane ke liye: "D.G. Khan" = "dg khan", "Isb" = "Islamabad" */
const ALIASES: Record<string, string> = {
  isb: 'islamabad', khi: 'karachi', lhr: 'lahore', pindi: 'rawalpindi', rwp: 'rawalpindi',
  fsd: 'faisalabad', lyallpur: 'faisalabad', pesh: 'peshawar', pew: 'peshawar', mux: 'multan',
  hyd: 'hyderabad', grw: 'gujranwala', skt: 'sialkot', qta: 'quetta',
};
export const cityKey = (s?: string | null) => {
  const k = String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return ALIASES[k] ?? k;
};

/**
 * Public safhon (order form, developer link) ke liye — login ke bagair.
 * apiClient istemal nahi karte: us ka 401 → login redirect yahan ghalat hai.
 */
const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');

export async function publicFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { Accept: 'application/json', ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body: any = await res.json().catch(() => null);
  if (!res.ok) {
    const m = body?.message ?? body?.error?.message ?? body?.data?.message;
    throw new Error(Array.isArray(m) ? m.join(', ') : typeof m === 'string' && m ? m : res.status === 429 ? 'Bahut jaldi — 1 minute baad try karein' : 'Kuch ghalat ho gaya');
  }
  return (body?.data !== undefined ? body.data : body) as T;
}

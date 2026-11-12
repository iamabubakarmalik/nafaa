/**
 * Browser → storefront calls. Every action is a POST to /api/sf/<action>;
 * the route handler adds the shop (from the host) and the cart/customer
 * cookies, then calls the Nafaa API. Errors come back as { error, code }.
 */
export class SfError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public body?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function sf<T>(action: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/sf/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    credentials: 'same-origin',
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) throw new SfError(String(json?.error ?? 'Request failed'), json?.code ? String(json.code) : undefined, res.status, json ?? undefined);
  return json as T;
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

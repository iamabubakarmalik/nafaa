/**
 * Browser helper for /api/m/<action> (app/api/m). Throws ClientError with the
 * HTTP status, the API's code (OUT_OF_STOCK, PRICE_CHANGED, SIGNIN, ...) and
 * a customer-safe message, or null when the page should use its own text.
 */
export class ClientError extends Error {
  constructor(public status: number, public userMessage: string | null, public code?: string) {
    super(userMessage ?? code ?? String(status));
  }
}

export async function m<T>(action: string, opts: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const q = opts.query ? `?${new URLSearchParams(opts.query)}` : '';
  let res: Response;
  try {
    res = await fetch(`/api/m/${action}${q}`, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ClientError(0, null, 'NETWORK');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ClientError(res.status, json.error ?? null, json.code);
  return ('data' in json ? json.data : json) as T;
}

export function isSignedIn(): boolean {
  return typeof document !== 'undefined' && /(?:^|;\s*)nm_in=1/.test(document.cookie);
}

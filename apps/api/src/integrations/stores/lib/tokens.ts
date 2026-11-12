/**
 * Small signed tokens for the storefront (preview, password access, order
 * pages, customer sessions). HMAC-SHA256 with the API secret; the payload is
 * readable, so it never carries secrets.
 */
import * as crypto from 'crypto';

const secret = () => `${process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'nafaa-dev-stores'}:stores`;

export type TokenKind = 'preview' | 'access' | 'order' | 'customer';

export function signToken(kind: TokenKind, payload: Record<string, string | number>, ttlMs: number): { token: string; expiresAt: Date } {
  const exp = Date.now() + ttlMs;
  const body = Buffer.from(JSON.stringify({ ...payload, k: kind, e: exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(`${kind}.${body}`).digest('base64url').slice(0, 32);
  return { token: `${body}.${sig}`, expiresAt: new Date(exp) };
}

export function readToken<T extends Record<string, unknown>>(kind: TokenKind, token: unknown): T | null {
  const [body, sig] = String(token ?? '').split('.');
  if (!body || !sig || body.length > 2000) return null;
  const expected = crypto.createHmac('sha256', secret()).update(`${kind}.${body}`).digest('base64url').slice(0, 32);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString()) as T & { k?: string; e?: number };
    if (data.k !== kind || typeof data.e !== 'number' || data.e < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/** Salted scrypt hash for the store password and login codes. */
export function hashSecret(value: string): string {
  const salt = crypto.randomBytes(12).toString('base64url');
  const h = crypto.scryptSync(String(value), salt, 32).toString('base64url');
  return `s1$${salt}$${h}`;
}

export function checkSecret(value: string, stored: string | null | undefined): boolean {
  const [v, salt, h] = String(stored ?? '').split('$');
  if (v !== 's1' || !salt || !h) return false;
  const got = crypto.scryptSync(String(value ?? ''), salt, 32);
  const want = Buffer.from(h, 'base64url');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

export const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');

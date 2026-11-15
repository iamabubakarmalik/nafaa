/**
 * Customer session for route handlers. The Market API's access token (15 min)
 * and refresh token (30 days) are kept in httpOnly cookies; nm_in is a plain
 * flag the browser reads to know someone is signed in. An expired access
 * token is refreshed through marketplace/auth/refresh and the call retried.
 */
import { cookies } from 'next/headers';
import { api, ApiError } from './api';
import type { AuthResult } from './types';

export const ACCESS_COOKIE = 'nm_at';
export const REFRESH_COOKIE = 'nm_rt';
export const SIGNED_IN_COOKIE = 'nm_in';

type Jar = Awaited<ReturnType<typeof cookies>>;

const secure = process.env.NODE_ENV === 'production';

export function setSession(jar: Jar, auth: Pick<AuthResult, 'accessToken' | 'refreshToken'>) {
  const base = { path: '/', sameSite: 'lax' as const, secure };
  jar.set(ACCESS_COOKIE, auth.accessToken, { ...base, httpOnly: true, maxAge: 14 * 60 });
  jar.set(REFRESH_COOKIE, auth.refreshToken, { ...base, httpOnly: true, maxAge: 30 * 24 * 3600 });
  jar.set(SIGNED_IN_COOKIE, '1', { ...base, maxAge: 30 * 24 * 3600 });
}

export function clearSession(jar: Jar) {
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  jar.delete(SIGNED_IN_COOKIE);
}

async function refresh(jar: Jar, rt: string): Promise<string | null> {
  try {
    const auth = await api.customer.refresh(rt);
    setSession(jar, auth);
    return auth.accessToken;
  } catch (e) {
    if (e instanceof ApiError && e.status >= 500) throw e;
    clearSession(jar);
    return null;
  }
}

/** Runs fn with a valid access token, refreshing once when needed. Throws 401 when signed out. */
export async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const jar = await cookies();
  const rt = jar.get(REFRESH_COOKIE)?.value;
  let at = jar.get(ACCESS_COOKIE)?.value ?? null;
  if (!at && rt) at = await refresh(jar, rt);
  if (!at) throw new ApiError(401, 'signin');
  try {
    return await fn(at);
  } catch (e) {
    if ((e as { status?: number }).status === 401 && rt) {
      const next = await refresh(jar, rt);
      if (next) return fn(next);
    }
    throw e;
  }
}

export async function refreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

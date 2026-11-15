/**
 * Starts Google sign-in: remembers where the customer was (nm_return) and
 * sends the browser to the API's Google OAuth route. The API redirects back
 * to MARKETPLACE_URL/auth/google/success with the tokens.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { MOCK } from '@/lib/api';

const API = (process.env.NAFAA_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');

export function GET(req: NextRequest) {
  const back = req.nextUrl.searchParams.get('next') || '/';
  const safe = back.startsWith('/') && !back.startsWith('//') ? back : '/';
  const target = MOCK
    ? new URL('/auth/google/success?access=mock-access&refresh=mock-refresh', req.url)
    : new URL(`${API}/marketplace/auth/google`);
  const res = NextResponse.redirect(target);
  res.cookies.set('nm_return', safe, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });
  return res;
}

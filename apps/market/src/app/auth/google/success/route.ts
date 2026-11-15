/**
 * Google sign-in return. The API passes the Market tokens in the query; they
 * move into httpOnly cookies at once and the customer goes back to the page
 * they started from. /auth/google/error lands on the login page with a notice.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { setSession } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const access = req.nextUrl.searchParams.get('access');
  const refresh = req.nextUrl.searchParams.get('refresh');
  const jar = await cookies();
  const back = jar.get('nm_return')?.value || '/';
  jar.delete('nm_return');
  if (!access || !refresh) return NextResponse.redirect(new URL('/login?google=failed', req.url));
  setSession(jar, { accessToken: access, refreshToken: refresh });
  return NextResponse.redirect(new URL(back, req.url));
}

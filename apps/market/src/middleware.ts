/**
 * Language routing. Pages live under app/[lang]:
 *   /...        → rewritten to /en/... (English, the default)
 *   /ur/...     → Urdu (RTL), served as is
 *   /roman/...  → Roman Urdu, served as is
 *   /en/...     → 308 to the bare path, so English has one URL
 * API bridges (/api), the Google sign-in return (/auth), metadata routes and
 * static files are left alone.
 */
import { NextResponse, type NextRequest } from 'next/server';

export const config = {
  matcher: ['/((?!api/|auth/|_next/|_vercel/|brand/|favicon\\.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\.[a-z0-9]{2,5}$).*)'],
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    const to = req.nextUrl.clone();
    to.pathname = pathname.slice(3) || '/';
    return NextResponse.redirect(to, 308);
  }
  if (/^\/(ur|roman)(\/|$)/.test(pathname)) return NextResponse.next();
  const to = req.nextUrl.clone();
  to.pathname = `/en${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(to);
}

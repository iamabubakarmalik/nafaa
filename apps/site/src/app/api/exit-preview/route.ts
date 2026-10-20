/**
 * GET /api/exit-preview?path (API-CONTRACT 7). Turns off draft mode, clears
 * the preview cookie and returns to `path`, or else to the page in the
 * Referer header (same site only), or else home.
 */
import { cookies, draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { PREVIEW, safeSitePath } from '@/lib/cms/preview';

export const dynamic = 'force-dynamic';

function refererPath(request: Request): string | null {
  const referer = request.headers.get('referer');
  if (!referer) return null;
  try {
    const from = new URL(referer);
    return from.host === new URL(request.url).host ? `${from.pathname}${from.search}` : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW.cookieName);
  const target = new URL(request.url).searchParams.get('path') ?? refererPath(request);
  redirect(safeSitePath(target));
}

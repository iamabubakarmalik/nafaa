/**
 * GET /api/preview?token&path (API-CONTRACT 7). Checks the token with the
 * API, turns on draft mode, stores the token in the httpOnly preview cookie
 * and redirects to the page. Only same-site paths are accepted.
 */
import { cookies, draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { validatePreviewToken } from '@/lib/cms/client';
import { PREVIEW, previewCookieOptions, safeSitePath } from '@/lib/cms/preview';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) return new Response('Missing preview token.', { status: 401 });

  const validation = await validatePreviewToken(token).catch(() => null);
  if (!validation) return new Response('This preview link is invalid or has expired. Create a new one in the admin.', { status: 401 });

  (await draftMode()).enable();
  (await cookies()).set(PREVIEW.cookieName, token, previewCookieOptions(validation.expiresAt));
  redirect(safeSitePath(url.searchParams.get('path'), validation.path));
}

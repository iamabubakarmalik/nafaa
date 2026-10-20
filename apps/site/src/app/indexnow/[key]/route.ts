/**
 * IndexNow key file (ARCH 9). next.config rewrites /<key>.txt here; the API
 * pings with keyLocation <site>/<key>.txt. Answers with the key only when it
 * matches settings `seo.indexNowKey` (once PublicLayout carries it) or, until
 * then, the `INDEXNOW_KEY` env var, which must equal `seo.indexNowKey`.
 */
import { getLayout } from '@/lib/cms/client';

export const revalidate = 86400;

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key.replace(/\.txt$/, '');
  const layout = await getLayout();
  const indexNowKey = layout.indexNowKey || process.env.INDEXNOW_KEY?.trim();
  if (!indexNowKey || key !== indexNowKey) return notFoundResponse();
  return new Response(indexNowKey, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

function notFoundResponse() {
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

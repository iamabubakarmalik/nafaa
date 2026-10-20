/**
 * IndexNow key file (ARCH 9). next.config rewrites /<key>.txt here (F2 owns
 * that rewrite; see the S1 report). Answers with the key only when it matches
 * settings `seo.indexNowKey`, which PublicLayout does not carry yet
 * (`indexNowKey` proposed to A1); until then it is a 404.
 */
import { getLayout } from '@/lib/cms/client';

export const revalidate = 86400;

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const key = (await params).key.replace(/\.txt$/, '');
  const { indexNowKey } = await getLayout();
  if (!indexNowKey || key !== indexNowKey) return notFoundResponse();
  return new Response(indexNowKey, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

function notFoundResponse() {
  return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

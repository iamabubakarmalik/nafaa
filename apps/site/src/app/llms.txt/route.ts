/** /llms.txt (ARCH 10), rendered from GET /public/site/llms. Tags: llms, plans, settings. */
import { getLlms } from '@/lib/cms/client';
import { renderLlmsTxt } from '@/lib/llms/render';

export const revalidate = 86400;

export async function GET() {
  const payload = await getLlms();
  return new Response(renderLlmsTxt(payload), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

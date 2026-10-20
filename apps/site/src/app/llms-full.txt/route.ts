/** /llms-full.txt (ARCH 10): llms.txt plus money-page answers, key facts and FAQs, capped at 500 KB. */
import { getLlms } from '@/lib/cms/client';
import { renderLlmsFullTxt } from '@/lib/llms/render';

export const revalidate = 86400;

export async function GET() {
  const payload = await getLlms();
  return new Response(renderLlmsFullTxt(payload), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

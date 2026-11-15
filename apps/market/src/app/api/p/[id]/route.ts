/** Public product detail for the browser (options sheet on shop pages). Cached like the product page. */
import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return NextResponse.json({ error: null }, { status: 404 });
  try {
    const p = await api.product(id);
    if (!p) return NextResponse.json({ error: null }, { status: 404 });
    return NextResponse.json({ data: p }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ error: null, code: 'NETWORK' }, { status: 503 });
  }
}

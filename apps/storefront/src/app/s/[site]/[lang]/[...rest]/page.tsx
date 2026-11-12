import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { site, type SiteParams } from '@/lib/store';

/**
 * Anything no route matched: look up the shop's redirects (imported from
 * Shopify or added by the merchant) so old links and Google results keep
 * working, else 404.
 */
export default async function CatchAll({ params }: { params: Promise<SiteParams & { rest: string[] }> }) {
  const p = await params;
  const ctx = await site(p);
  if (ctx.blocked) return null;
  const path = `/${p.rest.map(decodeURIComponent).join('/')}`;
  const r = await api.redirect(ctx.storeId, path);
  if (r?.to) {
    const to = /^https?:/.test(r.to) ? r.to : ctx.lang === 'ur' ? `/ur${r.to}` : r.to;
    if (r.permanent) permanentRedirect(to);
    redirect(to);
  }
  notFound();
}

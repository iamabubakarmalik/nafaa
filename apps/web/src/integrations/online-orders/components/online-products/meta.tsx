/**
 * Shared bits for the Online products page: the channel mark (the
 * platform's logo), labels and keys.
 */

import type { QueryClient } from '@tanstack/react-query';
import { BrandLogo, brandColor, brandForChannel, brandLabel, type BrandName } from '@/assets/brands/BrandLogo';
import { ONLINE_PRODUCTS_KEY, type LastPush, type OnlineChannel, type PriceRule } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { t } from '@core/i18n';

type ChannelLike = Pick<OnlineChannel, 'type'> & Partial<Pick<OnlineChannel, 'mode' | 'platform'>>;

/** Logo for a channel: Indolj and custom websites are CUSTOM_WEBSITE, told apart by mode/platform. */
export const brandOf = (c: ChannelLike): BrandName => brandForChannel(c.type, { indolj: c.mode === 'indolj', platform: c.platform });

export const kindOf = (c: ChannelLike) => {
  const b = brandOf(c);
  return { label: c.mode === 'website' ? t('Apni website') : brandLabel(b), color: brandColor(b) };
};

export function ChannelMark({ channel, size = 'md', className }: { channel: ChannelLike; size?: 'sm' | 'md'; className?: string }) {
  return <BrandLogo name={brandOf(channel)} size={size === 'sm' ? 24 : 36} className={className} />;
}

export const rs = (n: number | null | undefined) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-PK')}`;

/** "Nafaa price + 10% · 9 par khatam" */
export function ruleText(rule: PriceRule): string {
  const parts: string[] = [];
  if (rule.mode === 'NONE' || !rule.value) parts.push(t('Nafaa price'));
  else if (rule.mode === 'PERCENT') parts.push(t('Nafaa price {{value}} {{value2}}%', { value: rule.value > 0 ? '+' : '−', value2: Math.abs(rule.value) }));
  else parts.push(t('Nafaa price {{value}} {{rs}}', { value: rule.value > 0 ? '+' : '−', rs: rs(Math.abs(rule.value)) }));
  if (rule.rounding === 'NEAREST_10') parts.push(t('10 ke qareeb'));
  if (rule.rounding === 'END_9') parts.push(t('9 par khatam'));
  return parts.join(' · ');
}

/** Where the channel's price comes from, in one short line. */
export function priceText(c: OnlineChannel): string {
  if (c.mode === 'indolj') return t('Price Indolj panel se badlein');
  if (c.mode === 'website') return t('Nafaa price — website khud leti hai');
  return c.pushPrice ? ruleText(c.priceRule) : t('Channel par haath se badlein');
}

/** Where the channel's stock comes from, in one short line. */
export function stockText(c: OnlineChannel): string {
  if (c.mode === 'indolj') return t('Stock Indolj par track nahi');
  const kept = c.stockBuffer ? t(', {{stockBuffer}} rakh kar', { stockBuffer: c.stockBuffer }) : '';
  if (c.mode === 'website') return t('Website Nafaa se leti hai{{kept}}', { kept });
  if (c.canPush && !c.pushStock) return t('Bhejna band hai — channel par haath se');
  if (c.stockMode === 'PERCENT') return t('Nafaa Stock ka {{percent}}%{{kept}}', { percent: c.stockPercent, kept });
  if (c.stockMode === 'FIXED') return t('Har product {{fixed}} (fixed){{kept}}', { fixed: c.stockFixed, kept });
  return c.stockBuffer ? t('Nafaa se{{kept}}', { kept }) : t('Nafaa se, poora');
}

export const WEBSITE_LINKS_NOTE = t('Ye website apne products khud bhejti hai — order aane par ya CSV se jurte hain');

export const channelName = (c: OnlineChannel) => c.name || kindOf(c).label;

const PUSH_WHAT: Record<LastPush['what'][number], () => string> = {
  stock: () => t('Stock'), price: () => t('Price'), content: () => t('Content'), status: () => t('Listed'), publish: () => t('Publish'),
};

/** "Stock, Price · 5 min pehle · theek" */
export function lastPushText(p: LastPush | null | undefined): string | null {
  if (!p?.at) return null;
  const what = (p.what ?? []).map((w) => PUSH_WHAT[w]?.() ?? w).join(', ');
  return t('Aakhri push: {{what}} · {{when}} · {{result}}', { what, when: timeAgo(p.at), result: p.ok ? t('theek') : t('nahi gaya') });
}

/** Everything the page shows after a link, price or sync change. */
export function refreshOnlineProducts(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: [ONLINE_PRODUCTS_KEY] });
  qc.invalidateQueries({ queryKey: ['channel-catalog'] });
}

/** Link to the product in the channel's own admin, where one can be built. */
export function channelProductUrl(c: OnlineChannel, externalProductId?: string | null): string | null {
  if (!externalProductId || !c.siteUrl) return null;
  const base = (c.siteUrl.startsWith('http') ? c.siteUrl : `https://${c.siteUrl}`).replace(/\/+$/, '');
  const id = String(externalProductId).replace(/^gid:\/\/shopify\/Product\//, '');
  if (c.type === 'SHOPIFY') return `${base}/admin/products/${id}`;
  if (c.type === 'WOOCOMMERCE') return `${base}/wp-admin/post.php?post=${id}&action=edit`;
  return null;
}

/** Stock split for one product or size: the channels Nafaa sends stock to and what each gets. */
export function stockSplit(row: { nafaaStock: number | null; cells: Record<string, import('../../api/online-products.api').GridCell> }, cols: OnlineChannel[]) {
  const parts = cols
    .filter((c) => c.canPush && c.tracksStock && row.cells[c.id]?.linked)
    .map((c) => {
      const cell = row.cells[c.id] as import('../../api/online-products.api').LinkedCell;
      return { channel: c, qty: cell.listed === false ? 0 : Math.max(0, Number(cell.stock ?? 0)), fixed: cell.allocQty !== null && cell.allocQty !== undefined, off: cell.listed === false };
    });
  return { total: Math.max(0, Number(row.nafaaStock ?? 0)), parts };
}

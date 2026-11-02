/**
 * Shared bits for the Online products page: the channel mark (the
 * platform's logo), labels and keys.
 */

import type { QueryClient } from '@tanstack/react-query';
import { BrandLogo, brandColor, brandForChannel, brandLabel, type BrandName } from '@/assets/brands/BrandLogo';
import { ONLINE_PRODUCTS_KEY, type OnlineChannel, type PriceRule } from '../../api/online-products.api';
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
  return c.stockBuffer ? t('Nafaa se{{kept}}', { kept }) : t('Nafaa se, poora');
}

export const WEBSITE_LINKS_NOTE = t('Ye website apne products khud bhejti hai — order aane par ya CSV se jurte hain');

export const channelName = (c: OnlineChannel) => c.name || kindOf(c).label;

/** Everything the page shows after a link, price or sync change. */
export function refreshOnlineProducts(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: [ONLINE_PRODUCTS_KEY] });
  qc.invalidateQueries({ queryKey: ['channel-catalog'] });
}

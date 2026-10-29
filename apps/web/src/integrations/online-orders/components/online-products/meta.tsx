/**
 * Shared bits for the Online products page: the channel mark (the
 * platform's logo), labels and keys.
 */

import { ShoppingBag, ShoppingCart, Store, type LucideIcon } from 'lucide-react';
import type { QueryClient } from '@tanstack/react-query';
import { BrandLogo, brandForChannel } from '@/assets/brands/BrandLogo';
import { ONLINE_PRODUCTS_KEY, type OnlineChannel, type PriceRule } from '../../api/online-products.api';

export const CHANNEL_KIND: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  WOOCOMMERCE: { label: 'WooCommerce', color: '#96588A', icon: Store },
  SHOPIFY: { label: 'Shopify', color: '#7AB55C', icon: ShoppingBag },
  DARAZ: { label: 'Daraz', color: '#F85606', icon: ShoppingCart },
};

export const kindOf = (type: string) => CHANNEL_KIND[type] ?? { label: type, color: '#64748b', icon: Store };

export function ChannelMark({ type, size = 'md', className }: { type: string; size?: 'sm' | 'md'; className?: string }) {
  return <BrandLogo name={brandForChannel(type)} size={size === 'sm' ? 24 : 36} className={className} />;
}

export const rs = (n: number | null | undefined) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-PK')}`;

/** "Nafaa price + 10% · 9 par khatam" */
export function ruleText(rule: PriceRule): string {
  const parts: string[] = [];
  if (rule.mode === 'NONE' || !rule.value) parts.push('Nafaa price');
  else if (rule.mode === 'PERCENT') parts.push(`Nafaa price ${rule.value > 0 ? '+' : '−'} ${Math.abs(rule.value)}%`);
  else parts.push(`Nafaa price ${rule.value > 0 ? '+' : '−'} ${rs(Math.abs(rule.value))}`);
  if (rule.rounding === 'NEAREST_10') parts.push('10 ke qareeb');
  if (rule.rounding === 'END_9') parts.push('9 par khatam');
  return parts.join(' · ');
}

export const channelName = (c: OnlineChannel) => c.name || kindOf(c.type).label;

/** Everything the page shows after a link, price or sync change. */
export function refreshOnlineProducts(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: [ONLINE_PRODUCTS_KEY] });
  qc.invalidateQueries({ queryKey: ['channel-catalog'] });
}

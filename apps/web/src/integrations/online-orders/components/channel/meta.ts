/**
 * What kind of sales channel a channel page shows, and the facts every tab
 * needs about it (platform name, logo, automatic or manual connection).
 */

import type { BrandName } from '@/assets/brands/BrandLogo';
import type { WebsiteOverview } from '../../api/online-orders.api';

export type ChannelKind = 'shopify' | 'woocommerce' | 'daraz' | 'indolj' | 'custom';
export type ChannelTab = 'overview' | 'products' | 'settings' | 'setup' | 'activity';

export interface ChannelFacts {
  kind: ChannelKind;
  /** Platform name for UI text ("Shopify", "WooCommerce", "Daraz", "Indolj", "Website"). */
  name: string;
  brand: BrandName;
  /** Connected by Nafaa itself (Shopify install, WooCommerce approve, Daraz allow, Indolj menu). */
  automatic: boolean;
  /** Woo/Shopify/Daraz: products are managed on the Online products page. */
  productChannel: boolean;
  /** Shopify connected through the shop's own app (token or client keys), not the Nafaa app. */
  ownApp?: boolean;
  /** The platform the old website guides expect (manual Woo/Shopify setups keep working). */
  platform: 'woocommerce' | 'shopify' | 'custom';
}

type Integration = NonNullable<WebsiteOverview['integration']>;

export function channelFacts(i: Integration, via?: 'indolj' | 'custom' | null): ChannelFacts {
  const cfg = i.config;
  const platform: ChannelFacts['platform'] = i.type === 'WOOCOMMERCE' ? 'woocommerce' : i.type === 'SHOPIFY' ? 'shopify'
    : cfg.platform === 'shopify' ? 'shopify' : cfg.platform === 'woocommerce' || cfg.platform === 'wordpress' ? 'woocommerce' : 'custom';
  if (i.type === 'SHOPIFY') {
    const mode = (i.shopify as { mode?: string | null } | null | undefined)?.mode;
    return { kind: 'shopify', name: 'Shopify', brand: 'shopify', automatic: !!i.shopify?.connected, productChannel: true, platform, ownApp: mode === 'token' || mode === 'client' };
  }
  if (i.type === 'WOOCOMMERCE') return { kind: 'woocommerce', name: 'WooCommerce', brand: 'woocommerce', automatic: !!i.woo?.connected, productChannel: true, platform };
  if (i.type === 'DARAZ') return { kind: 'daraz', name: 'Daraz', brand: 'daraz', automatic: !!i.daraz?.connected, productChannel: true, platform };
  if (i.indolj?.connected || via === 'indolj') return { kind: 'indolj', name: 'Indolj', brand: 'indolj', automatic: !!i.indolj?.connected, productChannel: false, platform };
  const brand: BrandName = cfg.platform === 'shopify' ? 'shopify' : cfg.platform === 'woocommerce' ? 'woocommerce' : cfg.platform === 'wordpress' ? 'wordpress' : 'website';
  const name = cfg.platform === 'shopify' ? 'Shopify' : cfg.platform === 'woocommerce' ? 'WooCommerce' : cfg.platform === 'wordpress' ? 'WordPress' : 'Website';
  return { kind: 'custom', name, brand, automatic: false, productChannel: false, platform };
}

/** Site address without the scheme, for display. */
export const bareUrl = (u?: string | null) => (u ?? '').replace(/^https?:\/\//, '').replace(/\/$/, '');

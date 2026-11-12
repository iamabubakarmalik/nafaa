/**
 * Fallback sections for a template the shop's ThemeDoc does not have yet
 * (a new template type, or an old doc). The API seeds full presets when a
 * store is created; these only keep every page working.
 */
import type { Section, TemplateKey, ThemeId } from '../api';

const s = (id: string, type: string, settings: Record<string, unknown> = {}, blocks?: Section['blocks']): Section => ({ id, type, settings, blocks });

export const PRODUCT_BLOCKS: NonNullable<Section['blocks']> = [
  { id: 'b-title', type: 'title', settings: {} },
  { id: 'b-price', type: 'price', settings: {} },
  { id: 'b-badges', type: 'badges', settings: {} },
  { id: 'b-variants', type: 'variant_picker', settings: {} },
  { id: 'b-stock', type: 'stock_message', settings: {} },
  { id: 'b-qty', type: 'quantity', settings: {} },
  { id: 'b-buy', type: 'buy_buttons', settings: { showBuyNow: true } },
  { id: 'b-wa', type: 'whatsapp_order', settings: {} },
  { id: 'b-eta', type: 'delivery_eta', settings: {} },
  { id: 'b-trust', type: 'trust_icons', settings: {} },
  { id: 'b-tabs', type: 'tabs', settings: {} },
  { id: 'b-share', type: 'share', settings: {} },
];

export function defaultTemplate(_theme: ThemeId, key: TemplateKey): Section[] {
  switch (key) {
    case 'home':
      return [
        s('d-featured', 'featured_collection', { heading: 'Shop all', collection: 'all', limit: 8 }),
        s('d-trust', 'trust_badges', {}),
      ];
    case 'product':
      return [
        s('d-main', 'main_product', { gallery: 'thumbs', zoom: true }, PRODUCT_BLOCKS),
        s('d-together', 'bought_together', { heading: '' }),
        s('d-reviews', 'product_reviews', {}),
        s('d-related', 'product_recommendations', { limit: 8 }),
      ];
    case 'collection':
      return [s('d-coll', 'main_collection', { showFilters: true, limit: 24 })];
    case 'search':
      return [s('d-search', 'main_search', {})];
    case 'cart':
      return [s('d-cart', 'main_cart', {})];
    case 'page':
      return [s('d-page', 'main_page', {})];
    case 'blog':
      return [s('d-blog', 'main_blog', {})];
    case 'article':
      return [s('d-article', 'main_article', {})];
    case 'account':
      return [s('d-account', 'main_account', {})];
    case 'not_found':
      return [s('d-404', 'not_found', {})];
    default:
      return [];
  }
}

export const DEFAULT_GLOBAL = {
  announcement: s('g-ann', 'announcement_bar', {}, [{ id: 'm1', type: 'message', settings: { text: 'Cash on Delivery all over Pakistan' } }]),
  header: s('g-header', 'header', { sticky: true, menu: 'main-menu', showSearch: true, showAccount: true }),
  footer: s('g-footer', 'footer', { menu: 'footer', showNewsletter: true, showPayments: true, showSocial: true }),
};

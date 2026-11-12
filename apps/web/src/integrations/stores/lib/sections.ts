/**
 * Theme editor helpers on top of the API theme schema
 * (GET /stores/theme-schema, the single source the storefront also renders
 * from): section names and icons in the shop's language, which sections a
 * page template can take, and fresh sections/blocks with schema defaults.
 */

import type { LucideIcon } from 'lucide-react';
import {
  AlignLeft, BadgeCheck, CalendarClock, Clapperboard, Columns2, FileText, GalleryHorizontal, GalleryVerticalEnd, HelpCircle,
  Image as ImageIcon, Images, LayoutGrid, LayoutTemplate, ListTree, Mail, Megaphone, MessageSquareQuote, Newspaper, PanelBottom,
  PanelTop, Search, ShoppingBag, ShoppingCart, Sparkles, Star, Tags, UserRound, Ban, Square,
} from 'lucide-react';
import { t } from '@core/i18n';
import type { Block, GlobalKey, Section, SectionSchema, SettingField, TemplateKey, ThemeDoc, ThemeSchema, UrduChange } from '../api/stores.api';

/** Section names in simple words; the API label is the fallback. */
const SECTION_LABELS: Record<string, string> = {
  announcement_bar: t('Announcement bar'),
  header: t('Header'),
  footer: t('Footer'),
  hero: t('Bari tasveer (hero)'),
  slideshow: t('Slideshow'),
  featured_collection: t('Collection ke products'),
  product_carousel: t('Products ki patti'),
  collection_list: t('Collections ki list'),
  image_with_text: t('Tasveer aur text'),
  banner_cta: t('Banner / button'),
  testimonials: t('Customers ki rai'),
  faq: t('Sawal jawab (FAQ)'),
  trust_badges: t('Bharosa ke nishan'),
  video: t('Video'),
  newsletter: t('WhatsApp / email list'),
  gallery: t('Tasveeron ki gallery'),
  brand_logos: t('Brands ke logo'),
  countdown: t('Sale ka countdown'),
  rich_text: t('Text'),
  main_product: t('Product ki tafseel'),
  product_recommendations: t('Milte julte products'),
  bought_together: t('Saath me khareedein'),
  product_reviews: t('Reviews'),
  main_collection: t('Collection ke products aur filter'),
  main_search: t('Search ke results'),
  main_cart: t('Cart'),
  main_page: t('Page ka text'),
  main_blog: t('Blog posts'),
  main_article: t('Blog post'),
  main_account: t('Customer account'),
  not_found: t('Page nahi mila (404)'),
};

const SECTION_ICONS: Record<string, LucideIcon> = {
  announcement_bar: Megaphone, header: PanelTop, footer: PanelBottom, hero: ImageIcon, slideshow: GalleryHorizontal,
  featured_collection: LayoutGrid, product_carousel: GalleryVerticalEnd, collection_list: Tags, image_with_text: Columns2,
  banner_cta: LayoutTemplate, testimonials: MessageSquareQuote, faq: HelpCircle, trust_badges: BadgeCheck, video: Clapperboard,
  newsletter: Mail, gallery: Images, brand_logos: Sparkles, countdown: CalendarClock, rich_text: AlignLeft, main_product: ShoppingBag,
  product_recommendations: LayoutGrid, bought_together: ShoppingCart, product_reviews: Star, main_collection: ListTree,
  main_search: Search, main_cart: ShoppingCart, main_page: FileText, main_blog: Newspaper, main_article: Newspaper,
  main_account: UserRound, not_found: Ban,
};

export const sectionLabel = (type: string, schema?: SectionSchema) => SECTION_LABELS[type] ?? (schema ? t(schema.label) : t('Custom section'));
export const sectionIcon = (type: string): LucideIcon => SECTION_ICONS[type] ?? Square;

export const CATEGORY_LABELS: Record<SectionSchema['category'], string> = {
  header: t('Upar'),
  content: t('Banner aur text'),
  products: t('Products'),
  media: t('Tasveer aur video'),
  trust: t('Bharosa'),
  main: t('Page ka asal hissa'),
  footer: t('Neeche'),
};

export const TEMPLATE_ORDER: TemplateKey[] = ['home', 'product', 'collection', 'cart', 'search', 'page', 'blog', 'article', 'account', 'not_found'];

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  home: t('Home page'),
  product: t('Product page'),
  collection: t('Collection page'),
  search: t('Search'),
  cart: t('Cart'),
  page: t('Aam page'),
  blog: t('Blog'),
  article: t('Blog post'),
  account: t('Customer account'),
  not_found: t('Page nahi mila (404)'),
};
export const templateLabel = (k: TemplateKey) => TEMPLATE_LABELS[k] ?? k;

/** Path the preview opens for each template. */
export const TEMPLATE_PATHS: Record<TemplateKey, string> = {
  home: '/', product: '/products', collection: '/collections/all', search: '/search?q=a', cart: '/cart',
  page: '/pages/about', blog: '/blogs/news', article: '/blogs/news', account: '/account', not_found: '/404',
};

export const GLOBAL_KEYS: GlobalKey[] = ['announcement', 'header', 'footer'];
export const globalLabel = (k: GlobalKey) => (k === 'announcement' ? t('Announcement bar') : k === 'header' ? t('Header') : t('Footer'));

export function fieldLabel(f: SettingField) {
  return t(f.label);
}

/**
 * Sections the template can still take, for the "Add section" picker: the
 * shared header/footer and the page's main section are never added twice.
 */
export function addableSections(schema: ThemeSchema, template: TemplateKey, current: Section[] = []) {
  const allowed = new Set(schema.templates[template]?.allowed ?? []);
  const have = new Set(current.map((s) => s.type));
  return schema.sections.filter((s) => {
    if (['header', 'footer', 'announcement_bar'].includes(s.type)) return false;
    const fits = allowed.size ? allowed.has(s.type) : s.templates === 'all' || s.templates.includes(template);
    if (!fits) return false;
    return s.category === 'main' || s.singleton ? !have.has(s.type) : true;
  });
}

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;

export function defaultsOf(fields: SettingField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f.default !== undefined) out[f.key] = f.default;
  return out;
}

export function newSection(def: SectionSchema): Section {
  return { id: newId('s'), type: def.type, settings: defaultsOf(def.settings), blocks: [] };
}

export function newBlock(def: SectionSchema, type: string): Block {
  const b = def.blocks.find((x) => x.type === type);
  return { id: newId('b'), type, settings: b ? defaultsOf(b.settings) : {} };
}

/** A short line that tells sections of the same type apart in the list. */
export function sectionSummary(sec: Section): string {
  const s = sec.settings ?? {};
  const pick = (v: unknown) => (typeof v === 'string' ? v : v && typeof v === 'object' && 'en' in v ? String((v as { en: unknown }).en ?? '') : '');
  return pick(s.heading) || pick(s.title) || pick(s.text) || '';
}

/**
 * Puts Nafaa AI Urdu into the theme, only where the Urdu box is still empty
 * and the English is the same as when it was translated. Returns the new
 * theme and how many boxes were filled.
 */
export function applyUrdu(doc: ThemeDoc, changes: UrduChange[]): { doc: ThemeDoc; filled: number } {
  const out: ThemeDoc = JSON.parse(JSON.stringify(doc));
  let filled = 0;
  for (const c of changes) {
    const pool = c.where === 'global' ? (Object.values(out.global) as Section[]) : out.templates[c.where]?.sections ?? [];
    const sec = pool.find((x) => x.id === c.sectionId);
    const holder = c.blockId ? sec?.blocks?.find((b) => b.id === c.blockId) : sec;
    if (!holder) continue;
    const cur = holder.settings[c.key];
    const en = typeof cur === 'string' ? cur : cur && typeof cur === 'object' ? String((cur as { en?: unknown }).en ?? '') : '';
    const ur = cur && typeof cur === 'object' ? String((cur as { ur?: unknown }).ur ?? '') : '';
    if (ur.trim() || en.trim() !== c.en) continue;
    holder.settings = { ...holder.settings, [c.key]: { en, ur: c.ur } };
    filled++;
  }
  return { doc: out, filled };
}

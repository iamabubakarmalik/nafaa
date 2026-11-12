/**
 * Nafaa Stores (website builder) merchant API client.
 *
 * Endpoints and shapes follow the contract in
 * ~/nafaa-backups/wip/website-builder-contract.md, section 2 (apps/api module
 * integrations/stores). Every call goes through the shared apiClient, so auth,
 * the shop header and plan answers (403 ADDON_REQUIRED opens the upgrade
 * dialog) work as everywhere else.
 */

import { apiClient } from '@core/api/client';
import { unwrap } from '@integrations/online-orders/api/online-orders.api';

const get = <T>(url: string, params?: object) => apiClient.get(`/stores${url}`, { params }).then((r) => unwrap<T>(r));
const post = <T>(url: string, body?: unknown) => apiClient.post(`/stores${url}`, body ?? {}).then((r) => unwrap<T>(r));
const put = <T>(url: string, body?: unknown) => apiClient.put(`/stores${url}`, body ?? {}).then((r) => unwrap<T>(r));
const patch = <T>(url: string, body?: unknown) => apiClient.patch(`/stores${url}`, body ?? {}).then((r) => unwrap<T>(r));
const del = <T>(url: string) => apiClient.delete(`/stores${url}`).then((r) => unwrap<T>(r));

// ─── Shared ───
export type ThemeId = 'fashion' | 'electronics' | 'grocery' | 'beauty';
export type StoreStatus = 'DRAFT' | 'PASSWORD' | 'LIVE' | 'CLOSED';
export type Availability = 'in_stock' | 'out_of_stock' | 'backorder';
export type Lang = 'en' | 'ur';

export interface StoreSettings {
  logoUrl: string | null;
  faviconUrl: string | null;
  logoWidth: number;
  tagline: string | null;
  contact: { phone: string | null; whatsapp: string | null; email: string | null; address: string | null; hours: string | null };
  social: { facebook?: string; instagram?: string; tiktok?: string; youtube?: string; x?: string; whatsapp?: string };
  languages: { default: Lang; enabled: Lang[] };
  currencyDisplay: { symbol: 'Rs' | 'PKR' | '₨'; decimals: 0 | 2 };
  tracking: { metaPixelId: string | null; ga4Id: string | null; googleAdsId: string | null; googleAdsLabel: string | null; tiktokPixelId: string | null };
  whatsappButton: { enabled: boolean; number: string | null; message: string | null; position: 'left' | 'right' };
  seo: { title: string | null; description: string | null; ogImageUrl: string | null; noindex: boolean };
  password: { message: string | null };
  catalogMode: 'ALL' | 'CHOSEN';
  showOutOfStock: boolean;
  newsletter: { enabled: boolean; mode: 'whatsapp' | 'email' | 'both' };
}

export interface ThemeTokens {
  colors: { primary: string; secondary: string; background: string; surface: string; text: string; muted: string; accent: string; sale: string; border: string };
  fonts: { heading: string; body: string };
  radius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  spacing: 'compact' | 'normal' | 'roomy';
  buttonStyle: 'solid' | 'outline' | 'pill';
  cardStyle: 'plain' | 'bordered' | 'shadow';
}

export type TemplateKey = 'home' | 'product' | 'collection' | 'search' | 'cart' | 'page' | 'blog' | 'article' | 'account' | 'not_found';
export type GlobalKey = 'announcement' | 'header' | 'footer';
export interface Block { id: string; type: string; hidden?: boolean; settings: Record<string, unknown> }
export interface Section { id: string; type: string; hidden?: boolean; settings: Record<string, unknown>; blocks?: Block[] }
export interface ThemeDoc {
  themeId: ThemeId;
  tokens: ThemeTokens;
  global: Record<GlobalKey, Section>;
  templates: Record<TemplateKey, { sections: Section[] }>;
}

// ─── Theme schema (single source for the editor and the storefront) ───
export type SettingFieldType = 'text' | 'textarea' | 'richtext' | 'image' | 'color' | 'select' | 'range' | 'checkbox' | 'url'
  | 'collection' | 'product' | 'products' | 'video' | 'date' | 'number';
export interface SettingField {
  key: string;
  type: SettingFieldType;
  label: string;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  help?: string;
  translatable?: boolean;
}
export interface SectionSchema {
  type: string;
  label: string;
  icon: string;
  category: 'header' | 'content' | 'products' | 'trust' | 'media' | 'footer' | 'main';
  settings: SettingField[];
  blocks: Array<{ type: string; label: string; settings: SettingField[]; limit?: number }>;
  maxBlocks: number;
  templates: TemplateKey[] | 'all';
  singleton?: boolean;
}
export interface ThemePreset { id: ThemeId; name: string; description: string; industries: string[]; tokens: ThemeTokens; previewImage: string | null }
export interface ThemeSchema {
  sections: SectionSchema[];
  templates: Record<TemplateKey, { label: string; allowed: string[]; fixed: string[] }>;
  fonts: string[];
  themes: ThemePreset[];
}

export interface ThemeVersionFull { id: string; version: number; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; doc: ThemeDoc; updatedAt: string }
export interface ThemeVersionRow { id: string; version: number; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; note: string | null; publishedAt: string | null; publishedBy: string | null; updatedAt: string }
export interface ThemeState { draft: ThemeVersionFull; published: ThemeVersionFull | null; versions: ThemeVersionRow[] }

// ─── Stores ───
export interface StoreSummary {
  id: string;
  name: string;
  slug: string;
  status: StoreStatus;
  themeId: ThemeId;
  url: string;
  primaryHost: string;
  integrationId: string;
  shopId: string | null;
  createdAt: string;
  launchedAt: string | null;
}
export interface StoreList { entitled: boolean; addOnKey: 'website'; rootDomain: string; storefrontUrl: string; items: StoreSummary[] }

export interface PublicCheckoutSettings {
  loginMode: 'guest' | 'optional' | 'required';
  fields: { email: 'hidden' | 'optional' | 'required'; postalCode: 'hidden' | 'optional' | 'required'; province: 'hidden' | 'optional' | 'required'; landmark: 'hidden' | 'optional' };
  notes: boolean;
  marketingOptIn: boolean;
  codConfirmWhatsApp: boolean;
  minOrder: number | null;
  maxCodOrder: number | null;
  termsUrl: string | null;
}
export interface CheckoutSettings extends PublicCheckoutSettings {
  payments: { cod: boolean; SAFEPAY: boolean; JAZZCASH: boolean; EASYPAISA: boolean };
  advance: { mode: 'off' | 'shop_rule' | 'always_cod'; percent: number; minOrder: number | null };
  whatsappNumber: string | null;
  thankYouMessage: string | null;
}

export interface StoreFull extends StoreSummary {
  settings: StoreSettings;
  checkout: CheckoutSettings;
  hasPassword: boolean;
  integration: { id: string; status: string; autoAccept: boolean };
  previewUrl: string;
}

export type ChecklistKey = 'logo' | 'theme' | 'products' | 'domain' | 'payments' | 'shipping' | 'policies' | 'launch';
export interface StoreHome {
  store: StoreSummary;
  checklist: Array<{ key: ChecklistKey; done: boolean; link: string }>;
  stats: { days: 30; visitors: number; orders: number; revenue: number; conversion: number };
  recentOrders: Array<{ id: string; orderNumber: string; customerName: string | null; total: number; status: string; receivedAt: string }>;
}

// ─── Content ───
export type PageKind = 'ABOUT' | 'CONTACT' | 'FAQ' | 'CUSTOM';
export interface PageRow { id: string; handle: string; title: string; kind: PageKind; isPublished: boolean; updatedAt: string }
export interface StorePage extends PageRow { bodyHtml: string; seoTitle: string | null; seoDescription: string | null; url: string }
export type PageInput = Partial<Pick<StorePage, 'title' | 'handle' | 'kind' | 'bodyHtml' | 'seoTitle' | 'seoDescription' | 'isPublished'>>;

export type MenuItemType = 'home' | 'collection' | 'product' | 'page' | 'blog' | 'search' | 'url' | 'collections';
export interface MenuItemInput { id?: string; title: string; type: MenuItemType; ref?: string | null; url?: string | null; children?: MenuItemInput[] }
export interface StoreMenu { handle: string; title: string; items: MenuItemInput[] }

export interface BlogPost {
  id: string;
  blog: string;
  handle: string;
  title: string;
  bodyHtml: string;
  excerpt: string | null;
  imageUrl: string | null;
  tags: string[];
  author: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
  url?: string;
}
export type BlogPostInput = Partial<Omit<BlogPost, 'id' | 'updatedAt' | 'url'>>;

export interface StoreRedirect { id: string; fromPath: string; toPath: string; source: 'MANUAL' | 'SHOPIFY'; hits: number; createdAt: string }

export type PolicyKind = 'refund' | 'privacy' | 'terms' | 'shipping';
export interface StorePolicy { kind: PolicyKind; title: string; bodyHtml: string; updatedAt: string | null }

// ─── Collections ───
export type RuleField = 'category' | 'tag' | 'brand' | 'price' | 'stock' | 'created' | 'title' | 'vendor_sku';
export type RuleOp = 'is' | 'is_not' | 'gt' | 'lt' | 'contains' | 'in_stock' | 'within_days';
export interface CollectionRules { match: 'all' | 'any'; conditions: Array<{ field: RuleField; op: RuleOp; value: string | number }> }
export type CollectionSort = 'manual' | 'best_selling' | 'newest' | 'price_asc' | 'price_desc' | 'title_asc' | 'title_desc';
export interface CollectionRow {
  id: string;
  handle: string;
  title: string;
  url: string;
  image: string | null;
  productCount: number;
  kind: 'MANUAL' | 'AUTOMATIC';
  isPublished: boolean;
  sortOrder: number;
}
export interface CollectionInput {
  title: string;
  handle?: string;
  descriptionHtml?: string;
  imageUrl?: string | null;
  kind: 'MANUAL' | 'AUTOMATIC';
  rules?: CollectionRules;
  sort?: CollectionSort;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isPublished?: boolean;
}
export interface StoreCollection extends CollectionRow {
  descriptionHtml: string;
  imageUrl: string | null;
  rules: CollectionRules | null;
  sort: CollectionSort;
  seoTitle: string | null;
  seoDescription: string | null;
}
export interface CollectionProduct { productId: string; name: string; image: string | null; price: number; availability: Availability; position: number | null }

// ─── Products on the website ───
export interface WebProductRow {
  productId: string;
  name: string;
  sku: string | null;
  image: string | null;
  price: number;
  stock: number;
  availability: Availability;
  visible: boolean;
  handle: string;
  url: string;
  seoTitle: string | null;
  seoDescription: string | null;
  badges: string[];
  compareAtPrice: number | null;
  hasWebDescription: boolean;
}
export interface WebProductDetail extends WebProductRow {
  webDescription: string | null;
  description: string | null;
  imageOrder: string[];
  images: Array<{ id: string; url: string }>;
  relatedProductIds: string[];
  tabs: Array<{ title: string; html: string }>;
  sizeChart: { title: string; html: string } | null;
}
export type WebProductPatch = Partial<Pick<WebProductDetail, 'visible' | 'handle' | 'seoTitle' | 'seoDescription' | 'webDescription' | 'imageOrder' | 'badges' | 'relatedProductIds' | 'compareAtPrice' | 'tabs' | 'sizeChart'>>;

// ─── Domains ───
export interface StoreDomain {
  id: string;
  hostname: string;
  isPrimary: boolean;
  kind: 'apex' | 'www' | 'sub';
  status: 'PENDING' | 'VERIFYING' | 'ACTIVE' | 'ERROR';
  redirectTo: string | null;
  records: Array<{ type: 'A' | 'CNAME' | 'TXT'; name: string; value: string; ok: boolean | null }>;
  error: string | null;
  lastCheckedAt: string | null;
  sslReady: boolean;
  /** The Nafaa team took this domain off hosting; only they can bring it back. */
  removedByNafaa?: boolean;
}
export interface DomainsState {
  ready: boolean;
  /** status: null when domains are not set up on the server (no status shown). */
  subdomain: { host: string; url: string; status?: 'ACTIVE' | 'PENDING' | null };
  rootDomain: string;
  domains: StoreDomain[];
}

// ─── Shipping, payments ───
export interface ShippingRate { id: string; name: string; type: 'flat' | 'weight' | 'price'; price: number; min: number | null; max: number | null; freeAbove: number | null; eta: string | null }
export interface ShippingZone { id: string; name: string; provinces: string[]; cities: string[]; codEnabled: boolean; codFee: number | null; eta: string | null; rates: ShippingRate[] }
export interface ShippingSettings { freeShippingThreshold: number | null; defaultEta: string | null; codFee: number; zones: ShippingZone[] }
export interface PkCities { provinces: Array<{ code: string; name: string }>; cities: Array<{ name: string; province: string }> }

export interface StoreGateway { code: 'SAFEPAY' | 'JAZZCASH' | 'EASYPAISA' | string; name: string; connected: boolean; active: boolean; env: 'sandbox' | 'live' | null; enabledOnStore: boolean; methods: string[] }

// ─── Analytics, customers ───
export interface AnalyticsTotals { visitors: number; pageViews: number; productViews: number; addToCart: number; checkouts: number; orders: number; revenue: number; conversion: number; aov: number }
export interface StoreAnalytics {
  totals: AnalyticsTotals;
  previous: AnalyticsTotals;
  daily: Array<{ date: string; visitors: number; pageViews: number; orders: number; revenue: number }>;
  funnel: Array<{ step: 'visitors' | 'product_views' | 'add_to_cart' | 'checkout' | 'orders'; count: number }>;
  sources: Array<{ source: string; visitors: number; orders: number; revenue: number }>;
  devices: Array<{ device: string; visitors: number }>;
  topProducts: Array<{ productId: string; name: string; image: string | null; views: number; addToCart: number; orders: number; revenue: number }>;
  searches: Array<{ query: string; count: number }>;
}

// ─── Shopify move ───
export type MigrateKey = 'products' | 'handles' | 'collections' | 'redirects' | 'shop' | 'policies' | 'pages' | 'blogs' | 'menus' | 'customers';
export interface MigrateRun {
  id: string;
  status: 'RUNNING' | 'DONE' | 'FAILED';
  startedAt: string;
  finishedAt: string | null;
  steps: Array<{ key: MigrateKey; status: 'waiting' | 'running' | 'done' | 'skipped' | 'failed'; imported: number; skipped: number; note: string | null }>;
}
export interface MigrateState {
  channels: Array<{ id: string; name: string; shop: string; connected: boolean }>;
  scopes: { granted: string[]; missing: string[] };
  items: Array<{ key: MigrateKey; label: string; available: boolean; reason: string | null; count: number | null }>;
  lastRun: MigrateRun | null;
}

/** One proposed Urdu text from Nafaa AI; `where` is 'global' (announcement, header, footer) or a template. */
export interface UrduChange { where: 'global' | TemplateKey; sectionId: string; blockId: string | null; key: string; en: string; ur: string }

const s = (id: string) => `/${id}`;

export const storesApi = {
  // Stores
  list: () => get<StoreList>(''),
  checkSlug: (slug: string) => get<{ slug: string; available: boolean; suggestion: string | null }>('/slug-check', { slug }),
  create: (body: { name: string; slug?: string; themeId?: ThemeId; shopId?: string }) => post<StoreFull>('', body),
  get: (id: string) => get<StoreFull>(s(id)),
  update: (id: string, body: { name?: string; slug?: string; settings?: Partial<StoreSettings>; password?: string | null }) => patch<StoreFull>(s(id), body),
  setStatus: (id: string, status: 'LIVE' | 'PASSWORD' | 'DRAFT') => post<StoreFull>(`${s(id)}/status`, { status }),
  home: (id: string) => get<StoreHome>(`${s(id)}/home`),
  previewToken: (id: string) => post<{ token: string; expiresAt: string; url: string }>(`${s(id)}/preview-token`),

  // Theme
  schema: () => get<ThemeSchema>('/theme-schema'),
  theme: (id: string) => get<ThemeState>(`${s(id)}/theme`),
  saveDraft: (id: string, doc: ThemeDoc, baseUpdatedAt?: string) => put<ThemeVersionFull>(`${s(id)}/theme/draft`, { doc, baseUpdatedAt }),
  publish: (id: string, note?: string) => post<{ published: ThemeVersionFull; draft: ThemeVersionFull }>(`${s(id)}/theme/publish`, { note }),
  rollback: (id: string, versionId: string, publish = false) => post<{ published: ThemeVersionFull; draft: ThemeVersionFull }>(`${s(id)}/theme/rollback`, { versionId, publish }),
  switchTheme: (id: string, themeId: ThemeId, keep: 'content' | 'nothing') => post<{ draft: ThemeVersionFull }>(`${s(id)}/theme/switch`, { themeId, keep }),
  urduAvailable: () => get<{ available: boolean }>('/translate-urdu'),
  /** Proposed Urdu for empty Urdu boxes of `doc`; nothing is saved by this call. */
  translateUrdu: (id: string, doc: ThemeDoc) => post<{ changes: UrduChange[]; remaining: number; total: number }>(`${s(id)}/translate-urdu`, { doc }),

  // Pages
  pages: (id: string) => get<{ items: PageRow[] }>(`${s(id)}/pages`).then((r) => r.items),
  page: (id: string, pageId: string) => get<StorePage>(`${s(id)}/pages/${pageId}`),
  createPage: (id: string, body: PageInput & { title: string }) => post<StorePage>(`${s(id)}/pages`, body),
  updatePage: (id: string, pageId: string, body: PageInput) => patch<StorePage>(`${s(id)}/pages/${pageId}`, body),
  deletePage: (id: string, pageId: string) => del<unknown>(`${s(id)}/pages/${pageId}`),

  // Menus
  menus: (id: string) => get<{ items: StoreMenu[] }>(`${s(id)}/menus`).then((r) => r.items),
  saveMenu: (id: string, handle: string, body: { title: string; items: MenuItemInput[] }) => put<StoreMenu>(`${s(id)}/menus/${handle}`, body),
  deleteMenu: (id: string, handle: string) => del<unknown>(`${s(id)}/menus/${handle}`),

  // Blog
  posts: (id: string, blog = 'news') => get<{ items: BlogPost[] } | BlogPost[]>(`${s(id)}/blog-posts`, { blog }).then((r) => (Array.isArray(r) ? r : r.items)),
  post: (id: string, postId: string) => get<BlogPost>(`${s(id)}/blog-posts/${postId}`),
  createPost: (id: string, body: BlogPostInput & { title: string }) => post<BlogPost>(`${s(id)}/blog-posts`, body),
  updatePost: (id: string, postId: string, body: BlogPostInput) => patch<BlogPost>(`${s(id)}/blog-posts/${postId}`, body),
  deletePost: (id: string, postId: string) => del<unknown>(`${s(id)}/blog-posts/${postId}`),

  // Redirects
  redirects: (id: string, q: { search?: string; page?: number }) => get<{ items: StoreRedirect[]; total: number }>(`${s(id)}/redirects`, q),
  addRedirect: (id: string, body: { fromPath: string; toPath: string }) => post<StoreRedirect>(`${s(id)}/redirects`, body),
  bulkRedirects: (id: string, items: Array<{ fromPath: string; toPath: string }>) => post<{ added: number; skipped: number }>(`${s(id)}/redirects/bulk`, { items }),
  deleteRedirect: (id: string, redirectId: string) => del<unknown>(`${s(id)}/redirects/${redirectId}`),

  // Policies
  policyTemplates: () => get<{ items: Array<{ kind: PolicyKind; title: string; bodyHtml: string }> }>('/policy-templates').then((r) => r.items),
  policies: (id: string) => get<{ items: StorePolicy[] }>(`${s(id)}/policies`).then((r) => r.items),
  savePolicy: (id: string, kind: PolicyKind, body: { bodyHtml: string; title?: string }) => put<StorePolicy>(`${s(id)}/policies/${kind}`, body),

  // Collections
  collections: (id: string) => get<{ items: CollectionRow[] }>(`${s(id)}/collections`).then((r) => r.items),
  collection: (id: string, cid: string) => get<StoreCollection>(`${s(id)}/collections/${cid}`),
  createCollection: (id: string, body: CollectionInput) => post<StoreCollection>(`${s(id)}/collections`, body),
  updateCollection: (id: string, cid: string, body: Partial<CollectionInput>) => patch<StoreCollection>(`${s(id)}/collections/${cid}`, body),
  deleteCollection: (id: string, cid: string) => del<unknown>(`${s(id)}/collections/${cid}`),
  collectionProducts: (id: string, cid: string, page = 1) => get<{ items: CollectionProduct[]; total: number }>(`${s(id)}/collections/${cid}/products`, { page }),
  setCollectionProducts: (id: string, cid: string, productIds: string[]) => put<unknown>(`${s(id)}/collections/${cid}/products`, { productIds }),
  reorderCollections: (id: string, ids: string[]) => post<unknown>(`${s(id)}/collections/reorder`, { ids }),
  previewRules: (id: string, rules: CollectionRules) => post<{ count: number; sample: Array<{ productId: string; name: string; image: string | null; price: number }> }>(`${s(id)}/collections/preview-rules`, { rules }),

  // Products on the website
  products: (id: string, q: { search?: string; visible?: 'all' | 'shown' | 'hidden'; stock?: 'all' | 'in' | 'out'; categoryId?: string; page?: number; limit?: number }) =>
    get<{ items: WebProductRow[]; total: number; catalogMode: 'ALL' | 'CHOSEN' }>(`${s(id)}/products`, q),
  product: (id: string, productId: string) => get<WebProductDetail>(`${s(id)}/products/${productId}`),
  updateProduct: (id: string, productId: string, body: WebProductPatch) => patch<WebProductRow>(`${s(id)}/products/${productId}`, body),
  bulkProducts: (id: string, action: 'show' | 'hide' | 'show_in_stock', productIds?: string[]) => post<{ updated: number }>(`${s(id)}/products/bulk`, { action, productIds }),

  // Domains
  domains: (id: string) => get<DomainsState>(`${s(id)}/domains`),
  addDomain: (id: string, hostname: string) => post<{ domains: StoreDomain[] }>(`${s(id)}/domains`, { hostname }),
  verifyDomain: (id: string, domainId: string) => post<StoreDomain>(`${s(id)}/domains/${domainId}/verify`),
  primaryDomain: (id: string, domainId: string) => post<{ domains: StoreDomain[] }>(`${s(id)}/domains/${domainId}/primary`),
  removeDomain: (id: string, domainId: string) => del<{ domains: StoreDomain[] }>(`${s(id)}/domains/${domainId}`),

  // Shipping, checkout, payments
  shipping: (id: string) => get<ShippingSettings>(`${s(id)}/shipping`),
  saveShipping: (id: string, body: ShippingSettings) => put<ShippingSettings>(`${s(id)}/shipping`, body),
  pkCities: () => get<PkCities>('/pk-cities'),
  checkout: (id: string) => get<CheckoutSettings>(`${s(id)}/checkout`),
  saveCheckout: (id: string, body: Partial<CheckoutSettings>) => patch<CheckoutSettings>(`${s(id)}/checkout`, body),
  payments: (id: string) => get<{ gateways: StoreGateway[]; setupLink: string }>(`${s(id)}/payments`),

  // Analytics
  analytics: (id: string, days: 7 | 30 | 90) => get<StoreAnalytics>(`${s(id)}/analytics`, { days }),

  // Shopify move
  migration: (id: string) => get<MigrateState>(`${s(id)}/migrate/shopify`),
  startMigration: (id: string, channelId: string, include: MigrateKey[]) => post<{ run: MigrateRun }>(`${s(id)}/migrate/shopify`, { channelId, include }),
  migrationStatus: (id: string) => get<{ run: MigrateRun | null }>(`${s(id)}/migrate/shopify/status`),
};

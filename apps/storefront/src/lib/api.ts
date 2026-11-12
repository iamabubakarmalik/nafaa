/**
 * Typed client for the Nafaa Stores public API (apps/api, module
 * integrations/stores, base /api/storefront/v1). The only file that knows
 * endpoint paths and response shapes; contract:
 * ~/nafaa-backups/wip/website-builder-contract.md section 1.
 *
 * - Server side only (NAFAA_API_URL is not public). The browser talks to
 *   /api/sf/<action> route handlers, which call this client.
 * - Catalog reads are cached by Next (ISR) with the API's tags
 *   (`store:<id>`, `store:<id>:products`, ...). The API calls
 *   POST /api/revalidate with those tags when anything changes.
 * - The API wraps JSON as { success, data }; unwrap() takes the data.
 * - STOREFRONT_MOCK=1 serves four demo shops from src/lib/mock instead, so
 *   the themes can be built and checked without a running API.
 */
import { mockApi } from './mock';

// ─── Shared shapes (contract section 0) ────────────────────────────────────

export type ThemeId = 'fashion' | 'electronics' | 'grocery' | 'beauty';
export type StoreStatus = 'DRAFT' | 'PASSWORD' | 'LIVE' | 'CLOSED';
export type Availability = 'in_stock' | 'out_of_stock' | 'backorder';
export type Lang = 'en' | 'ur';
export type PolicyKind = 'refund' | 'privacy' | 'terms' | 'shipping';
export type PaymentCode = 'COD' | 'SAFEPAY' | 'JAZZCASH' | 'EASYPAISA';
export type TemplateKey = 'home' | 'product' | 'collection' | 'search' | 'cart' | 'page' | 'blog' | 'article' | 'account' | 'not_found';

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

export interface Block {
  id: string;
  type: string;
  hidden?: boolean;
  settings: Record<string, unknown>;
}

export interface Section {
  id: string;
  type: string;
  hidden?: boolean;
  settings: Record<string, unknown>;
  blocks?: Block[];
}

export interface ThemeDoc {
  themeId: ThemeId;
  tokens: ThemeTokens;
  global: { announcement: Section; header: Section; footer: Section };
  templates: Partial<Record<TemplateKey, { sections: Section[] }>>;
}

export interface MenuItem {
  id: string;
  title: string;
  type: string;
  ref: string | null;
  url: string;
  children: MenuItem[];
}

export interface PublicCheckoutSettings {
  loginMode: 'guest' | 'optional' | 'required';
  fields: {
    email: 'hidden' | 'optional' | 'required';
    postalCode: 'hidden' | 'optional' | 'required';
    province: 'hidden' | 'optional' | 'required';
    landmark: 'hidden' | 'optional';
  };
  notes: boolean;
  marketingOptIn: boolean;
  codConfirmWhatsApp: boolean;
  minOrder: number | null;
  maxCodOrder: number | null;
  termsUrl: string | null;
}

export interface StoreRef {
  storeId: string;
  slug: string;
  /** SUSPENDED: blocked by Nafaa; show a neutral "unavailable" page. */
  status: StoreStatus | 'SUSPENDED';
  primaryHost: string;
  redirectTo: string | null;
  rootDomain: string;
}

export interface Bootstrap {
  store: { id: string; slug: string; name: string; status: StoreStatus; locked: boolean; url: string; primaryHost: string; themeId: ThemeId; updatedAt: string };
  settings: StoreSettings;
  theme: ThemeDoc | null;
  themeVersion: number;
  menus: Record<string, MenuItem[]>;
  policies: Array<{ kind: PolicyKind; title: string; handle: string }>;
  checkout: PublicCheckoutSettings;
  payments: Array<{ code: PaymentCode; name: string; methods: string[] }>;
  shipping: { freeShippingThreshold: number | null; defaultEta: string | null; codAvailable: boolean };
  reviews: { enabled: boolean; average: number | null; count: number };
  /** Platform-wide switches from the Nafaa admin (contract 5.5). */
  platform?: { banner: { message: string; tone: 'info' | 'warning' } | null; checkoutPaused: boolean; checkoutMessage: string | null };
}

// ─── Catalog ───────────────────────────────────────────────────────────────

export interface ProductCard {
  id: string;
  handle: string;
  title: string;
  url: string;
  image: { url: string; alt: string | null } | null;
  secondImage: string | null;
  price: number;
  compareAtPrice: number | null;
  priceMax: number;
  onSale: boolean;
  badges: string[];
  availability: Availability;
  leadTime: string | null;
  brand: string | null;
  category: string | null;
  rating: { average: number; count: number } | null;
  hasVariants: boolean;
  firstVariantId: string | null;
}

export interface ProductVariant {
  id: string | null;
  title: string;
  sku: string | null;
  options: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  availability: Availability;
  maxQty: number;
  leadTime: string | null;
  image: string | null;
}

export interface ProductDetail extends ProductCard {
  description: string;
  seo: { title: string; description: string; canonical: string; image: string | null };
  images: Array<{ id: string; url: string; alt: string | null; variantIds: string[] }>;
  options: Array<{ name: string; values: Array<{ value: string; swatch: string | null }> }>;
  variants: ProductVariant[];
  tabs: Array<{ title: string; html: string }>;
  sizeChart: { title: string; html: string } | null;
  related: ProductCard[];
  breadcrumbs: Array<{ title: string; url: string }>;
  jsonLd: object;
  weight: number | null;
  sku: string | null;
  updatedAt: string;
}

export interface Facet {
  value: string;
  label: string;
  count: number;
}

export interface ProductList {
  items: ProductCard[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  facets: { brands: Facet[]; sizes: Facet[]; colors: Facet[]; categories: Facet[]; price: { min: number; max: number } };
}

export type SortKey = 'featured' | 'best_selling' | 'newest' | 'price_asc' | 'price_desc' | 'title_asc' | 'title_desc';

export interface ProductQuery {
  collection?: string;
  q?: string;
  category?: string;
  brand?: string;
  tag?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  sort?: SortKey;
  page?: number;
  limit?: number;
}

export interface Reviews {
  average: number | null;
  count: number;
  items: Array<{ name: string; rating: number; comment: string | null; date: string; verified: true }>;
  page: number;
  pages: number;
}

export interface CollectionCard {
  id: string;
  handle: string;
  title: string;
  url: string;
  image: string | null;
  productCount: number;
}

export interface CollectionDetail extends CollectionCard {
  descriptionHtml: string;
  seo: { title: string; description: string; canonical: string; image: string | null };
  sort: string;
}

export interface Suggest {
  products: ProductCard[];
  collections: CollectionCard[];
  pages: Array<{ title: string; url: string }>;
  queries: string[];
}

export interface Page {
  id: string;
  handle: string;
  title: string;
  bodyHtml: string;
  seo: { title: string; description: string; canonical: string };
  updatedAt: string;
}

export interface Policy {
  kind: PolicyKind;
  title: string;
  bodyHtml: string;
  updatedAt: string;
}

export interface BlogList {
  blog: { handle: string; title: string };
  items: Array<{ handle: string; title: string; excerpt: string | null; image: string | null; publishedAt: string; tags: string[]; url: string }>;
  page: number;
  pages: number;
}

export interface Article {
  handle: string;
  title: string;
  bodyHtml: string;
  image: string | null;
  publishedAt: string;
  tags: string[];
  author: string | null;
  seo: { title?: string; description?: string; canonical?: string };
  url: string;
}

export interface Sitemap {
  base: string;
  products: Array<{ url: string; updatedAt: string; image: string | null }>;
  collections: Array<{ url: string; updatedAt: string }>;
  pages: Array<{ url: string; updatedAt: string }>;
  blogs: Array<{ url: string; updatedAt: string }>;
}

// ─── Cart and checkout ─────────────────────────────────────────────────────

export interface CartLine {
  lineId: string;
  productId: string;
  variantId: string | null;
  handle: string;
  title: string;
  variantTitle: string | null;
  image: string | null;
  url: string;
  quantity: number;
  price: number;
  compareAtPrice: number | null;
  lineTotal: number;
  availability: Availability;
  maxQty: number;
  leadTime: string | null;
  problem: 'out_of_stock' | 'reduced' | 'removed' | null;
}

export interface Cart {
  token: string;
  itemCount: number;
  currency: 'PKR';
  lines: CartLine[];
  subtotal: number;
  discount: number;
  coupon: { code: string; message: string } | null;
  shipping: { rateId: string; name: string; price: number; eta: string | null } | null;
  codFee: number;
  total: number;
  freeShipping: { threshold: number; remaining: number } | null;
  contact: { name: string | null; phone: string | null; email: string | null };
  address: { address: string | null; city: string | null; province: string | null; postalCode: string | null; landmark: string | null };
  notes: string | null;
  paymentMethod: string | null;
  updatedAt: string;
}

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
}

export interface CartPatch {
  contact?: Partial<Cart['contact']>;
  address?: Partial<Cart['address']>;
  notes?: string | null;
  shippingRateId?: string;
  paymentMethod?: PaymentCode;
  couponCode?: string | null;
}

export interface ShippingRate {
  id: string;
  name: string;
  price: number;
  eta: string | null;
  codAvailable: boolean;
  codFee: number;
}

export interface CheckoutBody {
  cartToken: string;
  expectedTotal: number;
  contact: { name: string; phone: string; email?: string };
  address: { address: string; city: string; province?: string; postalCode?: string; landmark?: string };
  shippingRateId: string;
  paymentMethod: PaymentCode;
  notes?: string;
  acceptsMarketing?: boolean;
  customerToken?: string;
  hp?: string;
}

export interface PaymentStep {
  required: boolean;
  kind: 'FULL' | 'ADVANCE' | null;
  amount: number;
  url: string | null;
}

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  orderToken: string;
  total: number;
  paymentMethod: string;
  payment: PaymentStep;
  whatsappConfirmUrl: string | null;
  trackUrl: string;
}

export interface OrderView {
  orderNumber: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  codFee: number;
  paymentMethod: string;
  paid: boolean;
  payment: PaymentStep;
  lines: Array<{ title: string; variantTitle: string | null; quantity: number; price: number; image: string | null }>;
  contact: { name: string; phone: string };
  address: { city: string };
  whatsappConfirmUrl: string | null;
  trackUrl: string;
}

export interface TrackResult {
  status: string;
  label: string;
  total: number;
  paid: boolean;
  steps: Array<{ key: string; label: string; at: string | null }>;
  closed: boolean;
  courier: { name: string; trackingNumber: string; site: string | null } | null;
  journey?: unknown;
}

// ─── Customers ─────────────────────────────────────────────────────────────

export interface StoreCustomer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  acceptsMarketing: boolean;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  landmark: string | null;
  default: boolean;
}

export interface AccountOrders {
  items: Array<{ orderNumber: string; orderToken: string; createdAt: string; total: number; status: string; statusLabel: string; itemCount: number }>;
  page: number;
  pages: number;
}

export type ReportReason = 'SCAM' | 'FAKE_PRODUCTS' | 'NOT_DELIVERED' | 'OFFENSIVE' | 'COPYRIGHT' | 'OTHER';

export interface StoreEvent {
  type: 'page_view' | 'product_view' | 'collection_view' | 'search' | 'add_to_cart' | 'checkout_started' | 'purchase';
  visitorId: string;
  sessionId: string;
  newVisitor?: boolean;
  path?: string;
  productId?: string;
  value?: number;
  query?: string;
  utm?: Utm;
  referrer?: string;
  device?: 'mobile' | 'desktop' | 'tablet';
}

// ─── Client interface ──────────────────────────────────────────────────────

/** Read options: draft preview token, password access token. */
export interface ReadOpts {
  preview?: string | null;
  access?: string | null;
}

export interface StoreApi {
  resolve(key: { slug?: string; host?: string }): Promise<StoreRef | null>;
  bootstrap(storeId: string, o?: ReadOpts): Promise<Bootstrap | null>;
  unlock(storeId: string, password: string): Promise<{ accessToken: string; expiresAt: string } | null>;

  products(storeId: string, q: ProductQuery, o?: ReadOpts): Promise<ProductList>;
  product(storeId: string, handle: string, o?: ReadOpts): Promise<{ product: ProductDetail } | { redirect: string } | null>;
  productsByIds(storeId: string, ids: string[], o?: ReadOpts): Promise<ProductCard[]>;
  reviews(storeId: string, handle: string, page: number, o?: ReadOpts): Promise<Reviews | null>;
  together(storeId: string, handle: string, limit: number, o?: ReadOpts): Promise<ProductCard[]>;
  collections(storeId: string, o?: ReadOpts): Promise<CollectionCard[]>;
  collection(storeId: string, handle: string, q: ProductQuery, o?: ReadOpts): Promise<{ collection: CollectionDetail; products: ProductList } | null>;
  suggest(storeId: string, q: string, o?: ReadOpts): Promise<Suggest>;
  page(storeId: string, handle: string, o?: ReadOpts): Promise<Page | null>;
  policy(storeId: string, kind: string, o?: ReadOpts): Promise<Policy | null>;
  blog(storeId: string, blog: string, page: number, o?: ReadOpts): Promise<BlogList | null>;
  article(storeId: string, blog: string, handle: string, o?: ReadOpts): Promise<Article | null>;
  redirect(storeId: string, path: string): Promise<{ to: string; permanent: boolean } | null>;
  sitemap(storeId: string): Promise<Sitemap | null>;

  cartCreate(storeId: string, body: { lines?: Array<{ productId: string; variantId: string | null; quantity: number }>; utm?: Utm; referrer?: string; landingPage?: string }): Promise<Cart>;
  cartGet(storeId: string, token: string): Promise<Cart | null>;
  cartAdd(storeId: string, token: string, line: { productId: string; variantId: string | null; quantity: number }): Promise<Cart>;
  cartLine(storeId: string, token: string, lineId: string, quantity: number): Promise<Cart>;
  cartPatch(storeId: string, token: string, patch: CartPatch): Promise<Cart>;
  cartCoupon(storeId: string, token: string, code: string): Promise<{ ok: boolean; message: string; cart: Cart }>;
  shippingRates(storeId: string, token: string, city: string, province?: string | null): Promise<{ rates: ShippingRate[]; zone: string | null; reason?: string | null }>;
  checkout(storeId: string, body: CheckoutBody): Promise<CheckoutResult>;
  order(storeId: string, orderToken: string): Promise<OrderView | null>;
  track(storeId: string, no: string, phoneLast4: string): Promise<TrackResult | null>;

  otp(storeId: string, body: { channel: 'email' | 'sms'; to: string }): Promise<{ sent: boolean; channel: string; expiresIn: number; devCode?: string }>;
  verify(storeId: string, body: { to: string; code: string; name?: string }): Promise<{ token: string; expiresAt: string; customer: StoreCustomer }>;
  account(storeId: string, customerToken: string): Promise<{ customer: StoreCustomer; addresses: Address[] } | null>;
  accountOrders(storeId: string, customerToken: string, page: number): Promise<AccountOrders | null>;
  saveAddresses(storeId: string, customerToken: string, addresses: Address[]): Promise<{ addresses: Address[] }>;
  portalLink(storeId: string, customerToken: string, orderToken: string): Promise<{ url: string } | null>;

  subscribe(storeId: string, body: { email?: string; phone?: string; source?: string }): Promise<{ ok: boolean }>;
  report(storeId: string, body: { reason: ReportReason; details?: string; name?: string; contact?: string; pageUrl?: string; hp?: string }): Promise<{ ok: boolean }>;
  events(storeId: string, events: StoreEvent[]): Promise<void>;
}

// ─── Live client ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public body?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const V1 = '/storefront/v1';
const S = (id: string) => `${V1}/s/${encodeURIComponent(id)}`;
const enc = encodeURIComponent;

function apiBase(): string {
  return (process.env.NAFAA_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
}

function unwrap<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'success' in json && 'data' in json) return (json as { data: T }).data;
  return json as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    u.set(k, v === true ? '1' : String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : '';
}

const productQs = (q: ProductQuery, preview?: string | null) =>
  qs({ ...q, available: q.available ? 1 : undefined, preview: preview ?? undefined } as Record<string, string | number | undefined>);

interface ReadInit {
  tags?: string[];
  revalidate?: number;
  o?: ReadOpts;
  noStore?: boolean;
  headers?: Record<string, string>;
}

async function read<T>(path: string, init: ReadInit = {}): Promise<T | null> {
  const headers: Record<string, string> = { Accept: 'application/json', ...init.headers };
  if (init.o?.access) headers['x-store-access'] = init.o.access;
  const dynamic = init.noStore || !!init.o?.preview || !!init.o?.access || !!init.headers;
  const res = await fetch(
    apiBase() + path,
    dynamic ? { headers, cache: 'no-store' } : { headers, next: { revalidate: init.revalidate ?? 300, tags: init.tags } },
  );
  if (res.status === 404) {
    const body = await res.json().catch(() => null);
    const redirect = body && typeof body === 'object' ? (body as { redirect?: string; data?: { redirect?: string } }).redirect ?? (body as { data?: { redirect?: string } }).data?.redirect : undefined;
    if (redirect) return { redirect } as T;
    return null;
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    throw new ApiError(res.status, String(body?.message ?? `GET ${path} failed (${res.status})`), body?.code ? String(body.code) : undefined, body ?? undefined);
  }
  return unwrap<T>(await res.json());
}

async function send<T>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(apiBase() + path, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    throw new ApiError(res.status, String(json?.message ?? `${method} ${path} failed`), json?.code ? String(json.code) : undefined, json ?? undefined);
  }
  return unwrap<T>(json);
}

async function orNull<T>(p: Promise<T>, statuses = [404]): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof ApiError && statuses.includes(e.status)) return null;
    throw e;
  }
}

const tags = (id: string, ...extra: string[]) => [`store:${id}`, ...extra.map((x) => `store:${id}:${x}`)];
const pv = (o?: ReadOpts) => (o?.preview ? qs({ preview: o.preview }) : '');
const emptyList = (limit = 24): ProductList => ({
  items: [],
  total: 0,
  page: 1,
  pages: 0,
  limit,
  facets: { brands: [], sizes: [], colors: [], categories: [], price: { min: 0, max: 0 } },
});

const liveApi: StoreApi = {
  resolve: (key) => read<StoreRef>(`${V1}/resolve${qs({ slug: key.slug, host: key.host })}`, { revalidate: 60, tags: [`resolve:${key.slug ?? key.host}`] }),
  bootstrap: (id, o) => read<Bootstrap>(`${S(id)}/bootstrap${pv(o)}`, { tags: tags(id), o }),
  unlock: (id, password) => orNull(send('POST', `${S(id)}/unlock`, { password }), [401, 404]),

  products: async (id, q, o) => (await read<ProductList>(`${S(id)}/products${productQs(q, o?.preview)}`, { tags: tags(id, 'products', 'collections'), o })) ?? emptyList(q.limit),
  product: async (id, handle, o) => {
    const r = await read<ProductDetail | { redirect: string }>(`${S(id)}/products/${enc(handle)}${pv(o)}`, { tags: tags(id, 'products'), o });
    if (!r) return null;
    return 'redirect' in r ? r : { product: r };
  },
  productsByIds: async (id, ids, o) =>
    ids.length ? ((await read<{ items: ProductCard[] }>(`${S(id)}/products/by-ids${qs({ ids: ids.join(','), preview: o?.preview })}`, { tags: tags(id, 'products'), o }))?.items ?? []) : [],
  reviews: (id, handle, page, o) => read<Reviews>(`${S(id)}/products/${enc(handle)}/reviews${qs({ page, preview: o?.preview })}`, { tags: tags(id, 'products'), o, revalidate: 900 }),
  together: async (id, handle, limit, o) =>
    (await read<{ items: ProductCard[] }>(`${S(id)}/products/${enc(handle)}/together${qs({ limit, preview: o?.preview })}`, { tags: tags(id, 'products'), o, revalidate: 900 }))?.items ?? [],
  collections: async (id, o) => (await read<{ items: CollectionCard[] }>(`${S(id)}/collections${pv(o)}`, { tags: tags(id, 'collections'), o }))?.items ?? [],
  collection: (id, handle, q, o) =>
    read<{ collection: CollectionDetail; products: ProductList }>(`${S(id)}/collections/${enc(handle)}${productQs(q, o?.preview)}`, { tags: tags(id, 'collections', 'products'), o }),
  suggest: async (id, q, o) =>
    (await read<Suggest>(`${S(id)}/search/suggest${qs({ q, preview: o?.preview })}`, { tags: tags(id, 'products'), o, revalidate: 120 })) ?? { products: [], collections: [], pages: [], queries: [] },
  page: (id, handle, o) => read<Page>(`${S(id)}/pages/${enc(handle)}${pv(o)}`, { tags: tags(id, 'pages'), o }),
  policy: (id, kind, o) => read<Policy>(`${S(id)}/policies/${enc(kind)}${pv(o)}`, { tags: tags(id, 'pages'), o }),
  blog: (id, blog, page, o) => read<BlogList>(`${S(id)}/blogs/${enc(blog)}${qs({ page, preview: o?.preview })}`, { tags: tags(id, 'blog'), o }),
  article: (id, blog, handle, o) => read<Article>(`${S(id)}/blogs/${enc(blog)}/${enc(handle)}${pv(o)}`, { tags: tags(id, 'blog'), o }),
  redirect: (id, path) => read<{ to: string; permanent: boolean }>(`${S(id)}/redirect${qs({ path })}`, { tags: tags(id), revalidate: 600 }),
  sitemap: (id) => read<Sitemap>(`${S(id)}/sitemap`, { tags: tags(id), revalidate: 3600 }),

  cartCreate: (id, body) => send('POST', `${S(id)}/carts`, body),
  cartGet: (id, token) => read<Cart>(`${S(id)}/carts/${enc(token)}`, { noStore: true }),
  cartAdd: (id, token, line) => send('POST', `${S(id)}/carts/${enc(token)}/lines`, line),
  cartLine: (id, token, lineId, quantity) => send('PATCH', `${S(id)}/carts/${enc(token)}/lines/${enc(lineId)}`, { quantity }),
  cartPatch: (id, token, patch) => send('PATCH', `${S(id)}/carts/${enc(token)}`, patch),
  cartCoupon: (id, token, code) => send('POST', `${S(id)}/carts/${enc(token)}/coupon`, { code }),
  shippingRates: async (id, token, city, province) =>
    (await read<{ rates: ShippingRate[]; zone: string | null; reason?: string | null }>(`${S(id)}/carts/${enc(token)}/shipping-rates${qs({ city, province })}`, { noStore: true })) ?? {
      rates: [],
      zone: null,
    },
  checkout: (id, body) => send('POST', `${S(id)}/checkout`, body),
  order: (id, orderToken) => read<OrderView>(`${S(id)}/orders/${enc(orderToken)}`, { noStore: true }),
  track: (id, no, phone) => read<TrackResult>(`${S(id)}/track${qs({ no, phone })}`, { noStore: true }),

  otp: (id, body) => send('POST', `${S(id)}/auth/otp`, body),
  verify: (id, body) => send('POST', `${S(id)}/auth/verify`, body),
  account: (id, tok) => orNull(read(`${S(id)}/account`, { headers: { 'x-store-customer': tok } }), [401, 404]),
  accountOrders: (id, tok, page) => orNull(read(`${S(id)}/account/orders${qs({ page })}`, { headers: { 'x-store-customer': tok } }), [401, 404]),
  saveAddresses: (id, tok, addresses) => send('PUT', `${S(id)}/account/addresses`, { addresses }, { 'x-store-customer': tok }),
  portalLink: (id, tok, orderToken) => orNull(read(`${S(id)}/account/orders/${enc(orderToken)}/portal`, { headers: { 'x-store-customer': tok } }), [401, 404]),

  subscribe: (id, body) => send('POST', `${S(id)}/subscribe`, body),
  report: (id, body) => send('POST', `${S(id)}/report`, body),
  events: async (id, events) => {
    await send('POST', `${S(id)}/events`, { events }).catch(() => undefined);
  },
};

export const isMock = process.env.STOREFRONT_MOCK === '1';

export const api: StoreApi = isMock ? mockApi : liveApi;

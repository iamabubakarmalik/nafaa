/**
 * In-memory StoreApi for STOREFRONT_MOCK=1. Mirrors the contract shapes so
 * pages behave the same as against the real API: four demo shops (libaas,
 * volt, bazaar, glow), carts, shipping rates, checkout and orders that live
 * until the dev server restarts.
 */
import type {
  Bootstrap,
  Cart,
  CheckoutResult,
  CollectionCard,
  CollectionDetail,
  OrderView,
  ProductCard,
  ProductDetail,
  ProductList,
  ProductQuery,
  ShippingRate,
  StoreApi,
  StoreSettings,
} from '../api';
import { MOCK_STORES, img, mockMenus, mockTheme, type MockProduct, type MockStore } from './data';

const slugify = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const NOW = '2026-11-12T09:00:00.000Z';

interface Built {
  store: MockStore;
  products: ProductDetail[];
  collections: CollectionDetail[];
}

function cartesian(opts: MockProduct['opts']): Array<Record<string, string>> {
  if (!opts?.length) return [{}];
  return opts.reduce<Array<Record<string, string>>>(
    (acc, o) => acc.flatMap((a) => o.values.map(([v]) => ({ ...a, [o.name]: v }))),
    [{}],
  );
}

function buildProduct(store: MockStore, p: MockProduct, i: number): ProductDetail {
  const handle = slugify(p.t);
  const id = `${store.slug}-p${i + 1}`;
  const availability = p.avail ?? 'in_stock';
  const combos = cartesian(p.opts);
  const variants = combos.map((options, vi) => {
    const title = Object.values(options).join(' / ') || 'Default';
    const bump = p.opts?.some((o) => o.name === 'Storage' || o.name === 'Weight') ? vi * Math.round(p.price * 0.35) : 0;
    const soldOut = availability === 'out_of_stock' || (vi === combos.length - 1 && combos.length > 3);
    return {
      id: p.opts?.length ? `${id}-v${vi + 1}` : null,
      title,
      sku: `${store.slug.toUpperCase().slice(0, 3)}-${1000 + i * 10 + vi}`,
      options,
      price: p.price + bump,
      compareAtPrice: p.was ? p.was + bump : null,
      availability: soldOut ? ('out_of_stock' as const) : availability,
      maxQty: soldOut ? 0 : p.stock ?? 20,
      leadTime: p.lead ?? null,
      image: null,
    };
  });
  const prices = variants.map((v) => v.price);
  const badges = [...(p.badges ?? [])];
  if (p.was) badges.push('Sale');
  if (availability === 'out_of_stock') badges.push('Sold out');
  const card: ProductCard = {
    id,
    handle,
    title: p.t,
    url: `/products/${handle}`,
    image: { url: img(p.img[0]!, 1200), alt: p.t },
    secondImage: p.img[1] ? img(p.img[1], 1200) : null,
    price: Math.min(...prices),
    compareAtPrice: p.was ?? null,
    priceMax: Math.max(...prices),
    onSale: !!p.was,
    badges,
    availability,
    leadTime: p.lead ?? null,
    brand: p.brand ?? null,
    category: p.cat,
    rating: p.rating ? { average: p.rating[0], count: p.rating[1] } : null,
    hasVariants: !!p.opts?.length,
    firstVariantId: variants[0]?.id ?? null,
  };
  const coll = store.collections.find((c) => c.handle === p.coll[0]);
  return {
    ...card,
    description: p.desc,
    seo: { title: p.t, description: p.desc.replace(/<[^>]+>/g, ' ').trim().slice(0, 155), canonical: `/products/${handle}`, image: card.image?.url ?? null },
    images: p.img.map((x, k) => ({ id: `${id}-i${k}`, url: img(x, 1600), alt: p.t, variantIds: [] })),
    options: (p.opts ?? []).map((o) => ({ name: o.name, values: o.values.map(([value, swatch]) => ({ value, swatch: swatch ?? null })) })),
    variants,
    tabs: [
      { title: 'Delivery & returns', html: '<p>Delivered in 2 to 5 working days across Pakistan. Cash on Delivery available. Exchanges within 7 days of delivery if the item is unused with tags.</p>' },
      ...(store.themeId === 'fashion' ? [{ title: 'Fabric & care', html: '<p>Gentle hand wash in cold water. Do not bleach. Iron on reverse.</p>' }] : []),
    ],
    sizeChart:
      store.themeId === 'fashion' && p.opts?.some((o) => o.name === 'Size')
        ? {
            title: 'Size chart (inches)',
            html: '<table><thead><tr><th>Size</th><th>Chest</th><th>Length</th><th>Hip</th></tr></thead><tbody><tr><td>XS</td><td>17</td><td>38</td><td>19</td></tr><tr><td>S</td><td>18</td><td>39</td><td>20</td></tr><tr><td>M</td><td>19.5</td><td>40</td><td>21.5</td></tr><tr><td>L</td><td>21</td><td>41</td><td>23</td></tr><tr><td>XL</td><td>22.5</td><td>42</td><td>24.5</td></tr></tbody></table>',
          }
        : null,
    related: [],
    breadcrumbs: [
      { title: 'Home', url: '/' },
      ...(coll ? [{ title: coll.title, url: `/collections/${coll.handle}` }] : []),
      { title: p.t, url: `/products/${handle}` },
    ],
    jsonLd: {},
    weight: null,
    sku: variants[0]?.sku ?? null,
    updatedAt: NOW,
  };
}

const built = new Map<string, Built>();
function get(slugOrId: string): Built | null {
  const store = MOCK_STORES.find((s) => s.slug === slugOrId || `store-${s.slug}` === slugOrId);
  if (!store) return null;
  let b = built.get(store.slug);
  if (!b) {
    const products = store.products.map((p, i) => buildProduct(store, p, i));
    for (const p of products) {
      const same = products.filter((x) => x.id !== p.id && x.category === p.category);
      const rest = products.filter((x) => x.id !== p.id && x.category !== p.category);
      p.related = [...same, ...rest].slice(0, 8).map(toCard);
    }
    const collections: CollectionDetail[] = store.collections.map((c, i) => {
      const count = store.products.filter((p) => p.coll.includes(c.handle)).length;
      return {
        id: `${store.slug}-c${i + 1}`,
        handle: c.handle,
        title: c.title,
        url: `/collections/${c.handle}`,
        image: c.image,
        productCount: count,
        descriptionHtml: `<p>${c.desc}</p>`,
        seo: { title: c.title, description: c.desc, canonical: `/collections/${c.handle}`, image: c.image },
        sort: 'featured',
      };
    });
    b = { store, products, collections };
    built.set(store.slug, b);
  }
  return b;
}

function toCard(p: ProductDetail): ProductCard {
  const { id, handle, title, url, image, secondImage, price, compareAtPrice, priceMax, onSale, badges, availability, leadTime, brand, category, rating, hasVariants, firstVariantId } = p;
  return { id, handle, title, url, image, secondImage, price, compareAtPrice, priceMax, onSale, badges, availability, leadTime, brand, category, rating, hasVariants, firstVariantId };
}

function list(b: Built, q: ProductQuery): ProductList {
  let items = b.products;
  if (q.collection && q.collection !== 'all') {
    const src = b.store.products;
    items = items.filter((_, i) => src[i]!.coll.includes(q.collection!));
  }
  if (q.q) {
    const n = q.q.toLowerCase();
    items = items.filter((p) => `${p.title} ${p.category} ${p.brand ?? ''}`.toLowerCase().includes(n));
  }
  const base = items;
  if (q.brand) items = items.filter((p) => q.brand!.split(',').includes(p.brand ?? ''));
  if (q.category) items = items.filter((p) => q.category!.split(',').includes(p.category ?? ''));
  if (q.size) items = items.filter((p) => p.options.some((o) => o.name !== 'Colour' && o.values.some((v) => q.size!.split(',').includes(v.value))));
  if (q.color) items = items.filter((p) => p.options.some((o) => o.name === 'Colour' || o.name === 'Shade') && p.options.some((o) => o.values.some((v) => q.color!.split(',').includes(v.value))));
  if (q.minPrice) items = items.filter((p) => p.price >= q.minPrice!);
  if (q.maxPrice) items = items.filter((p) => p.price <= q.maxPrice!);
  if (q.available) items = items.filter((p) => p.availability !== 'out_of_stock');
  const sorted = [...items];
  switch (q.sort) {
    case 'price_asc': sorted.sort((a, b) => a.price - b.price); break;
    case 'price_desc': sorted.sort((a, b) => b.price - a.price); break;
    case 'title_asc': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'title_desc': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
    case 'newest': sorted.reverse(); break;
    case 'best_selling': sorted.sort((a, b) => (b.rating?.count ?? 0) - (a.rating?.count ?? 0)); break;
  }
  const limit = Math.min(q.limit ?? 24, 48);
  const page = Math.max(1, q.page ?? 1);
  const facet = (vals: Array<string | null | undefined>) => {
    const m = new Map<string, number>();
    for (const v of vals) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].map(([value, count]) => ({ value, label: value, count }));
  };
  const prices = base.map((p) => p.price);
  return {
    items: sorted.slice((page - 1) * limit, page * limit).map(toCard),
    total: sorted.length,
    page,
    pages: Math.max(1, Math.ceil(sorted.length / limit)),
    limit,
    facets: {
      brands: facet(base.map((p) => p.brand)),
      categories: facet(base.map((p) => p.category)),
      sizes: facet(base.flatMap((p) => p.options.filter((o) => !['Colour', 'Shade'].includes(o.name)).flatMap((o) => o.values.map((v) => v.value)))),
      colors: facet(base.flatMap((p) => p.options.filter((o) => ['Colour', 'Shade'].includes(o.name)).flatMap((o) => o.values.map((v) => v.value)))),
      price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    },
  };
}

function settings(s: MockStore): StoreSettings {
  return {
    logoUrl: null,
    faviconUrl: null,
    logoWidth: 140,
    tagline: s.tagline,
    contact: { phone: s.whatsapp, whatsapp: s.whatsapp, email: s.email, address: s.address, hours: '10am to 10pm, every day' },
    social: { instagram: 'https://instagram.com', facebook: 'https://facebook.com', tiktok: 'https://tiktok.com' },
    languages: { default: 'en', enabled: ['en', 'ur'] },
    currencyDisplay: { symbol: 'Rs', decimals: 0 },
    tracking: { metaPixelId: null, ga4Id: null, googleAdsId: null, googleAdsLabel: null, tiktokPixelId: null },
    whatsappButton: { enabled: true, number: s.whatsapp, message: null, position: 'right' },
    seo: { title: `${s.name} | ${s.tagline}`, description: s.footerAbout, ogImageUrl: null, noindex: true },
    password: { message: null },
    catalogMode: 'ALL',
    showOutOfStock: true,
    newsletter: { enabled: true, mode: 'whatsapp' },
  };
}

// ─── Carts and orders ──────────────────────────────────────────────────────
// Kept on globalThis: in dev, route handlers and pages load separate module copies.
const G = globalThis as unknown as { __nfMock?: { carts: Map<string, Cart & { storeId: string }>; orders: Map<string, OrderView>; seq: number } };
G.__nfMock ??= { carts: new Map(), orders: new Map(), seq: 1040 };
const carts = G.__nfMock.carts;
const orders = G.__nfMock.orders;
const rid = () => Math.random().toString(36).slice(2, 12);

function recalc(b: Built, c: Cart): Cart {
  c.itemCount = c.lines.reduce((s, l) => s + l.quantity, 0);
  for (const l of c.lines) l.lineTotal = l.price * l.quantity;
  c.subtotal = c.lines.reduce((s, l) => s + l.lineTotal, 0);
  c.discount = c.coupon ? Math.round(c.subtotal * 0.1) : 0;
  const threshold = b.store.themeId === 'grocery' ? 3000 : b.store.themeId === 'electronics' ? 10000 : 5000;
  c.freeShipping = { threshold, remaining: Math.max(0, threshold - (c.subtotal - c.discount)) };
  if (c.shipping && c.freeShipping.remaining === 0) c.shipping.price = 0;
  const cod = c.paymentMethod === 'COD' ? c.codFee : 0;
  c.total = c.subtotal - c.discount + (c.shipping?.price ?? 0) + cod;
  c.updatedAt = new Date().toISOString();
  return c;
}

function rates(b: Built, city: string, subtotal: number): ShippingRate[] {
  const local: Record<string, string> = { fashion: 'Lahore', electronics: 'Lahore', grocery: 'Karachi', beauty: 'Islamabad' };
  const isLocal = city === local[b.store.themeId];
  const remote = ['Gilgit', 'Skardu', 'Gwadar', 'Turbat', 'Chitral'].includes(city);
  const free = subtotal >= (b.store.themeId === 'grocery' ? 3000 : b.store.themeId === 'electronics' ? 10000 : 5000);
  const out: ShippingRate[] = [
    { id: 'std', name: isLocal ? 'Same city delivery' : 'Standard delivery', price: free ? 0 : isLocal ? 150 : 250, eta: isLocal ? '1 to 2 working days' : remote ? '5 to 7 working days' : '2 to 4 working days', codAvailable: !remote, codFee: remote ? 0 : 50 },
  ];
  if (!remote) out.push({ id: 'express', name: 'Express (next day)', price: isLocal ? 300 : 450, eta: 'Next working day', codAvailable: true, codFee: 50 });
  return out;
}

export const mockApi: StoreApi = {
  async resolve(key) {
    const s = MOCK_STORES.find((x) => x.slug === key.slug || (key.host && key.host.startsWith(`${x.slug}.`)));
    if (!s) return null;
    return { storeId: `store-${s.slug}`, slug: s.slug, status: 'LIVE', primaryHost: `${s.slug}.stores.nafaa.pk`, redirectTo: null, rootDomain: 'stores.nafaa.pk' };
  },
  async bootstrap(id) {
    const b = get(id);
    if (!b) return null;
    const s = b.store;
    const boot: Bootstrap = {
      store: { id, slug: s.slug, name: s.name, status: 'LIVE', locked: false, url: `http://localhost:3300`, primaryHost: `${s.slug}.stores.nafaa.pk`, themeId: s.themeId, updatedAt: NOW },
      settings: settings(s),
      theme: mockTheme(s),
      themeVersion: 1,
      menus: mockMenus(s),
      policies: [
        { kind: 'refund', title: 'Refund policy', handle: 'refund-policy' },
        { kind: 'shipping', title: 'Shipping policy', handle: 'shipping-policy' },
        { kind: 'privacy', title: 'Privacy policy', handle: 'privacy-policy' },
        { kind: 'terms', title: 'Terms of service', handle: 'terms-of-service' },
      ],
      checkout: {
        loginMode: 'guest',
        fields: { email: 'optional', postalCode: 'hidden', province: 'hidden', landmark: 'optional' },
        notes: true,
        marketingOptIn: true,
        codConfirmWhatsApp: true,
        minOrder: null,
        maxCodOrder: null,
        termsUrl: '/policies/terms-of-service',
      },
      payments: [
        { code: 'COD', name: 'Cash on Delivery', methods: ['cash'] },
        { code: 'JAZZCASH', name: 'JazzCash', methods: ['wallet'] },
        { code: 'EASYPAISA', name: 'Easypaisa', methods: ['wallet'] },
        { code: 'SAFEPAY', name: 'Debit / credit card', methods: ['card'] },
      ],
      shipping: { freeShippingThreshold: s.themeId === 'grocery' ? 3000 : s.themeId === 'electronics' ? 10000 : 5000, defaultEta: '2 to 4 working days', codAvailable: true },
      reviews: { enabled: true, average: 4.7, count: 1240 },
      platform: { banner: null, checkoutPaused: false, checkoutMessage: null },
    };
    return boot;
  },
  async unlock() {
    return { accessToken: 'mock-access', expiresAt: new Date(Date.now() + 43200000).toISOString() };
  },
  async products(id, q) {
    const b = get(id);
    return b ? list(b, q) : list({ store: MOCK_STORES[0]!, products: [], collections: [] }, q);
  },
  async product(id, handle) {
    const p = get(id)?.products.find((x) => x.handle === handle);
    return p ? { product: p } : null;
  },
  async productsByIds(id, ids) {
    return (get(id)?.products ?? []).filter((p) => ids.includes(p.id)).map(toCard);
  },
  async reviews(id, handle) {
    const p = get(id)?.products.find((x) => x.handle === handle);
    if (!p?.rating) return { average: null, count: 0, items: [], page: 1, pages: 0 };
    const names: Array<[string, string]> = [
      ['Ayesha K.', 'Exactly like the pictures. Packing was neat and delivery was quick.'],
      ['Bilal A.', 'Good quality for the price. Rider called before coming.'],
      ['Sana R.', 'Second time ordering, still happy. Cash on Delivery made it easy.'],
      ['Usman T.', 'Took a day longer than expected but the product is great.'],
    ];
    return {
      average: p.rating.average,
      count: p.rating.count,
      items: names.map(([name, comment], i) => ({ name, rating: i === 3 ? 4 : 5, comment, date: new Date(Date.now() - (i + 1) * 5 * 86400000).toISOString(), verified: true as const })),
      page: 1,
      pages: 1,
    };
  },
  async together(id, handle, limit) {
    const b = get(id);
    if (!b) return [];
    const p = b.products.find((x) => x.handle === handle);
    return b.products.filter((x) => x.id !== p?.id && x.availability !== 'out_of_stock').slice(0, limit).map(toCard);
  },
  async collections(id) {
    return (get(id)?.collections ?? []).map(({ id: cid, handle, title, url, image, productCount }): CollectionCard => ({ id: cid, handle, title, url, image, productCount }));
  },
  async collection(id, handle, q) {
    const b = get(id);
    if (!b) return null;
    const c =
      handle === 'all'
        ? { id: 'all', handle: 'all', title: 'All products', url: '/collections/all', image: null, productCount: b.products.length, descriptionHtml: '', seo: { title: 'All products', description: '', canonical: '/collections/all', image: null }, sort: 'featured' }
        : b.collections.find((x) => x.handle === handle);
    if (!c) return null;
    return { collection: c, products: list(b, { ...q, collection: handle }) };
  },
  async suggest(id, q) {
    const b = get(id);
    if (!b || q.trim().length < 2) return { products: [], collections: [], pages: [], queries: [] };
    const n = q.toLowerCase();
    return {
      products: b.products.filter((p) => `${p.title} ${p.category} ${p.brand ?? ''}`.toLowerCase().includes(n)).slice(0, 6).map(toCard),
      collections: b.collections.filter((c) => c.title.toLowerCase().includes(n)).slice(0, 3),
      pages: [],
      queries: [],
    };
  },
  async page(id, handle) {
    const b = get(id);
    if (!b) return null;
    const pages: Record<string, [string, string]> = {
      about: ['About us', `<p>${b.store.footerAbout}</p><h2>Why shop with us</h2><ul><li>Cash on Delivery in every city</li><li>Real photos of real products</li><li>WhatsApp support from real people</li></ul>`],
      contact: ['Contact us', `<p>WhatsApp: ${b.store.whatsapp}<br>Email: ${b.store.email}<br>Address: ${b.store.address}</p>`],
      faq: ['FAQ', '<h3>Do you offer Cash on Delivery?</h3><p>Yes, all over Pakistan.</p><h3>How long does delivery take?</h3><p>2 to 5 working days.</p>'],
    };
    const p = pages[handle];
    return p ? { id: handle, handle, title: p[0], bodyHtml: p[1], seo: { title: p[0], description: '', canonical: `/pages/${handle}` }, updatedAt: NOW } : null;
  },
  async policy(_id, kind) {
    const k = kind.replace(/-policy$|-of-service$/, '');
    const titles: Record<string, string> = { refund: 'Refund policy', shipping: 'Shipping policy', privacy: 'Privacy policy', terms: 'Terms of service' };
    if (!titles[k]) return null;
    return { kind: k as 'refund', title: titles[k]!, bodyHtml: '<p>We want you to love your order. If something is not right, message us on WhatsApp within 7 days of delivery and we will exchange or refund it.</p><h2>How it works</h2><ol><li>Send your order number and a photo.</li><li>Our rider collects the item, or you send it by courier.</li><li>Refunds go to your JazzCash, Easypaisa or bank account within 5 working days.</li></ol>', updatedAt: NOW };
  },
  async blog() {
    return null;
  },
  async article() {
    return null;
  },
  async redirect() {
    return null;
  },
  async sitemap(id) {
    const b = get(id);
    if (!b) return null;
    const base = 'http://localhost:3300';
    return {
      base,
      products: b.products.map((p) => ({ url: `${base}${p.url}`, updatedAt: NOW, image: p.image?.url ?? null })),
      collections: b.collections.map((c) => ({ url: `${base}${c.url}`, updatedAt: NOW })),
      pages: ['about', 'contact', 'faq'].map((h) => ({ url: `${base}/pages/${h}`, updatedAt: NOW })),
      blogs: [],
    };
  },

  async cartCreate(id, body) {
    const b = get(id)!;
    const c: Cart & { storeId: string } = {
      storeId: id,
      token: `mc_${rid()}`,
      itemCount: 0,
      currency: 'PKR',
      lines: [],
      subtotal: 0,
      discount: 0,
      coupon: null,
      shipping: null,
      codFee: 0,
      total: 0,
      freeShipping: null,
      contact: { name: null, phone: null, email: null },
      address: { address: null, city: null, province: null, postalCode: null, landmark: null },
      notes: null,
      paymentMethod: null,
      updatedAt: NOW,
    };
    carts.set(c.token, c);
    for (const l of body.lines ?? []) await mockApi.cartAdd(id, c.token, l);
    return recalc(b, c);
  },
  async cartGet(id, token) {
    const c = carts.get(token);
    return c && c.storeId === id ? recalc(get(id)!, c) : null;
  },
  async cartAdd(id, token, line) {
    const b = get(id)!;
    const c = carts.get(token);
    if (!c) throw new Error('Cart not found');
    const p = b.products.find((x) => x.id === line.productId);
    const v = p?.variants.find((x) => x.id === line.variantId) ?? p?.variants[0];
    if (!p || !v) throw new Error('Product not found');
    const lineId = `${p.id}:${v.id ?? '-'}`;
    const existing = c.lines.find((l) => l.lineId === lineId);
    if (existing) existing.quantity = Math.min(existing.quantity + line.quantity, v.maxQty || 99);
    else
      c.lines.push({
        lineId,
        productId: p.id,
        variantId: v.id,
        handle: p.handle,
        title: p.title,
        variantTitle: v.id ? v.title : null,
        image: p.image?.url ?? null,
        url: p.url,
        quantity: line.quantity,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        lineTotal: 0,
        availability: v.availability,
        maxQty: v.maxQty || 99,
        leadTime: v.leadTime,
        problem: null,
      });
    return recalc(b, c);
  },
  async cartLine(id, token, lineId, quantity) {
    const c = carts.get(token)!;
    c.lines = quantity <= 0 ? c.lines.filter((l) => l.lineId !== lineId) : c.lines.map((l) => (l.lineId === lineId ? { ...l, quantity } : l));
    return recalc(get(id)!, c);
  },
  async cartPatch(id, token, patch) {
    const b = get(id)!;
    const c = carts.get(token)!;
    if (patch.contact) c.contact = { ...c.contact, ...patch.contact };
    if (patch.address) c.address = { ...c.address, ...patch.address };
    if (patch.notes !== undefined) c.notes = patch.notes;
    if (patch.couponCode === null) c.coupon = null;
    if (patch.paymentMethod) c.paymentMethod = patch.paymentMethod;
    if (patch.shippingRateId && c.address.city) {
      const r = rates(b, c.address.city, c.subtotal).find((x) => x.id === patch.shippingRateId);
      if (r) {
        c.shipping = { rateId: r.id, name: r.name, price: r.price, eta: r.eta };
        c.codFee = r.codFee;
      }
    }
    return recalc(b, c);
  },
  async cartCoupon(id, token, code) {
    const b = get(id)!;
    const c = carts.get(token)!;
    const ok = code.trim().toUpperCase() === 'WELCOME10';
    if (ok) c.coupon = { code: 'WELCOME10', message: '10% off your order' };
    return { ok, message: ok ? '10% off your order' : 'This code is not valid', cart: recalc(b, c) };
  },
  async shippingRates(id, token, city) {
    const c = carts.get(token);
    return { rates: rates(get(id)!, city, c?.subtotal ?? 0), zone: city };
  },
  async deliveryQuote(id, q) {
    const list = rates(get(id)!, q.city, 0);
    return { city: q.city, subtotal: 0, zone: q.city, rates: list, freeShipping: null, reason: list.length ? null : 'Sorry, we do not deliver to this city yet' };
  },
  async checkout(id, body): Promise<CheckoutResult> {
    const b = get(id)!;
    const c = carts.get(body.cartToken);
    if (!c || !c.lines.length) throw new Error('Cart is empty');
    const r = rates(b, body.address.city, c.subtotal).find((x) => x.id === body.shippingRateId) ?? rates(b, body.address.city, c.subtotal)[0]!;
    const shipping = c.subtotal - c.discount >= (c.freeShipping?.threshold ?? Infinity) ? 0 : r.price;
    const codFee = body.paymentMethod === 'COD' ? r.codFee : 0;
    const total = c.subtotal - c.discount + shipping + codFee;
    const number = `#${b.store.slug.slice(0, 2).toUpperCase()}${++G.__nfMock!.seq}`;
    const token = `mo_${rid()}`;
    const prepaid = body.paymentMethod !== 'COD';
    const wa = `https://wa.me/92${b.store.whatsapp.slice(1)}?text=${encodeURIComponent(`Assalam o Alaikum! I placed order ${number} for Rs ${total}. Please confirm.`)}`;
    const view: OrderView = {
      orderNumber: number,
      status: 'PENDING',
      statusLabel: 'Order received',
      createdAt: new Date().toISOString(),
      total,
      subtotal: c.subtotal,
      discount: c.discount,
      shipping,
      codFee,
      paymentMethod: body.paymentMethod,
      paid: false,
      payment: { required: prepaid, kind: prepaid ? 'FULL' : null, amount: prepaid ? total : 0, url: prepaid ? '#pay' : null },
      lines: c.lines.map((l) => ({ title: l.title, variantTitle: l.variantTitle, quantity: l.quantity, price: l.price, image: l.image })),
      contact: { name: body.contact.name, phone: body.contact.phone.replace(/(\d{4})\d+(\d{3})/, '$1****$2') },
      address: { city: body.address.city },
      whatsappConfirmUrl: wa,
      trackUrl: `/account/track?no=${encodeURIComponent(number)}`,
    };
    orders.set(token, view);
    carts.delete(c.token);
    return { orderId: token, orderNumber: number, orderToken: token, total, paymentMethod: body.paymentMethod, payment: view.payment, whatsappConfirmUrl: wa, trackUrl: view.trackUrl };
  },
  async order(_id, token) {
    return orders.get(token) ?? null;
  },
  async track(_id, no) {
    const o = [...orders.values()].find((x) => x.orderNumber === no || x.orderNumber === `#${no.replace(/^#/, '')}`);
    if (!o) return null;
    return {
      status: o.status,
      label: o.statusLabel,
      total: o.total,
      paid: o.paid,
      closed: false,
      courier: null,
      steps: [
        { key: 'placed', label: 'Order placed', at: o.createdAt },
        { key: 'confirmed', label: 'Confirmed', at: null },
        { key: 'dispatched', label: 'Sent with courier', at: null },
        { key: 'delivered', label: 'Delivered', at: null },
      ],
    };
  },

  async otp(_id, body) {
    return { sent: true, channel: body.channel, expiresIn: 600, devCode: '123456' };
  },
  async verify(_id, body) {
    if (body.code !== '123456') throw new Error('Wrong code');
    return { token: `mcu_${rid()}`, expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), customer: { id: 'cu1', name: body.name ?? 'Ayesha Khan', phone: body.to, email: null, acceptsMarketing: true } };
  },
  async account(_id, tok) {
    if (!tok.startsWith('mcu_')) return null;
    return {
      customer: { id: 'cu1', name: 'Ayesha Khan', phone: '03001234567', email: null, acceptsMarketing: true },
      addresses: [{ id: 'a1', name: 'Ayesha Khan', phone: '03001234567', address: 'House 12, Street 4, DHA Phase 5', city: 'Lahore', province: 'PB', postalCode: null, landmark: 'Near Jalal Sons', default: true }],
    };
  },
  async accountOrders() {
    const items = [...orders.entries()].map(([orderToken, o]) => ({ orderNumber: o.orderNumber, orderToken, createdAt: o.createdAt, total: o.total, status: o.status, statusLabel: o.statusLabel, itemCount: o.lines.reduce((s, l) => s + l.quantity, 0) }));
    return { items, page: 1, pages: 1 };
  },
  async saveAddresses(_id, _tok, addresses) {
    return { addresses };
  },
  async portalLink() {
    return null;
  },
  async subscribe() {
    return { ok: true };
  },
  async report() {
    return { ok: true };
  },
  async events() {},
};

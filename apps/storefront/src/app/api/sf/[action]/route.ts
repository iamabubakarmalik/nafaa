/**
 * Browser → Nafaa API bridge. The shop comes from the x-nf-site header set by
 * middleware (never from the body); the cart token lives in the nafaa_cart
 * cookie and the shopper's login in the httpOnly nafaa_customer cookie, so
 * the browser never handles another shop's ids.
 *
 * POST /api/sf/<action> with a JSON body. Answers JSON; errors are
 * { error, code } with the API's status.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { api, ApiError, type CartPatch, type CheckoutBody, type PaymentCode, type ReportReason, type StoreEvent } from '@/lib/api';
import { decodeSite } from '@/lib/site';
import { ACCESS_COOKIE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const CART = 'nafaa_cart';
const CUSTOMER = 'nafaa_customer';
/** Readable flag (no secret) so the checkout knows a shopper is logged in. */
const CUSTOMER_FLAG = 'nafaa_customer_in';
const YEAR = 60 * 60 * 24 * 30;

type Handler = (ctx: { storeId: string; body: Record<string, unknown>; req: NextRequest; res: { cookies: Array<[string, string, number]> } }) => Promise<unknown>;

const s = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : undefined);
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

async function cartToken(storeId: string, req: NextRequest, res: { cookies: Array<[string, string, number]> }, create: boolean) {
  const tok = req.cookies.get(CART)?.value;
  if (tok) {
    const c = await api.cartGet(storeId, tok);
    if (c) return c.token;
  }
  if (!create) return null;
  const c = await api.cartCreate(storeId, {
    referrer: s(req.headers.get('referer'), 300),
  });
  res.cookies.push([CART, c.token, YEAR]);
  return c.token;
}

const handlers: Record<string, Handler> = {
  'cart.get': async ({ storeId, req }) => {
    const tok = req.cookies.get(CART)?.value;
    return { cart: tok ? await api.cartGet(storeId, tok) : null };
  },
  'cart.adopt': async ({ storeId, body, res }) => {
    const tok = s(body.token, 200);
    const c = tok ? await api.cartGet(storeId, tok) : null;
    if (c) res.cookies.push([CART, c.token, YEAR]);
    return { cart: c };
  },
  'cart.add': async ({ storeId, body, req, res }) => {
    const tok = (await cartToken(storeId, req, res, true))!;
    const line = { productId: s(body.productId, 100) ?? '', variantId: s(body.variantId, 100) ?? null, quantity: Math.max(1, Math.min(99, n(body.quantity) || 1)) };
    return { cart: await api.cartAdd(storeId, tok, line) };
  },
  'cart.line': async ({ storeId, body, req, res }) => {
    const tok = await cartToken(storeId, req, res, false);
    if (!tok) return { cart: null };
    return { cart: await api.cartLine(storeId, tok, s(body.lineId, 200) ?? '', Math.max(0, Math.min(99, n(body.quantity)))) };
  },
  'cart.patch': async ({ storeId, body, req, res }) => {
    const tok = await cartToken(storeId, req, res, false);
    if (!tok) return { cart: null };
    return { cart: await api.cartPatch(storeId, tok, body as CartPatch) };
  },
  'cart.coupon': async ({ storeId, body, req, res }) => {
    const tok = await cartToken(storeId, req, res, false);
    if (!tok) return { ok: false, message: 'Cart is empty', cart: null };
    const code = s(body.code, 60);
    if (!code) return { ok: true, message: '', cart: await api.cartPatch(storeId, tok, { couponCode: null }) };
    return api.cartCoupon(storeId, tok, code);
  },
  shipping: async ({ storeId, body, req, res }) => {
    const tok = await cartToken(storeId, req, res, false);
    if (!tok) return { rates: [], zone: null };
    return api.shippingRates(storeId, tok, s(body.city, 80) ?? '', s(body.province, 10));
  },
  'delivery.quote': async ({ storeId, body }) =>
    (await api.deliveryQuote(storeId, {
      city: s(body.city, 80) ?? '',
      productId: s(body.productId, 64) || null,
      variantId: s(body.variantId, 64) || null,
      qty: Math.max(1, Math.min(99, n(body.quantity) || 1)),
    })) ?? { rates: [], zone: null, reason: null },
  checkout: async ({ storeId, body, req, res }) => {
    const tok = await cartToken(storeId, req, res, false);
    if (!tok) throw new ApiError(400, 'Your cart is empty');
    const customerToken = req.cookies.get(CUSTOMER)?.value;
    const b = body as Partial<CheckoutBody>;
    const out = await api.checkout(storeId, {
      cartToken: tok,
      expectedTotal: n(b.expectedTotal),
      contact: { name: s(b.contact?.name, 120) ?? '', phone: s(b.contact?.phone, 20) ?? '', email: s(b.contact?.email, 160) || undefined },
      address: {
        address: s(b.address?.address, 300) ?? '',
        city: s(b.address?.city, 80) ?? '',
        province: s(b.address?.province, 20) || undefined,
        postalCode: s(b.address?.postalCode, 12) || undefined,
        landmark: s(b.address?.landmark, 200) || undefined,
      },
      shippingRateId: s(b.shippingRateId, 100) ?? '',
      paymentMethod: (s(b.paymentMethod, 20) ?? 'COD') as PaymentCode,
      notes: s(b.notes, 500) || undefined,
      acceptsMarketing: !!b.acceptsMarketing,
      customerToken: customerToken || undefined,
      hp: s(b.hp, 100) || undefined,
    });
    res.cookies.push([CART, '', 0]);
    return out;
  },
  suggest: async ({ storeId, body }) => api.suggest(storeId, s(body.q, 80) ?? ''),
  'products.byIds': async ({ storeId, body }) => ({ items: await api.productsByIds(storeId, (Array.isArray(body.ids) ? body.ids : []).slice(0, 50).map(String)) }),
  report: async ({ storeId, body }) =>
    api.report(storeId, {
      reason: (['SCAM', 'FAKE_PRODUCTS', 'NOT_DELIVERED', 'OFFENSIVE', 'COPYRIGHT', 'OTHER'].includes(String(body.reason)) ? body.reason : 'OTHER') as ReportReason,
      details: s(body.details, 2000),
      name: s(body.name, 120),
      contact: s(body.contact, 160),
      pageUrl: s(body.pageUrl, 500),
      hp: s(body.hp, 100),
    }),
  subscribe: async ({ storeId, body }) => api.subscribe(storeId, { email: s(body.email, 160), phone: s(body.phone, 20), source: s(body.source, 40) }),
  events: async ({ storeId, body }) => {
    const events = (Array.isArray(body.events) ? body.events : []).slice(0, 20) as StoreEvent[];
    if (events.length) await api.events(storeId, events);
    return { ok: true };
  },
  track: async ({ storeId, body }) => ({ result: await api.track(storeId, s(body.no, 40) ?? '', (s(body.phone, 20) ?? '').replace(/\D/g, '').slice(-4)) }),
  otp: async ({ storeId, body }) => api.otp(storeId, { channel: body.channel === 'email' ? 'email' : 'sms', to: s(body.to, 160) ?? '' }),
  verify: async ({ storeId, body, res }) => {
    const r = await api.verify(storeId, { to: s(body.to, 160) ?? '', code: s(body.code, 10) ?? '', name: s(body.name, 120) });
    res.cookies.push([CUSTOMER, r.token, YEAR], [CUSTOMER_FLAG, '1', YEAR]);
    return { customer: r.customer };
  },
  logout: async ({ res }) => {
    res.cookies.push([CUSTOMER, '', 0], [CUSTOMER_FLAG, '', 0]);
    return { ok: true };
  },
  account: async ({ storeId, req }) => {
    const tok = req.cookies.get(CUSTOMER)?.value;
    if (!tok) return { account: null, orders: null };
    const [account, orders] = await Promise.all([api.account(storeId, tok), api.accountOrders(storeId, tok, 1)]);
    return { account, orders };
  },
  'account.addresses': async ({ storeId, body, req }) => {
    const tok = req.cookies.get(CUSTOMER)?.value;
    if (!tok) throw new ApiError(401, 'Please log in again');
    return api.saveAddresses(storeId, tok, (Array.isArray(body.addresses) ? body.addresses : []).slice(0, 10));
  },
  portal: async ({ storeId, body, req }) => {
    const tok = req.cookies.get(CUSTOMER)?.value;
    if (!tok) throw new ApiError(401, 'Please log in again');
    return (await api.portalLink(storeId, tok, s(body.orderToken, 400) ?? '')) ?? { url: null };
  },
  unlock: async ({ storeId, body, res }) => {
    const r = await api.unlock(storeId, s(body.password, 200) ?? '');
    if (!r) throw new ApiError(401, 'Wrong password');
    res.cookies.push([ACCESS_COOKIE, r.accessToken, 60 * 60 * 12]);
    return { ok: true };
  },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const h = handlers[action];
  if (!h) return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
  const key = decodeSite(req.headers.get('x-nf-site') ?? '');
  if (!key) return NextResponse.json({ error: 'Unknown store' }, { status: 404 });
  const res = { cookies: [] as Array<[string, string, number]> };
  try {
    const ref = await api.resolve({ slug: key.slug, host: key.host });
    if (!ref) return NextResponse.json({ error: 'Unknown store' }, { status: 404 });
    let body: Record<string, unknown> = {};
    try {
      body = ((await req.json()) as Record<string, unknown>) ?? {};
    } catch {
      body = {};
    }
    const data = await h({ storeId: ref.storeId, body, req, res });
    const out = NextResponse.json(data ?? {});
    const secure = req.nextUrl.protocol === 'https:';
    for (const [name, value, maxAge] of res.cookies) {
      out.cookies.set(name, value, { path: '/', maxAge, sameSite: 'lax', secure, httpOnly: name !== CART && name !== CUSTOMER_FLAG });
    }
    return out;
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message, code: e.code, ...(e.body?.lines ? { lines: e.body.lines } : {}), ...(e.body?.cart ? { cart: e.body.cart } : {}) }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : 'Something went wrong';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

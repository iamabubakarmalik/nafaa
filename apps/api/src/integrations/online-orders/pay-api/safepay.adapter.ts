import { CheckoutInput, PayAdapter, PayApiError, PayCreds, PayEnv, PayStatus } from './types';

/**
 * Safepay (v3). Keys: public "sec_…" (merchant_api_key) + secret (header
 * X-SFPY-MERCHANT-SECRET). Flow: tracker banao → passport token (tbt) →
 * /embedded/ checkout URL → wapas aane par reporter API se pakki tasdeeq
 * (v3 return par koi signature nahi aata). Raqam PAISA me.
 */
const API: Record<PayEnv, string> = { sandbox: 'https://sandbox.api.getsafepay.com', live: 'https://api.getsafepay.com' };
const CHECKOUT: Record<PayEnv, string> = { sandbox: 'https://sandbox.api.getsafepay.com', live: 'https://getsafepay.com' };

async function call(env: PayEnv, creds: PayCreds, path: string, init: { method?: string; json?: unknown } = {}) {
  let res: Response;
  try {
    res = await fetch(`${API[env]}${path}`, {
      method: init.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-SFPY-MERCHANT-SECRET': creds.secretKey ?? '' },
      body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new PayApiError('Safepay tak nahi pahunch sake — thori der baad try karein');
  }
  const body: any = await res.json().catch(() => null);
  if (!res.ok || body?.status?.message === 'fail') {
    const err = (body?.status?.errors ?? []).join(', ') || `HTTP ${res.status}`;
    const auth = res.status === 401 || /not found|unauthori|secret/i.test(err);
    throw new PayApiError(auth ? `Safepay ne keys nahi maani (${env === 'sandbox' ? 'sandbox' : 'live'}) — dashboard → Developers se dobara copy karein` : `Safepay: ${err.slice(0, 200)}`, auth);
  }
  return body;
}

export const safepayAdapter: PayAdapter = {
  code: 'SAFEPAY',

  async test(creds, env) {
    if (!/^sec_/.test(creds.publicKey ?? '')) throw new PayApiError('Public key "sec_" se shuru hoti hai — Safepay dashboard → Developers', true);
    await call(env, creds, '/client/passport/v1/token', { method: 'POST', json: {} });
  },

  async create(creds, env, i: CheckoutInput) {
    const tr = await call(env, creds, '/order/payments/v3/', {
      method: 'POST',
      json: {
        merchant_api_key: creds.publicKey,
        intent: 'CYBERSOURCE',
        mode: 'payment',
        currency: 'PKR',
        amount: Math.round(i.amount * 100),
        metadata: { order_id: i.ref, source: 'nafaa' },
      },
    });
    const tracker = tr?.data?.tracker?.token;
    if (!tracker) throw new PayApiError('Safepay ne payment nahi banaya');
    const tbt = (await call(env, creds, '/client/passport/v1/token', { method: 'POST', json: {} }))?.data;
    const q = new URLSearchParams({
      environment: env === 'live' ? 'production' : 'sandbox',
      tracker,
      tbt: String(tbt ?? ''),
      source: 'hosted',
      order_id: i.ref,
      redirect_url: i.returnUrl,
      cancel_url: i.cancelUrl,
    });
    return { kind: 'redirect', url: `${CHECKOUT[env]}/embedded/?${q}`, providerRef: tracker };
  },

  async status(creds, env, tracker): Promise<PayStatus> {
    const r = await call(env, creds, `/reporter/api/v1/payments/${encodeURIComponent(tracker)}`);
    const d = r?.data?.tracker ?? r?.data ?? {};
    const state = String(d.state ?? '');
    const paisa = Number(d.purchase_totals?.quote_amount?.amount ?? d.amount ?? NaN);
    return {
      paid: state === 'TRACKER_ENDED',
      failed: ['TRACKER_CANCELLED', 'TRACKER_EXPIRED', 'TRACKER_VOIDED', 'TRACKER_REVERSED'].includes(state),
      amount: Number.isFinite(paisa) ? paisa / 100 : null,
      providerRef: tracker,
      message: state || null,
    };
  },
};

import { CheckoutInput, PayAdapter, PayApiError, PayCreds, PayEnv, PayStatus } from './types';

/**
 * Easypaisa Open API v4 — Mobile Account (MA). Header "Credentials:
 * base64(username:password)" (portal ka "Partner Account"). Customer apna
 * Easypaisa number deta hai, phone par approve karta hai. Pakki tasdeeq
 * inquire-transaction se: responseCode 0000 sirf inquiry ki kamyabi,
 * payment = transactionStatus "PAID".
 */
const HOST: Record<PayEnv, string> = { sandbox: 'https://easypaystg.easypaisa.com.pk', live: 'https://easypay.easypaisa.com.pk' };
const BASE = '/easypay-service/rest/v4';

async function post(env: PayEnv, creds: PayCreds, path: string, body: Record<string, string>, timeoutMs = 25_000) {
  let res: Response;
  try {
    res = await fetch(`${HOST[env]}${BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Credentials: Buffer.from(`${creds.username}:${creds.password}`).toString('base64'),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e: any) {
    throw new PayApiError(e?.name === 'TimeoutError' ? 'Easypaisa ne waqt par jawab nahi diya — thori der baad status dekhein' : 'Easypaisa tak nahi pahunch sake');
  }
  const json: any = await res.json().catch(() => null);
  if (!json) throw new PayApiError(`Easypaisa ka jawab samajh nahi aaya (HTTP ${res.status})`);
  return json;
}

const pkPhone = (p?: string) => {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.startsWith('92') && d.length === 12) d = '0' + d.slice(2);
  if (d.length === 10 && d.startsWith('3')) d = '0' + d;
  return d;
};

export const easypaisaAdapter: PayAdapter = {
  code: 'EASYPAISA',
  collect: ['mobile'],

  async test(creds, env) {
    const r = await post(env, creds, '/inquire-transaction', { orderId: 'NAFAATEST0', storeId: creds.storeId, accountNum: creds.accountNum });
    const code = String(r.responseCode ?? '');
    if (['0010', '0004', '0005', '0006', '0007'].includes(code)) {
      throw new PayApiError(`Easypaisa ne details nahi maani (${r.responseDesc ?? code}) — Store ID, account number aur Partner username/password dekhein`, true);
    }
  },

  async create(creds, env, i: CheckoutInput) {
    const mobile = pkPhone(i.wallet?.mobile);
    if (!/^03\d{9}$/.test(mobile)) throw new PayApiError('Easypaisa number 03xxxxxxxxx jaisa likhein');
    // Customer phone par approve karta hai — jawab me waqt lag sakta hai
    const r = await post(env, creds, '/initiate-ma-transaction', {
      orderId: i.ref,
      storeId: creds.storeId,
      transactionAmount: (Math.round(i.amount * 100) / 100).toFixed(1),
      transactionType: 'MA',
      mobileAccountNo: mobile,
      emailAddress: i.customer.email || 'no-reply@nafaa.pk',
    }, 90_000);
    const code = String(r.responseCode ?? '');
    const status: PayStatus = {
      // 0000 = request kamyab; pakka "PAID" inquiry se
      paid: false,
      failed: code !== '0000',
      amount: null,
      providerRef: r.transactionId ?? i.ref,
      message: r.responseDesc ?? code,
    };
    return { kind: 'wallet', providerRef: i.ref, status };
  },

  async status(creds, env, providerRef): Promise<PayStatus> {
    const r = await post(env, creds, '/inquire-transaction', { orderId: providerRef, storeId: creds.storeId, accountNum: creds.accountNum });
    const st = String(r.transactionStatus ?? '').toUpperCase();
    return {
      paid: String(r.responseCode) === '0000' && st === 'PAID',
      failed: ['FAILED', 'BLOCKED', 'EXPIRED', 'REVERSED'].includes(st),
      amount: r.transactionAmount !== undefined ? Number(r.transactionAmount) : null,
      providerRef: r.transactionId ?? providerRef,
      message: st || r.responseDesc || null,
    };
  },
};

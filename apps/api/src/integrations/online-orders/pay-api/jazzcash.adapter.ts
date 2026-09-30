import * as crypto from 'crypto';
import { CheckoutInput, PayAdapter, PayApiError, PayCreds, PayEnv, PayStatus } from './types';

/**
 * JazzCash Mobile Wallet (REST v2.0 DoMWalletTransaction) + PaymentInquiry.
 * Customer apna JazzCash number + CNIC ke aakhri 6 daalta hai, phone par
 * MPIN se approve karta hai. Hash: salt + '&' + saare khali-nahi pp* values
 * (key ki ASCII tarteeb) '&' se, HMAC-SHA256 (key = salt), hex.
 * Raqam PAISA me; TxnRefNo sirf harf/number, 20 tak.
 */
const HOST: Record<PayEnv, string> = { sandbox: 'https://sandbox.jazzcash.com.pk', live: 'https://payments.jazzcash.com.pk' };
const PAID = new Set(['000', '121']);
const PENDING = new Set(['124', '157']);

export function jazzcashHash(fields: Record<string, string>, salt: string) {
  const values = Object.keys(fields)
    .filter((k) => k.toLowerCase().startsWith('pp') && k !== 'pp_SecureHash' && fields[k] !== '' && fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map((k) => fields[k]);
  return crypto.createHmac('sha256', salt).update(`${salt}&${values.join('&')}`, 'utf8').digest('hex').toUpperCase();
}

/** yyyyMMddHHmmss Pakistan waqt (server UTC hai) */
export function pkStamp(d: Date) {
  return new Date(d.getTime() + 5 * 3600_000).toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

/** JazzCash ko ref: sirf A-Z0-9, 20 tak */
export const jcRef = (ref: string) => ref.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);

async function post(env: PayEnv, path: string, body: Record<string, string>, timeoutMs = 25_000) {
  let res: Response;
  try {
    res = await fetch(`${HOST[env]}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e: any) {
    throw new PayApiError(e?.name === 'TimeoutError' ? 'JazzCash ne waqt par jawab nahi diya — thori der baad status dekhein' : 'JazzCash tak nahi pahunch sake');
  }
  const json: any = await res.json().catch(() => null);
  if (!json) throw new PayApiError(`JazzCash ka jawab samajh nahi aaya (HTTP ${res.status})`);
  return json;
}

const pkPhone = (p?: string) => {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.startsWith('92') && d.length === 12) d = '0' + d.slice(2);
  if (d.length === 10 && d.startsWith('3')) d = '0' + d;
  return d;
};

export const jazzcashAdapter: PayAdapter = {
  code: 'JAZZCASH',
  collect: ['mobile', 'cnic'],

  async test(creds, env) {
    const f: Record<string, string> = { pp_MerchantID: creds.merchantId, pp_Password: creds.password, pp_TxnRefNo: 'T00000000000000000001'.slice(0, 20), pp_Version: '1.1' };
    f.pp_SecureHash = jazzcashHash(f, creds.integritySalt);
    const r = await post(env, '/ApplicationAPI/API/PaymentInquiry/Inquire', f);
    const code = String(r.pp_ResponseCode ?? '');
    if (code === '101' || code === '115') throw new PayApiError(`JazzCash ne keys nahi maani (${r.pp_ResponseMessage ?? code}) — Merchant ID, Password, Integrity Salt dobara dekhein`, true);
  },

  async create(creds, env, i: CheckoutInput) {
    const mobile = pkPhone(i.wallet?.mobile);
    const cnic = String(i.wallet?.cnic ?? '').replace(/\D/g, '').slice(-6);
    if (!/^03\d{9}$/.test(mobile)) throw new PayApiError('JazzCash number 03xxxxxxxxx jaisa likhein');
    if (cnic.length !== 6) throw new PayApiError('CNIC ke aakhri 6 hindse likhein');
    const now = new Date();
    const ref = jcRef(i.ref);
    const f: Record<string, string> = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: creds.merchantId,
      pp_SubMerchantID: '',
      pp_Password: creds.password,
      pp_BankID: '',
      pp_ProductID: '',
      pp_TxnRefNo: ref,
      pp_Amount: String(Math.round(i.amount * 100)),
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: pkStamp(now),
      pp_BillReference: ref,
      pp_Description: i.description.replace(/[<>\\*=%/:'|"{}]/g, ' ').slice(0, 100),
      pp_TxnExpiryDateTime: pkStamp(new Date(now.getTime() + 24 * 3600_000)),
      pp_MobileNumber: mobile,
      pp_CNIC: cnic,
      ppmpf_1: '', ppmpf_2: '', ppmpf_3: '', ppmpf_4: '', ppmpf_5: '',
    };
    f.pp_SecureHash = jazzcashHash(f, creds.integritySalt);
    // Customer phone par MPIN daalta hai — jawab me 60s tak lag sakte hain
    const r = await post(env, '/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction', f, 90_000);
    const code = String(r.pp_ResponseCode ?? '');
    const status: PayStatus = {
      paid: PAID.has(code),
      failed: !PAID.has(code) && !PENDING.has(code),
      amount: r.pp_Amount ? Number(r.pp_Amount) / 100 : null,
      providerRef: r.pp_RetreivalReferenceNo ?? ref,
      message: r.pp_ResponseMessage ?? code,
    };
    return { kind: 'wallet', providerRef: ref, status };
  },

  async status(creds, env, providerRef): Promise<PayStatus> {
    const f: Record<string, string> = { pp_MerchantID: creds.merchantId, pp_Password: creds.password, pp_TxnRefNo: jcRef(providerRef), pp_Version: '1.1' };
    f.pp_SecureHash = jazzcashHash(f, creds.integritySalt);
    const r = await post(env, '/ApplicationAPI/API/PaymentInquiry/Inquire', f);
    // pp_ResponseCode = inquiry ka natija, pp_PaymentResponseCode = payment ka
    const pay = String(r.pp_PaymentResponseCode ?? '');
    return {
      paid: PAID.has(pay),
      failed: !!pay && !PAID.has(pay) && !PENDING.has(pay),
      amount: null,
      providerRef: r.pp_RetrievalReferenceNo ?? providerRef,
      message: r.pp_PaymentResponseMessage ?? r.pp_ResponseMessage ?? null,
    };
  },
};

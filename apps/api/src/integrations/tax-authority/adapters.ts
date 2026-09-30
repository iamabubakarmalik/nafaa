/* ═════════════════════════════════════════════════════════════
   SUBA'I TAX AUTHORITIES — services (restaurant, salon, …) ka sales tax.
     PRA  (Punjab) — PRAL e-IMS "PostData" (FBR POS jaisa)      [PRA manual 2026]
     SRB  (Sindh)  — ePOSGateway SalesInvoiceService (flat JSON) [SRB New POS API V1]
     KPRA (KP)     — RIMS integration (flat JSON)                [posregistration.kpra.gov.pk/docs]
     FBR  (Tier-1 retailer POS) — IMS "PostData", PRA jaisa hi format
   Har adapter: request banao → bhejo → fiscal number + QR nikalo.
   ═════════════════════════════════════════════════════════════ */

export type Authority = 'PRA' | 'SRB' | 'KPRA' | 'FBR';
export type Env = 'sandbox' | 'live';

export interface AuthorityCreds {
  posId: string;
  ntn: string;
  /** PRA: bearer token · SRB: pos_user · KPRA: key */
  token?: string;
  user?: string;
  pass?: string;
  key?: string;
}

export interface FiscalLine { code: string; name: string; qty: number; total: number }
export interface FiscalBill {
  usin: string;
  /** Asal bill (return ke liye) */
  refUsin?: string;
  kind: 'SALE' | 'RETURN';
  at: Date;
  /** Tax samet kul raqam (Nafaa ki qeemat tax samet maani jati hai) */
  total: number;
  rate: number;
  payment: string;
  buyer: { name?: string | null; phone?: string | null; ntn?: string | null; cnic?: string | null; email?: string | null; address?: string | null };
  lines: FiscalLine[];
  pctCode: string;
  businessName: string;
  reason?: string;
}

export interface FiscalResult { ok: boolean; fiscalNumber?: string; qrText?: string; error?: string; retry: boolean; response?: unknown }

export const AUTHORITIES: Record<Authority, { name: string; province: string; portal: string; docs: string; fields: Array<{ key: keyof AuthorityCreds; label: string; secret?: boolean }> }> = {
  PRA: {
    name: 'PRA — Punjab Revenue Authority', province: 'Punjab', portal: 'https://reg.pra.punjab.gov.pk/', docs: 'https://e.pra.punjab.gov.pk/templates/POS_COMPONENT_and_eIMS_User_Manual.pdf',
    fields: [{ key: 'posId', label: 'POS ID' }, { key: 'ntn', label: 'NTN / PNTN' }, { key: 'token', label: 'Token (POS Details tab)', secret: true }],
  },
  SRB: {
    name: 'SRB — Sindh Revenue Board', province: 'Sindh', portal: 'https://pos.srb.gos.pk/PoSRegistration/', docs: 'https://www.srb.gos.pk/srb/wp-content/uploads/2026/01/New-POS-API-Document-V1.pdf',
    fields: [{ key: 'posId', label: 'POS ID' }, { key: 'ntn', label: 'SNTN' }, { key: 'user', label: 'POS user' }, { key: 'pass', label: 'POS password', secret: true }],
  },
  FBR: {
    name: 'FBR — POS integration (Tier-1 retailer)', province: 'Pakistan', portal: 'https://e.fbr.gov.pk/', docs: 'https://github.com/Tier3-Pk/FBR-POS-INTEGRATION-SERVICES',
    fields: [{ key: 'posId', label: 'POS ID' }, { key: 'ntn', label: 'NTN' }, { key: 'token', label: 'Security token (e.fbr.gov.pk)', secret: true }],
  },
  KPRA: {
    name: 'KPRA — Khyber Pakhtunkhwa Revenue Authority', province: 'Khyber Pakhtunkhwa', portal: 'https://posregistration.kpra.gov.pk/', docs: 'https://posregistration.kpra.gov.pk/docs',
    fields: [{ key: 'posId', label: 'POS ID' }, { key: 'ntn', label: 'NTN' }, { key: 'key', label: 'Key', secret: true }],
  },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Tax samet raqam → (baghair tax, tax) */
export function splitTax(total: number, rate: number) {
  const value = r2(total / (1 + rate / 100));
  return { value, tax: r2(total - value) };
}

/** PKT me "YYYY-MM-DD HH:mm:ss" (server UTC hai) */
export function pkDateTime(d: Date) {
  const t = new Date(d.getTime() + 5 * 3_600_000).toISOString();
  return `${t.slice(0, 10)} ${t.slice(11, 19)}`;
}

/** Lines ko bill ke total ke barabar karo (discount / service charge baant do) */
export function scaleLines(lines: FiscalLine[], total: number): FiscalLine[] {
  const sum = lines.reduce((t, l) => t + l.total, 0);
  if (!lines.length || sum <= 0) return [{ code: 'BILL', name: 'Bill', qty: 1, total: r2(total) }];
  const f = total / sum;
  const out = lines.map((l) => ({ ...l, total: r2(l.total * f) }));
  const diff = r2(total - out.reduce((t, l) => t + l.total, 0));
  out[out.length - 1].total = r2(out[out.length - 1].total + diff);
  return out;
}

const na = (v?: string | null) => (v && String(v).trim() ? String(v).trim() : 'N/A');
const isCash = (p: string) => p === 'CASH';

/* ─────────────────────────── PRA ─────────────────────────── */

export const PRA_URL: Record<Env, string> = {
  sandbox: 'https://ims.pral.com.pk/ims/sandbox/api/Live/PostData',
  live: 'https://ims.pral.com.pk/ims/production/api/Live/PostData',
};

export const FBR_URL: Record<Env, string> = {
  sandbox: 'https://esp.fbr.gov.pk:8244/FBR/v1/api/Live/PostData',
  live: 'https://gw.fbr.gov.pk/imsp/v1/api/Live/PostData',
};

export function praRequest(b: FiscalBill, c: AuthorityCreds) {
  const type = b.kind === 'RETURN' ? 3 : 1;
  const lines = scaleLines(b.lines, b.total).map((l) => {
    const t = splitTax(l.total, b.rate);
    return {
      ItemCode: l.code.slice(0, 50), ItemName: l.name.slice(0, 150), PCTCode: b.pctCode, Quantity: l.qty,
      TaxRate: b.rate, SaleValue: t.value, Discount: 0, FurtherTax: 0, TaxCharged: t.tax, TotalAmount: l.total,
      InvoiceType: type, RefUSIN: b.refUsin ?? null,
    };
  });
  const t = splitTax(b.total, b.rate);
  return {
    InvoiceNumber: '',
    POSID: Number(c.posId),
    USIN: b.usin.slice(0, 50),
    RefUSIN: b.refUsin ?? null,
    DateTime: pkDateTime(b.at),
    BuyerName: b.buyer.name ?? '',
    BuyerPNTN: b.buyer.ntn ?? '',
    BuyerCNIC: b.buyer.cnic ?? '',
    BuyerPhoneNumber: b.buyer.phone ?? '',
    TotalSaleValue: t.value,
    TotalTaxCharged: t.tax,
    TotalQuantity: lines.reduce((s, l) => s + l.Quantity, 0),
    Discount: 0,
    FurtherTax: 0,
    TotalBillAmount: r2(b.total),
    PaymentMode: isCash(b.payment) ? 1 : b.payment === 'CARD' ? 2 : 5,
    InvoiceType: type,
    Items: lines,
  };
}

export function praParse(status: number, body: any, who: 'PRA' | 'FBR' = 'PRA'): FiscalResult {
  if (body && String(body.Code) === '100' && body.InvoiceNumber) {
    return { ok: true, fiscalNumber: String(body.InvoiceNumber), qrText: String(body.InvoiceNumber), retry: false, response: body };
  }
  const msg = body?.Response || (Array.isArray(body?.Errors) ? body.Errors.join(', ') : body?.Errors) || `HTTP ${status}`;
  return { ok: false, error: `${who}: ${msg}`, retry: status >= 500 || status === 0 || status === 429, response: body };
}

/* ─────────────────────────── SRB ─────────────────────────── */

export const SRB_URL = 'https://pos.srb.gos.pk/ePOSGateway/v1/SalesInvoiceService.api';

export function srbRequest(b: FiscalBill, c: AuthorityCreds, env: Env) {
  const t = splitTax(b.total, b.rate);
  // SRB: har khana hona zaroori — khali text "N/A", khali number 0
  return {
    posId: Number(c.posId),
    name: na(b.businessName),
    ntn: c.ntn,
    invoiceDateTime: pkDateTime(b.at),
    invoiceType: b.kind === 'RETURN' ? 2 : 1,
    invoiceId: b.usin.slice(0, 50),
    rateValue: b.rate,
    saleValue: t.value,
    taxAmount: t.tax,
    discountAmount: 0,
    netAmount: r2(b.total),
    modeOfPay: isCash(b.payment) ? 'Cash' : 'Card',
    consumerName: na(b.buyer.name),
    consumerNTN: na(b.buyer.ntn),
    consumerMobile: na(b.buyer.phone),
    consumerEmail: na(b.buyer.email),
    address: na(b.buyer.address),
    cpcCode: na(b.pctCode),
    extraInf: b.refUsin ? `Return of ${b.refUsin}` : 'N/A',
    transType: env === 'live' ? 'Live' : 'Test',
    pos_user: c.user ?? '',
    pos_pass: c.pass ?? '',
  };
}

export function srbParse(status: number, body: any): FiscalResult {
  if (body && String(body.resCode) === '00' && body.srbInvoiceId) {
    return { ok: true, fiscalNumber: String(body.srbInvoiceId), qrText: String(body.QRCodeLink ?? body.srbInvoiceId), retry: false, response: body };
  }
  const msg = body?.errorMessage || body?.error || body?.message || (body?.resCode ? `code ${body.resCode}` : `HTTP ${status}`);
  return { ok: false, error: `SRB: ${msg}`, retry: status >= 500 || status === 0 || status === 429, response: body };
}

/* ─────────────────────────── KPRA ────────────────────────── */

export const KPRA_URL = { invoice: 'https://kpra.gov.pk/api/rims-integration', credit: 'https://kpra.gov.pk/api/kpra-credit-note' };

export function kpraRequest(b: FiscalBill, c: AuthorityCreds) {
  const t = splitTax(b.total, b.rate);
  const base = { ntn: c.ntn, pos_id: c.posId, key: c.key ?? c.token ?? '' };
  if (b.kind === 'RETURN') {
    return {
      ...base, invoice_no: b.refUsin ?? '', credit_note_no: b.usin.slice(0, 50), note_type: 'partial', reason: (b.reason || 'Return').slice(0, 200),
      amount: t.value, tax_rate: b.rate, tax_amount: t.tax, total_amount: r2(b.total), note_date: pkDateTime(b.at),
    };
  }
  return {
    ...base, invoice_no: b.usin.slice(0, 50), amount: t.value, tax_rate: b.rate, tax_amount: t.tax, total_amount: r2(b.total),
    date_time: pkDateTime(b.at), payment_mode: isCash(b.payment) ? 1 : 2,
  };
}

export function kpraParse(status: number, body: any, c: AuthorityCreds, usin: string): FiscalResult {
  if ((status === 201 || status === 200) && (body?.status === 201 || body?.status === 200 || body?.data)) {
    const id = body?.data?.transaction_id ?? body?.data?.credit_note_no ?? usin;
    return {
      ok: true, fiscalNumber: String(id),
      qrText: `https://kpra.gov.pk/api/?pos_id=${encodeURIComponent(c.posId)}&invoice_no=${encodeURIComponent(usin)}`,
      retry: false, response: body,
    };
  }
  const msg = body?.message || body?.error || (body?.errors && JSON.stringify(body.errors)) || `HTTP ${status}`;
  return { ok: false, error: `KPRA: ${msg}`, retry: status >= 500 || status === 0 || status === 429, response: body };
}

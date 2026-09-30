import { AccountMapping, DayData, JournalLine, PAY_METHODS, PayMethod, buildDailyJournal } from './daily-journal';

/* ═════════════════════════════════════════════════════════════
   TALLY — Pakistan me aksar accountant TallyPrime chalate hain. Tally
   ka koi cloud API nahi, is liye XML file: Gateway of Tally → Import →
   Transactions. Har din ke 5 tak voucher (Tally ke apne qaide se):

     Sales    — Dr Cash/Card/Bank/wallet, Dr Udhaar, Dr Discount | Cr Sales
     Payment  — Dr Sales Returns                                 | Cr Cash… (refund)
     Receipt  — Dr Cash…                                         | Cr Udhaar (wapsi)
     Payment  — Dr Kharcha                                       | Cr Cash… (kharche)
     Journal  — Dr Cost of goods                                 | Cr Stock (optional)

   Cash/Bank ledger Tally ke Journal me nahi chalte, is liye alag types.
   Har voucher ki REMOTEID pakki hai — same din dobara import karein to
   naya nahi banta, purana badal jata hai.
   ═════════════════════════════════════════════════════════════ */

export interface TallySettings {
  /** Ledger ke NAAM (Tally me naam hi pehchan hai) */
  mapping: AccountMapping;
  includeCogs: boolean;
  includeExpenses: boolean;
  /** Khali = jo company Tally me khuli hai */
  companyName: string;
  /** Ledger banane wala hissa bhi file me (pehli dafa ke liye) */
  includeMasters: boolean;
}

export const TALLY_DEFAULTS: TallySettings = {
  mapping: {
    sales: 'Sales - Nafaa POS',
    discounts: 'Discount Allowed',
    returns: 'Sales Returns',
    receivable: 'Udhaar Customers (Nafaa)',
    cogs: 'Cost of Goods Sold',
    inventory: 'Stock - Nafaa',
    expenseDefault: 'Shop Expenses',
    methods: { CASH: 'Cash', CARD: 'Card Machine (Bank)', BANK_TRANSFER: 'Bank Account', JAZZCASH: 'JazzCash Wallet', EASYPAISA: 'Easypaisa Wallet' },
    collectionMethod: 'CASH',
  },
  includeCogs: false,
  includeExpenses: true,
  companyName: '',
  includeMasters: true,
};

/** Har ledger kis Tally group me banta hai (Tally ke apne group naam) */
const GROUP: Record<string, string> = {
  sales: 'Sales Accounts', returns: 'Sales Accounts', discounts: 'Indirect Expenses', receivable: 'Sundry Debtors',
  cogs: 'Direct Expenses', inventory: 'Current Assets', expense: 'Indirect Expenses',
  CASH: 'Cash-in-Hand', CARD: 'Bank Accounts', BANK_TRANSFER: 'Bank Accounts', JAZZCASH: 'Bank Accounts', EASYPAISA: 'Bank Accounts',
};

export function mergeTallySettings(raw: Partial<TallySettings> | null | undefined): TallySettings {
  const m = raw?.mapping ?? {};
  const clean = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 100) : d);
  const D = TALLY_DEFAULTS.mapping;
  return {
    mapping: {
      sales: clean(m.sales, D.sales!), discounts: clean(m.discounts, D.discounts!), returns: clean(m.returns, D.returns!),
      receivable: clean(m.receivable, D.receivable!), cogs: clean(m.cogs, D.cogs!), inventory: clean(m.inventory, D.inventory!),
      expenseDefault: clean(m.expenseDefault, D.expenseDefault!),
      methods: Object.fromEntries(PAY_METHODS.map((p) => [p, clean(m.methods?.[p], D.methods![p]!)])) as Record<PayMethod, string>,
      expenseByCategory: Object.fromEntries(Object.entries(m.expenseByCategory ?? {}).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, String(v).trim().slice(0, 100)])),
      collectionMethod: PAY_METHODS.includes(m.collectionMethod as PayMethod) ? m.collectionMethod : 'CASH',
    },
    includeCogs: raw?.includeCogs ?? TALLY_DEFAULTS.includeCogs,
    includeExpenses: raw?.includeExpenses ?? TALLY_DEFAULTS.includeExpenses,
    companyName: clean(raw?.companyName, ''),
    includeMasters: raw?.includeMasters ?? TALLY_DEFAULTS.includeMasters,
  };
}

export interface TallyVoucher {
  day: string;
  kind: 'sales' | 'refund' | 'receipt' | 'expense' | 'cogs';
  type: 'Sales' | 'Payment' | 'Receipt' | 'Journal';
  number: string;
  narration: string;
  lines: JournalLine[];
}

const EMPTY: DayData = { sales: [], returns: [], collections: [], expenses: [] };
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Ek din ke vouchers — ledger naam har line ke accountId me */
export function tallyVouchers(day: string, data: DayData, s: TallySettings): TallyVoucher[] {
  // Kharche ki category ka apna ledger: mapping, warna category ka naam, warna aam kharcha
  const expenseByCategory = { ...(s.mapping.expenseByCategory ?? {}) };
  for (const e of data.expenses) if (e.categoryId && !expenseByCategory[e.categoryId]) expenseByCategory[e.categoryId] = (e.categoryName ?? '').trim().slice(0, 100) || s.mapping.expenseDefault!;
  const map: AccountMapping = { ...s.mapping, expenseByCategory };

  const out: TallyVoucher[] = [];
  const add = (kind: TallyVoucher['kind'], type: TallyVoucher['type'], part: Partial<DayData>, narration: string, code: string) => {
    const j = buildDailyJournal({ ...EMPTY, ...part }, map);
    if (j.lines.length) out.push({ day, kind, type, number: `NAFAA/${day}/${code}`, narration, lines: j.lines });
    return j;
  };

  const sj = add('sales', 'Sales', { sales: data.sales }, `Nafaa POS — ${data.sales.length} bill (${day})`, 'S');
  add('refund', 'Payment', { returns: data.returns }, `Nafaa POS — returns / refund (${day})`, 'R');
  add('receipt', 'Receipt', { collections: data.collections }, `Nafaa — udhaar wapsi (${day})`, 'C');
  if (s.includeExpenses) add('expense', 'Payment', { expenses: data.expenses }, `Nafaa — kharche (${day})`, 'E');
  if (s.includeCogs && sj.totals.cogs > 0) {
    const c = r2(data.sales.reduce((t, x) => t + Math.max(0, x.costOfGoods || 0), 0));
    out.push({
      day, kind: 'cogs', type: 'Journal', number: `NAFAA/${day}/G`, narration: `Nafaa — bika hua maal (cost) ${day}`,
      lines: [
        { accountId: s.mapping.cogs!, side: 'debit', amount: c, description: 'Cost of goods sold' },
        { accountId: s.mapping.inventory!, side: 'credit', amount: c, description: 'Cost of goods sold' },
      ],
    });
  }
  return out;
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const ymd = (day: string) => day.replace(/-/g, '');

/** Istemal hue ledgers + unke groups (masters) */
export function ledgersUsed(vouchers: TallyVoucher[], s: TallySettings): Array<{ name: string; group: string }> {
  const groupOf = new Map<string, string>();
  const m = s.mapping;
  const set = (name: string | null | undefined, g: string) => { if (name && !groupOf.has(name)) groupOf.set(name, g); };
  for (const p of PAY_METHODS) set(m.methods?.[p], GROUP[p]);
  set(m.sales, GROUP.sales); set(m.returns, GROUP.returns); set(m.discounts, GROUP.discounts); set(m.receivable, GROUP.receivable);
  set(m.cogs, GROUP.cogs); set(m.inventory, GROUP.inventory); set(m.expenseDefault, GROUP.expense);
  const used = new Set(vouchers.flatMap((v) => v.lines.map((l) => l.accountId)));
  return [...used].map((name) => ({ name, group: groupOf.get(name) ?? GROUP.expense })).sort((a, b) => a.name.localeCompare(b.name));
}

function envelope(report: 'All Masters' | 'Vouchers', company: string, body: string) {
  return `<ENVELOPE>
 <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>${report}</REPORTNAME>${company ? `
    <STATICVARIABLES><SVCURRENTCOMPANY>${esc(company)}</SVCURRENTCOMPANY></STATICVARIABLES>` : ''}
   </REQUESTDESC>
   <REQUESTDATA>
${body}
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;
}

export function mastersXml(ledgers: Array<{ name: string; group: string }>, s: TallySettings) {
  // ACTION nahi diya: Tally pehle se bana ledger chhor deta / mila deta hai (import ki "Combine" setting)
  const body = ledgers.map((l) => `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <LEDGER NAME="${esc(l.name)}">
      <NAME.LIST><NAME>${esc(l.name)}</NAME></NAME.LIST>
      <PARENT>${esc(l.group)}</PARENT>
      <ISBILLWISEON>No</ISBILLWISEON>
     </LEDGER>
    </TALLYMESSAGE>`).join('\n');
  return envelope('All Masters', s.companyName, body);
}

export function vouchersXml(tenantId: string, vouchers: TallyVoucher[], s: TallySettings) {
  const body = vouchers.map((v) => {
    const entries = [...v.lines]
      .sort((a, b) => (a.side === b.side ? 0 : a.side === 'debit' ? -1 : 1))
      .map((l) => `      <ALLLEDGERENTRIES.LIST>
       <LEDGERNAME>${esc(l.accountId)}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>${l.side === 'debit' ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
       <AMOUNT>${(l.side === 'debit' ? -l.amount : l.amount).toFixed(2)}</AMOUNT>
      </ALLLEDGERENTRIES.LIST>`).join('\n');
    return `    <TALLYMESSAGE xmlns:UDF="TallyUDF">
     <VOUCHER REMOTEID="nafaa:${esc(tenantId)}:${v.day}:${v.kind}" VCHTYPE="${v.type}" ACTION="Create" OBJVIEW="Accounting Voucher View">
      <DATE>${ymd(v.day)}</DATE>
      <EFFECTIVEDATE>${ymd(v.day)}</EFFECTIVEDATE>
      <VOUCHERTYPENAME>${v.type}</VOUCHERTYPENAME>
      <VOUCHERNUMBER>${esc(v.number)}</VOUCHERNUMBER>
      <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
      <ISINVOICE>No</ISINVOICE>
      <NARRATION>${esc(v.narration)}</NARRATION>
${entries}
     </VOUCHER>
    </TALLYMESSAGE>`;
  }).join('\n');
  return envelope('Vouchers', s.companyName, body);
}

/** Excel / accountant ke liye "day book" CSV */
export function dayBookCsv(vouchers: TallyVoucher[]) {
  const q = (v: string | number) => { const t = String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const rows = [['Date', 'Voucher type', 'Voucher no', 'Ledger', 'Debit', 'Credit', 'Narration']];
  for (const v of vouchers) for (const l of v.lines) {
    rows.push([v.day, v.type, v.number, l.accountId, l.side === 'debit' ? l.amount.toFixed(2) : '', l.side === 'credit' ? l.amount.toFixed(2) : '', v.narration]);
  }
  return '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n');
}

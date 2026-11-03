/** A customer's khata statement as text (WhatsApp) and PDF, in the shop's bill language. */

import { balanceState, LEDGER_WORDS, statementText, statementTotals, STATEMENT_WORDS, waLink, type MessageLang } from '@nafaa/core/customers';
import { formatDate, formatMoney } from '@/core/format';
import { esc } from '@/modules/sales/lib/share';
import type { LedgerEntry } from '../api/customers';

export interface StatementInput {
  name: string; phone?: string | null; shop: string; balance: number; entries: LedgerEntry[]; lang: MessageLang;
}

const sign = (n: number) => `${n > 0 ? '+' : '−'}${formatMoney(Math.abs(n))}`;

export function statementMessage(i: StatementInput): string {
  const tot = statementTotals(i.entries, i.balance);
  const words = LEDGER_WORDS[i.lang];
  return statementText({
    name: i.name, shop: i.shop, balance: formatMoney(Math.abs(i.balance)), state: balanceState(i.balance), taken: formatMoney(tot.taken), paid: formatMoney(tot.paid),
    lines: i.entries.map((e) => ({ date: formatDate(e.createdAt), label: words[e.type] ?? e.type, amount: sign(e.amount), balance: formatMoney(e.balanceAfter) })),
  }, i.lang);
}

export const statementLink = (i: StatementInput) => waLink(i.phone, statementMessage(i));

export function statementHtml(i: StatementInput): string {
  const W = STATEMENT_WORDS[i.lang];
  const words = LEDGER_WORDS[i.lang];
  const tot = statementTotals(i.entries, i.balance);
  const state = balanceState(i.balance);
  const dir = i.lang === 'ur' ? 'rtl' : 'ltr';
  const rows = [...i.entries].reverse().map((e) => `<tr><td>${esc(formatDate(e.createdAt))}</td><td>${esc(words[e.type] ?? e.type)}${e.reference ? ` · ${esc(e.reference)}` : ''}</td>
    <td class="n" style="color:${e.amount > 0 ? '#b91c1c' : '#15803d'}">${esc(sign(e.amount))}</td><td class="n">${esc(formatMoney(e.balanceAfter))}</td></tr>`).join('');
  return `<html dir="${dir}"><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;padding:28px;color:#0f172a}
    h1{font-size:22px;margin:0}h2{font-size:14px;color:#475569;margin:2px 0 18px;font-weight:500}
    .box{display:flex;gap:12px;margin-bottom:18px}.box div{flex:1;background:#f1f5f9;border-radius:10px;padding:10px 12px}
    .box b{display:block;font-size:18px;margin-top:2px}table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:start;color:#64748b;font-weight:600;border-bottom:1px solid #cbd5e1;padding:6px 4px}td{padding:6px 4px;border-bottom:1px solid #e2e8f0}.n{text-align:end;direction:ltr;white-space:nowrap}
    .foot{margin-top:22px;color:#475569;font-size:13px}</style></head><body>
    <h1>${esc(W.title)}: ${esc(i.name)}</h1><h2>${esc(i.shop)}${i.phone ? ` · <span dir="ltr">${esc(i.phone)}</span>` : ''} · ${esc(formatDate(Date.now()))}</h2>
    <div class="box"><div>${esc(W.taken)}<b dir="ltr">${esc(formatMoney(tot.taken))}</b></div><div>${esc(W.paid)}<b dir="ltr">${esc(formatMoney(tot.paid))}</b></div>
    <div>${esc(state === 'owes' ? W.owes : state === 'advance' ? W.advance : W.clear)}<b dir="ltr">${esc(formatMoney(Math.abs(i.balance)))}</b></div></div>
    <table><thead><tr><th>${esc(i.lang === 'en' ? 'Date' : i.lang === 'ur' ? 'تاریخ' : 'Date')}</th><th></th><th class="n">${esc(i.lang === 'en' ? 'Amount' : i.lang === 'ur' ? 'رقم' : 'Amount')}</th><th class="n">${esc(i.lang === 'en' ? 'Balance' : i.lang === 'ur' ? 'باقی' : 'Baqi')}</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="foot">${esc(state === 'owes' ? W.ask : W.thanks)}</p></body></html>`;
}

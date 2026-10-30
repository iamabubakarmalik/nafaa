/**
 * Principal claim statement: an A4 page for the company (business and
 * principal blocks, scheme lines and market return lines, totals,
 * signatures) and the same lines as a CSV download.
 */

import { esc } from '@core/receipt/html';
import { printHtml } from '@core/receipt/print';
import type { ClaimLine, ClaimStatement } from '../../api/phase2.api';
import { CLAIM_STATUS_LABEL } from '../../api/phase2.api';
import { dayYearLabel, rs, trim } from '../../lib/meta';

const keyLabel = (k: string) => dayYearLabel(`${k}T12:00:00`);

function rowsHtml(lines: ClaimLine[], kind: ClaimLine['kind']) {
  return lines.filter((l) => l.kind === kind).map((l, i) => kind === 'SCHEME'
    ? `<tr><td>${i + 1}</td><td>${esc(dayYearLabel(l.date))}</td><td>${esc(l.invoiceNumber ?? l.docNumber)}</td><td>${esc(l.customerName ?? '')}</td>
        <td>${esc(l.productName ?? '')}<div class="sub">${esc(l.schemeName ?? '')}</div></td><td class="r">${esc(trim(l.qty))}</td>
        <td class="r">${l.discount ? esc(rs(l.discount)) : '—'}</td><td class="r">${l.freeQty ? `${esc(trim(l.freeQty))}${l.freeProductName && l.freeProductName !== l.productName ? ` ${esc(l.freeProductName)}` : ''}` : '—'}</td>
        <td class="r">${l.freeValue ? esc(rs(l.freeValue)) : '—'}</td><td class="r b">${esc(rs(l.total))}</td></tr>`
    : `<tr><td>${i + 1}</td><td>${esc(dayYearLabel(l.date))}</td><td>${esc(l.docNumber)}</td><td>${esc(l.customerName ?? '')}</td>
        <td>${esc(l.productName ?? '')}</td><td class="r">${esc(trim(l.qty))}</td><td>${esc(l.condition === 'EXPIRED' ? 'Expiry' : 'Kharab')}</td>
        <td class="r b">${esc(rs(l.returnValue))}</td></tr>`).join('');
}

export function printClaimStatement(s: ClaimStatement) {
  const c = s.claim;
  const b = s.business;
  const p = s.supplier;
  const schemes = c.lines.filter((l) => l.kind === 'SCHEME');
  const returns = c.lines.filter((l) => l.kind === 'RETURN');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.number)}</title><style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #0f172a; }
    h1 { font-size: 18px; margin: 0; } h2 { font-size: 12px; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #475569; }
    .top { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #0f172a; padding-bottom: 8px; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; flex: 1; } .muted { color: #64748b; } .sub { color: #64748b; font-size: 10px; }
    .boxes { display: flex; gap: 10px; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; } th, td { border-bottom: 1px solid #e2e8f0; padding: 4px 5px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; } .r { text-align: right; } .b { font-weight: 700; }
    .totals { margin-left: auto; width: 45%; margin-top: 10px; } .totals td { border: 0; padding: 3px 5px; } .grand td { border-top: 2px solid #0f172a; font-size: 13px; font-weight: 700; }
    .sign { display: flex; justify-content: space-between; margin-top: 50px; } .sign div { border-top: 1px solid #0f172a; width: 30%; text-align: center; padding-top: 4px; }
    .foot { margin-top: 16px; text-align: center; color: #94a3b8; font-size: 9px; }
  </style></head><body>
  <div class="top">
    <div>
      <h1>${esc(b?.name ?? '')}</h1>
      <div class="muted">${esc([b?.address, b?.city].filter(Boolean).join(', '))}${b?.phone ? ` · ${esc(b.phone)}` : ''}</div>
      ${b?.ntn || b?.strn ? `<div class="muted">${b?.ntn ? `NTN ${esc(b.ntn)}` : ''}${b?.ntn && b?.strn ? ' · ' : ''}${b?.strn ? `STRN ${esc(b.strn)}` : ''}</div>` : ''}
    </div>
    <div style="text-align:right">
      <h1>CLAIM STATEMENT</h1>
      <div><b>${esc(c.number)}</b> · ${esc(CLAIM_STATUS_LABEL[c.status])}</div>
      <div class="muted">Period: ${esc(keyLabel(c.fromKey))} – ${esc(keyLabel(c.toKey))}</div>
      ${c.reference ? `<div class="muted">Company ref: ${esc(c.reference)}</div>` : ''}
    </div>
  </div>
  <div class="boxes">
    <div class="box"><div class="muted">Principal (company)</div><b>${esc(p?.name ?? '')}</b>
      ${p?.contactPerson ? `<div>${esc(p.contactPerson)}</div>` : ''}${p?.address ? `<div class="muted">${esc(p.address)}</div>` : ''}
      ${p?.phone ? `<div class="muted">${esc(p.phone)}</div>` : ''}${p?.ntn ? `<div class="muted">NTN ${esc(p.ntn)}</div>` : ''}</div>
    <div class="box"><div class="muted">Banaya</div><div>${esc(dayYearLabel(c.createdAt))}${c.createdByName ? ` · ${esc(c.createdByName)}` : ''}</div>
      ${c.submittedAt ? `<div class="muted">Company ko diya: ${esc(dayYearLabel(c.submittedAt))}</div>` : ''}${c.note ? `<div class="muted">${esc(c.note)}</div>` : ''}</div>
  </div>
  ${schemes.length ? `<h2>Scheme Discount aur free maal</h2><table><thead><tr><th>#</th><th>Date</th><th>Invoice</th><th>Customer</th><th>Item / scheme</th><th class="r">Qty</th><th class="r">Discount</th><th class="r">Free qty</th><th class="r">Free (cost)</th><th class="r">Total</th></tr></thead><tbody>${rowsHtml(c.lines, 'SCHEME')}</tbody></table>` : ''}
  ${returns.length ? `<h2>Market return (kharab / expiry)</h2><table><thead><tr><th>#</th><th>Date</th><th>Return</th><th>Customer</th><th>Item</th><th class="r">Qty</th><th>Haalat</th><th class="r">Cost</th></tr></thead><tbody>${rowsHtml(c.lines, 'RETURN')}</tbody></table>` : ''}
  <table class="totals"><tbody>
    <tr><td>Scheme Discount</td><td class="r">${esc(rs(c.schemeDiscount))}</td></tr>
    <tr><td>Free maal (cost)</td><td class="r">${esc(rs(c.freeGoodsValue))}</td></tr>
    <tr><td>Market return (cost)</td><td class="r">${esc(rs(c.returnsValue))}</td></tr>
    <tr class="grand"><td>Claim total</td><td class="r">${esc(rs(c.total))}</td></tr>
    ${c.receivedAmount ? `<tr><td>Mil gaya</td><td class="r">${esc(rs(c.receivedAmount))}</td></tr><tr><td><b>Baqi</b></td><td class="r b">${esc(rs(c.balance))}</td></tr>` : ''}
  </tbody></table>
  <div class="sign"><div>Distributor</div><div>Company representative</div><div>Approved</div></div>
  <div class="foot">Nafaa se bana</div>
  </body></html>`;
  printHtml(html);
}

export function downloadClaimCsv(s: ClaimStatement) {
  const c = s.claim;
  const head = ['Type', 'Date', 'Document', 'Invoice', 'Customer', 'Item', 'Scheme', 'Qty', 'Discount', 'Free qty', 'Free item', 'Free value (cost)', 'Condition', 'Return value (cost)', 'Total'];
  const rows = c.lines.map((l) => [
    l.kind === 'SCHEME' ? 'Scheme' : 'Market return', l.date.slice(0, 10), l.docNumber, l.invoiceNumber ?? '', l.customerName ?? '', l.productName ?? '',
    l.schemeName ?? '', trim(l.qty), String(l.discount), trim(l.freeQty), l.freeProductName ?? '', String(l.freeValue), l.condition ?? '', String(l.returnValue), String(l.total),
  ]);
  const all = [
    [`Claim ${c.number}`, s.supplier?.name ?? '', `${c.fromKey} to ${c.toKey}`, CLAIM_STATUS_LABEL[c.status]],
    [], head, ...rows, [],
    ['Scheme Discount', String(c.schemeDiscount)], ['Free goods (cost)', String(c.freeGoodsValue)], ['Market returns (cost)', String(c.returnsValue)],
    ['Total', String(c.total)], ['Received', String(c.receivedAmount)], ['Balance', String(c.balance)],
  ];
  const csv = all.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${c.number}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

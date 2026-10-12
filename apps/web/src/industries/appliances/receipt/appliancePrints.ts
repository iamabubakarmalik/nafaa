/**
 * Extra prints for an appliance bill: one warranty card per serial (A5) and
 * the installation slip the technician takes to the site. Opened from the
 * shared receipt page.
 */

import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { printHtml } from '@core/receipt/print';
import type { ReceiptSetup } from '@core/receipt/types';
import { escapeHtml, fmtDate } from '../components/shared';

/** Thermal slip styles (80 mm). */
const SLIP_CSS = (mm: number) => `
  @page { size: ${mm}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${mm}mm; }
  body { font-family: 'Courier New', monospace; padding: 4mm 3mm; color: #000;
    font-size: ${mm >= 80 ? 11 : 9.5}px; line-height: 1.4; }
  .c { text-align: center; } .b { font-weight: 700; } .r { text-align: right; }
  .xl { font-size: ${mm >= 80 ? 15 : 13}px; font-weight: 800; letter-spacing: 1px; }
  .huge { font-size: ${mm >= 80 ? 18 : 15}px; font-weight: 800; }
  .sub { font-size: ${mm >= 80 ? 9 : 8}px; color: #000; }
  .div { border-top: 1px dashed #000; margin: 6px 0; }
  .dbl { border-top: 2px solid #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 5px; margin: 2px 0; }
  .row .v { font-weight: 700; white-space: nowrap; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 2px 8px;
    font-size: ${mm >= 80 ? 10 : 9}px; font-weight: 800; letter-spacing: 1.4px; margin: 4px 0; }
  .box { border: 2.5px solid #000; padding: 6px; margin: 6px 0; text-align: center; }
  .sign { margin-top: 20px; border-top: 1px solid #000; padding-top: 3px; font-size: 8.5px; text-align: center; }
  .item { margin: 3px 0; }
  .item .nm { font-weight: 700; }
  .item .ln { display: flex; justify-content: space-between; font-size: ${mm >= 80 ? 10 : 9}px; }
`;

interface SerialRow {
  serialNumber: string;
  productName: string;
  warrantyEndDate?: string | null;
  compressorWarrantyEndDate?: string | null;
  motorWarrantyEndDate?: string | null;
}

function serialsOf(sale: any): SerialRow[] {
  const out: SerialRow[] = [];
  for (const it of sale?.items ?? []) {
    for (const s of [...(it.applianceSerials ?? []), ...(it.serials ?? [])]) {
      out.push({
        serialNumber: s.serialNumber, productName: it.product?.name ?? it.name ?? 'Product',
        warrantyEndDate: s.warrantyEndDate, compressorWarrantyEndDate: s.compressorWarrantyEndDate, motorWarrantyEndDate: s.motorWarrantyEndDate,
      });
    }
  }
  return out;
}

function chargesOf(sale: any) {
  const list: any[] = Array.isArray(sale?.serviceChargesBreakdown) ? sale.serviceChargesBreakdown : [];
  return { installationLines: list.filter((c) => c?.type === 'INSTALLATION'), deliveryLines: list.filter((c) => c?.type === 'DELIVERY') };
}

export function printWarrantyCards(sale: any, setup: ReceiptSetup) {
  const shopName = setup.shop.name;
  const shopPhone = setup.shop.phone ?? '';
  const serials = serialsOf(sale);
    if (!serials.length) return toast.error('Is bill par koi serial nahi');
    const s: any = sale;
    const cards = serials.map((x) => `
      <div class="card">
        <div class="head">
          <div class="shop">${escapeHtml(shopName)}</div>
          ${shopPhone ? `<div class="ph">📞 ${escapeHtml(shopPhone)}</div>` : ''}
          <h1>Warranty Card</h1>
        </div>
        <table>
          <tr><td class="k">Cheez</td><td class="v">${escapeHtml(x.productName)}</td></tr>
          <tr><td class="k">Serial Number</td><td class="v" style="font-family:monospace;font-size:13px;">${escapeHtml(x.serialNumber)}</td></tr>
          <tr><td class="k">Bill</td><td class="v">${escapeHtml(s.saleNumber)} — ${fmtDate(s.soldAt)}</td></tr>
          <tr><td class="k">Customer</td><td class="v">${escapeHtml(s.customer?.name ?? 'Walk-in')}${s.customer?.phone ? ` — ${escapeHtml(s.customer.phone)}` : ''}</td></tr>
        </table>
        <div class="warr">
          <div class="wbox"><div class="l">Main</div><div class="d">${x.warrantyEndDate ? fmtDate(x.warrantyEndDate) : '—'}</div></div>
          <div class="wbox"><div class="l">Compressor</div><div class="d">${x.compressorWarrantyEndDate ? fmtDate(x.compressorWarrantyEndDate) : '—'}</div></div>
          <div class="wbox"><div class="l">Motor</div><div class="d">${x.motorWarrantyEndDate ? fmtDate(x.motorWarrantyEndDate) : '—'}</div></div>
        </div>
        <div class="note"><strong>Zaroori:</strong> Warranty ke liye ye card aur serial number zaroori hai.
          Khud khol kar theek karne, bijli ke utaar charhao, ya ghair mustanad banday se kaam karwane par
          warranty khatam ho jati hai. Koi masla ho to pehle hamein phone karein.</div>
        <div class="foot">${escapeHtml(shopName)} • Nafaa POS · 0324-1772933</div>
      </div>`).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Warranty Cards</title>
<style>
  @page { size: A5 landscape; margin: 7mm; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#0f172a; font-size:11px;
    -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  .card { border:3px double #0f766e; border-radius:10px; padding:14px; page-break-after:always; }
  .card:last-child { page-break-after:auto; }
  .head { text-align:center; border-bottom:2px solid #0f766e; padding-bottom:7px; margin-bottom:9px; }
  .shop { font-size:18px; font-weight:800; color:#0f766e; }
  .ph { font-size:9px; color:#64748b; }
  h1 { font-size:13px; font-weight:800; letter-spacing:3px; margin-top:5px; text-transform:uppercase; }
  table { width:100%; border-collapse:collapse; }
  td { padding:4px 3px; border-bottom:1px solid #e2e8f0; }
  td.k { width:28%; font-weight:700; color:#475569; font-size:10px; }
  td.v { font-weight:700; }
  .warr { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:8px; }
  .wbox { border:1.5px solid #0f766e; border-radius:7px; padding:6px; text-align:center; }
  .wbox .l { font-size:8px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#64748b; }
  .wbox .d { font-size:11px; font-weight:800; color:#0f766e; }
  .note { margin-top:8px; background:#fffbeb; border:1px solid #fcd34d; border-radius:6px; padding:6px 8px; font-size:8.5px; }
  .foot { margin-top:7px; text-align:center; font-size:8px; color:#64748b; }
</style></head><body>${cards}
</body></html>`;
    printHtml(html);
}

export function printInstallSlip(sale: any, setup: ReceiptSetup) {
  const shopName = setup.shop.name;
  const shopPhone = setup.shop.phone ?? '';
  const svc = chargesOf(sale);
  const due = Math.max(Number(sale.total) - Number(sale.paidAmount), 0);
    const s: any = sale;
    const addr = svc.deliveryLines.find((c: any) => c.note)?.note || s.customer?.address || '';
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Installation Slip</title>
<style>${SLIP_CSS(80)}</style></head><body>
  <div class="c xl">${escapeHtml(shopName)}</div>
  ${shopPhone ? `<div class="c sub">Ph: ${escapeHtml(shopPhone)}</div>` : ''}
  <div class="div"></div>
  <div class="c"><span class="badge">INSTALLATION SLIP</span></div>
  <div class="c b" style="font-size:13px;">${escapeHtml(s.saleNumber)}</div>
  <div class="dbl"></div>
  <div class="row"><span>CUSTOMER</span><span class="v">${escapeHtml(s.customer?.name ?? 'Walk-in')}</span></div>
  ${s.customer?.phone ? `<div class="row"><span>PHONE</span><span class="v">${escapeHtml(s.customer.phone)}</span></div>` : ''}
  ${addr ? `<div class="sub" style="margin:4px 0;"><b>PATA:</b> ${escapeHtml(addr)}</div>` : ''}
  <div class="div"></div>
  <div class="b">Kya lagana hai:</div>
  ${(s.items ?? []).map((it: any) => `
    <div class="item">
      <div class="nm">☐ ${escapeHtml(it.product?.name ?? it.name ?? 'Item')} x${it.quantity}</div>
      ${(it.serials ?? []).length ? `<div class="sub">SN: ${(it.serials ?? []).map((x: any) => escapeHtml(x.serialNumber)).join(', ')}</div>` : ''}
    </div>`).join('')}
  ${svc.installationLines.length ? `<div class="div"></div>
    <div class="b">Installation charge:</div>
    ${svc.installationLines.map((c: any) => `<div class="row"><span>${escapeHtml(c.label ?? 'Installation')}</span><span class="v">${formatPKR(c.amount)}</span></div>
      ${c.note ? `<div class="sub">📅 ${escapeHtml(c.note)}</div>` : ''}`).join('')}` : ''}
  <div class="div"></div>
  <div class="b">Site par check karein:</div>
  <div class="sub">☐ Bijli ka connection theek</div>
  <div class="sub">☐ Plumbing theek</div>
  <div class="sub">☐ Gas connection theek</div>
  <div class="sub">☐ Deewar par jagah</div>
  <div class="sub">☐ Paani nikasi</div>
  <div class="sub">☐ Demo diya / chalana sikhaya</div>
  ${due > 0 ? `<div class="box"><div class="sub b">CUSTOMER SE WUSOOL KARNA HAI</div><div class="huge">${formatPKR(due)}</div></div>` : ''}
  <div class="sign">Technician ke dastakhat</div>
  <div class="sign">Customer ke dastakhat</div>
</body></html>`;
    printHtml(html);
}

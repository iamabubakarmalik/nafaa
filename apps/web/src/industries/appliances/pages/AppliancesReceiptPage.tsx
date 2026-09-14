import { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Printer, Receipt, ShieldCheck, HardHat, Truck, Package,
  MessageCircle, FileDown, Loader2, AlertTriangle, CheckCircle2, Barcode,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, useShortcuts, printHtml,
  escapeHtml, fmtDate, fmtDateTime, guideAction, Kbd,
} from '../components/shared';
import { catEmoji, catLabel } from '../constants';

/* ═════════════════════════════════════════════════════════════
   APPLIANCE RECEIPT — teen alag kaghaz ek hi safhe se
   ─────────────────────────────────────────────────────────────
     1. 🧾 Bill        — 80mm thermal ya A4
     2. 🛡️ Warranty Card — har serial ka apna
     3. 🔧 Installation Slip — technician ke liye pata aur checklist
   Appliance bechte waqt customer ko teenon chahiye hote hain.
   ═════════════════════════════════════════════════════════════ */

type Paper = 'a4' | 'thermal80' | 'thermal58';

const THERMAL_CSS = (mm: number) => `
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

export default function AppliancesReceiptPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.tenant?.address || '');

  const [paper, setPaper] = useState<Paper>(() => {
    try { return (localStorage.getItem('nafaa.receipt.paper') as Paper) || 'thermal80'; } catch { return 'thermal80'; }
  });
  const [showTeacher, setShowTeacher] = useState(false);
  const autoPrinted = useState({ done: false })[0];

  useEffect(() => { try { localStorage.setItem('nafaa.receipt.paper', paper); } catch { /* private mode */ } }, [paper]);

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', id],
    queryFn: () => salesApi.getOne(id!),
    enabled: !!id,
  });

  /* Services ko qism ke hisab se toron */
  const svc = useMemo(() => {
    const list: any[] = Array.isArray((sale as any)?.serviceChargesBreakdown)
      ? (sale as any).serviceChargesBreakdown : [];
    const by = (t: string) => list.filter((c) => c?.type === t);
    const sum = (t: string) => by(t).reduce((x, c) => x + (Number(c.amount) || 0), 0);
    return {
      list,
      installation: sum('INSTALLATION'),
      installationLines: by('INSTALLATION'),
      delivery: sum('DELIVERY'),
      deliveryLines: by('DELIVERY'),
      other: list.filter((c) => c?.type !== 'INSTALLATION' && c?.type !== 'DELIVERY'),
      total: Number((sale as any)?.serviceCharges) || 0,
    };
  }, [sale]);

  /** Saare serial jo is bill par bikay */
  const serials = useMemo(() => {
    const out: { serialNumber: string; productName: string; warrantyEndDate?: string | null;
      compressorWarrantyEndDate?: string | null; motorWarrantyEndDate?: string | null }[] = [];
    for (const it of ((sale as any)?.items ?? [])) {
      for (const s of (it.serials ?? [])) {
        out.push({
          serialNumber: s.serialNumber,
          productName: it.product?.name ?? it.name ?? 'Product',
          warrantyEndDate: s.warrantyEndDate,
          compressorWarrantyEndDate: s.compressorWarrantyEndDate,
          motorWarrantyEndDate: s.motorWarrantyEndDate,
        });
      }
    }
    return out;
  }, [sale]);

  const due = sale ? Math.max(Number(sale.total) - Number(sale.paidAmount), 0) : 0;
  const change = sale ? Math.max(Number(sale.paidAmount) - Number(sale.total), 0) : 0;

  /* ═══════════ BILL ═══════════ */
  const printBill = (p: Paper = paper) => {
    if (!sale) return;
    const s: any = sale;

    if (p === 'a4') {
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(s.saleNumber)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11.5px; line-height: 1.5;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .head { background: linear-gradient(135deg,#0f172a,#155e75,#0d9488); color:#fff; padding:18px 20px;
    border-radius:10px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:flex-start; gap:20px; }
  .head .shop { font-size:20px; font-weight:800; }
  .head .sub { font-size:10.5px; opacity:.9; }
  .head .badge { background:rgba(255,255,255,.2); border:1.5px solid rgba(255,255,255,.4); padding:3px 10px;
    border-radius:20px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:1.4px; }
  .head .no { text-align:right; font-size:10.5px; }
  .head .no .n { font-size:16px; font-weight:800; }
  .meta { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:14px; }
  .meta .k { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:1.2px; color:#64748b; }
  .meta .v { font-weight:700; }
  table { width:100%; border-collapse:collapse; font-size:10.5px; }
  thead th { background:#0f172a; color:#fff; padding:8px 6px; text-align:left; font-size:9px;
    font-weight:800; text-transform:uppercase; letter-spacing:1px; }
  thead th.r { text-align:right; } thead th.c { text-align:center; }
  tbody td { padding:7px 6px; border-bottom:1px solid #e2e8f0; }
  tbody td.r { text-align:right; font-weight:800; white-space:nowrap; }
  tbody td.c { text-align:center; }
  tbody tr:nth-child(even) td { background:#f8fafc; }
  .sn { font-family:monospace; font-size:9px; color:#64748b; }
  .tot { margin-top:14px; margin-left:auto; width:58%; }
  .tot .row { display:flex; justify-content:space-between; padding:5px 8px; font-size:11px; }
  .tot .row.g { background:linear-gradient(135deg,#0f172a,#155e75); color:#fff; font-size:15px;
    font-weight:800; border-radius:8px; margin-top:5px; padding:10px 12px; }
  .tot .row.due { background:#fef2f2; color:#b91c1c; font-weight:800; border-radius:8px; margin-top:5px; }
  .svc { background:#ecfeff; border:1.5px solid #67e8f9; border-radius:8px; padding:8px 10px; margin-top:12px; font-size:10px; }
  .warn { background:#fffbeb; border:1.5px solid #fcd34d; border-radius:8px; padding:9px 11px; margin-top:14px; font-size:9.5px; }
  .signs { display:flex; justify-content:space-between; margin-top:40px; gap:40px; }
  .sg { flex:1; border-top:1.5px solid #0f172a; padding-top:5px; text-align:center; font-size:9.5px; font-weight:700; }
  .foot { margin-top:16px; text-align:center; font-size:9px; color:#64748b; }
</style></head><body>
  <div class="head">
    <div>
      <div class="badge">Bill / Invoice</div>
      <div class="shop" style="margin-top:6px;">${escapeHtml(shopName)}</div>
      ${shopPhone ? `<div class="sub">📞 ${escapeHtml(shopPhone)}</div>` : ''}
      ${shopAddress ? `<div class="sub">📍 ${escapeHtml(shopAddress)}</div>` : ''}
    </div>
    <div class="no">
      <div>Bill Number</div>
      <div class="n">${escapeHtml(s.saleNumber)}</div>
      <div style="margin-top:4px;">${fmtDateTime(s.soldAt)}</div>
    </div>
  </div>

  <div class="meta">
    <div>
      <div class="k">Customer</div>
      <div class="v">${escapeHtml(s.customer?.name ?? 'Walk-in')}</div>
      ${s.customer?.phone ? `<div class="sub">📞 ${escapeHtml(s.customer.phone)}</div>` : ''}
      ${s.customer?.address ? `<div class="sub">📍 ${escapeHtml(s.customer.address)}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div class="k">Payment</div>
      <div class="v">${escapeHtml(s.paymentMethod ?? '—')}</div>
      ${s.shop?.name ? `<div class="sub">${escapeHtml(s.shop.name)}</div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Cheez</th><th class="c">Tadaad</th><th class="r">Rate</th><th class="r">Total</th></tr></thead>
    <tbody>
      ${(s.items ?? []).map((it: any, i: number) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>
            <div style="font-weight:700;">${escapeHtml(it.product?.name ?? it.name ?? 'Item')}</div>
            ${(it.serials ?? []).length ? `<div class="sn">🔖 ${(it.serials ?? []).map((x: any) => escapeHtml(x.serialNumber)).join(', ')}</div>` : ''}
            ${it.note ? `<div class="sn">${escapeHtml(it.note)}</div>` : ''}
          </td>
          <td class="c">${it.quantity}</td>
          <td class="r">${formatPKR(it.price ?? it.unitPrice ?? 0)}</td>
          <td class="r">${formatPKR(it.total)}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  ${svc.list.length ? `<div class="svc">
    <strong>Services:</strong>
    ${svc.list.map((c: any) => `<div style="display:flex;justify-content:space-between;margin-top:3px;">
      <span>${escapeHtml(c.label ?? c.type)}${c.note ? ` — ${escapeHtml(c.note)}` : ''}</span>
      <strong>${formatPKR(c.amount)}</strong></div>`).join('')}
  </div>` : ''}

  <div class="tot">
    <div class="row"><span>Maal ka total</span><span>${formatPKR(s.subtotal)}</span></div>
    ${Number(s.discount) > 0 ? `<div class="row"><span>Discount</span><span>−${formatPKR(s.discount)}</span></div>` : ''}
    ${svc.installation > 0 ? `<div class="row"><span>Installation</span><span>+${formatPKR(svc.installation)}</span></div>` : ''}
    ${svc.delivery > 0 ? `<div class="row"><span>Delivery</span><span>+${formatPKR(svc.delivery)}</span></div>` : ''}
    ${svc.other.length ? svc.other.map((c: any) => `<div class="row"><span>${escapeHtml(c.label ?? c.type)}</span><span>+${formatPKR(c.amount)}</span></div>`).join('') : ''}
    <div class="row g"><span>KUL BILL</span><span>${formatPKR(s.total)}</span></div>
    <div class="row"><span>Wusool hua</span><span>${formatPKR(s.paidAmount)}</span></div>
    ${due > 0 ? `<div class="row due"><span>BAQI (udhaar)</span><span>${formatPKR(due)}</span></div>` : ''}
    ${change > 0 ? `<div class="row"><span>Wapis diya</span><span>${formatPKR(change)}</span></div>` : ''}
  </div>

  ${serials.length ? `<div class="warn">
    <strong>🛡️ Warranty:</strong> Ye bill aur serial number warranty ke liye zaroori hain — mehfooz rakhein.
    ${serials.map((x) => `<div style="margin-top:3px;">• <strong>${escapeHtml(x.productName)}</strong> —
      <span style="font-family:monospace;">${escapeHtml(x.serialNumber)}</span>
      ${x.warrantyEndDate ? ` • warranty ${fmtDate(x.warrantyEndDate)} tak` : ''}
      ${x.compressorWarrantyEndDate ? ` • compressor ${fmtDate(x.compressorWarrantyEndDate)} tak` : ''}
      ${x.motorWarrantyEndDate ? ` • motor ${fmtDate(x.motorWarrantyEndDate)} tak` : ''}</div>`).join('')}
  </div>` : ''}

  <div class="signs">
    <div class="sg">Dukaan ke dastakhat</div>
    <div class="sg">Customer ke dastakhat</div>
  </div>
  <div class="foot">Shukriya! Phir tashreef laiye. • Powered by <strong>Nafaa POS</strong></div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
      if (!printHtml(html)) toast.error('Popup block hai — allow karein');
      return;
    }

    /* ── Thermal ── */
    const mm = p === 'thermal80' ? 80 : 58;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(s.saleNumber)}</title>
<style>${THERMAL_CSS(mm)}</style></head><body>
  <div class="c xl">${escapeHtml(shopName)}</div>
  ${shopPhone ? `<div class="c sub">Ph: ${escapeHtml(shopPhone)}</div>` : ''}
  ${shopAddress ? `<div class="c sub">${escapeHtml(shopAddress)}</div>` : ''}
  <div class="div"></div>
  <div class="row"><span>BILL</span><span class="v">${escapeHtml(s.saleNumber)}</span></div>
  <div class="row"><span>DATE</span><span class="v">${new Date(s.soldAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  <div class="row"><span>CUSTOMER</span><span class="v">${escapeHtml(s.customer?.name ?? 'Walk-in')}</span></div>
  ${s.customer?.phone ? `<div class="row"><span>PHONE</span><span class="v">${escapeHtml(s.customer.phone)}</span></div>` : ''}
  <div class="div"></div>
  ${(s.items ?? []).map((it: any) => `
    <div class="item">
      <div class="nm">${escapeHtml(it.product?.name ?? it.name ?? 'Item')}</div>
      ${(it.serials ?? []).length ? `<div class="sub">SN: ${(it.serials ?? []).map((x: any) => escapeHtml(x.serialNumber)).join(', ')}</div>` : ''}
      <div class="ln"><span>${it.quantity} x ${formatPKR(it.price ?? it.unitPrice ?? 0)}</span><span class="b">${formatPKR(it.total)}</span></div>
    </div>`).join('')}
  <div class="div"></div>
  <div class="row"><span>Maal ka total</span><span class="v">${formatPKR(s.subtotal)}</span></div>
  ${Number(s.discount) > 0 ? `<div class="row"><span>Discount</span><span class="v">-${formatPKR(s.discount)}</span></div>` : ''}
  ${svc.installation > 0 ? `<div class="row"><span>Installation</span><span class="v">+${formatPKR(svc.installation)}</span></div>` : ''}
  ${svc.delivery > 0 ? `<div class="row"><span>Delivery</span><span class="v">+${formatPKR(svc.delivery)}</span></div>` : ''}
  ${svc.deliveryLines.map((c: any) => (c.note ? `<div class="sub">📍 ${escapeHtml(c.note)}</div>` : '')).join('')}
  ${svc.other.map((c: any) => `<div class="row"><span>${escapeHtml(c.label ?? c.type)}</span><span class="v">+${formatPKR(c.amount)}</span></div>`).join('')}
  <div class="dbl"></div>
  <div class="box">
    <div class="sub b" style="letter-spacing:1.4px;">KUL BILL</div>
    <div class="huge">${formatPKR(s.total)}</div>
  </div>
  <div class="row"><span>Wusool (${escapeHtml(s.paymentMethod ?? '—')})</span><span class="v">${formatPKR(s.paidAmount)}</span></div>
  ${due > 0 ? `<div class="row b"><span>BAQI (udhaar)</span><span class="v">${formatPKR(due)}</span></div>` : ''}
  ${change > 0 ? `<div class="row b"><span>WAPIS DIYA</span><span class="v">${formatPKR(change)}</span></div>` : ''}
  ${serials.length ? `<div class="div"></div>
    <div class="c"><span class="badge">WARRANTY</span></div>
    ${serials.map((x) => `<div class="sub" style="margin:2px 0;">${escapeHtml(x.productName)}<br/>SN: ${escapeHtml(x.serialNumber)}${x.warrantyEndDate ? `<br/>Warranty: ${fmtDate(x.warrantyEndDate)} tak` : ''}${x.compressorWarrantyEndDate ? `<br/>Compressor: ${fmtDate(x.compressorWarrantyEndDate)} tak` : ''}</div>`).join('')}
    <div class="sub c" style="margin-top:3px;">Ye parchi warranty ke liye zaroori hai</div>` : ''}
  <div class="sign">Customer ke dastakhat</div>
  <div class="c b" style="margin-top:8px;letter-spacing:1.8px;">* * SHUKRIYA * *</div>
  <div class="c sub" style="margin-top:2px;">Powered by Nafaa POS</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
    if (!printHtml(html, { width: mm >= 80 ? 400 : 340, height: 700 })) toast.error('Popup block hai — allow karein');
  };

  /* ═══════════ WARRANTY CARD ═══════════ */
  const printWarrantyCards = () => {
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
        <div class="foot">${escapeHtml(shopName)} • Powered by Nafaa POS</div>
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
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
    if (!printHtml(html, { width: 800, height: 600 })) toast.error('Popup block hai — allow karein');
  };

  /* ═══════════ INSTALLATION SLIP ═══════════ */
  const printInstallSlip = () => {
    if (!sale) return;
    const s: any = sale;
    const addr = svc.deliveryLines.find((c: any) => c.note)?.note || s.customer?.address || '';
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Installation Slip</title>
<style>${THERMAL_CSS(80)}</style></head><body>
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
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
    if (!printHtml(html, { width: 400, height: 700 })) toast.error('Popup block hai — allow karein');
  };

  /* Auto-print jab POS se `?auto=1` ke sath khulta hai */
  useEffect(() => {
    if (!sale || autoPrinted.done || sp.get('auto') !== '1') return;
    autoPrinted.done = true;
    const t = setTimeout(() => printBill(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale]);

  const wa = () => {
    if (!sale) return;
    const s: any = sale;
    const phone = s.customer?.phone;
    if (!phone) return toast.error('Customer ka phone number nahi hai');
    const digits = String(phone).replace(/[^0-9]/g, '');
    const wn = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    const lines = (s.items ?? []).map((it: any) => `• ${it.product?.name ?? 'Item'} ×${it.quantity} — ${formatPKR(it.total)}`).join('\n');
    const msg = `Assalam-o-Alaikum ${s.customer?.name ?? ''}! 🙏\n\n*${shopName}* ki taraf se bill:\n${s.saleNumber}\n\n${lines}\n${svc.installation > 0 ? `\nInstallation: ${formatPKR(svc.installation)}` : ''}${svc.delivery > 0 ? `\nDelivery: ${formatPKR(svc.delivery)}` : ''}\n\n*Kul: ${formatPKR(s.total)}*\nWusool: ${formatPKR(s.paidAmount)}${due > 0 ? `\n*Baqi: ${formatPKR(due)}*` : ''}\n${serials.length ? `\n🛡️ Serial: ${serials.map((x) => x.serialNumber).join(', ')}\n(warranty ke liye mehfooz rakhein)` : ''}\n\nShukriya!`;
    window.open(`https://wa.me/${wn}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  useShortcuts({
    p: () => printBill(),
    w: () => printWarrantyCards(),
    i: () => printInstallSlip(),
    t: () => setShowTeacher(true),
    Escape: () => { if (showTeacher) setShowTeacher(false); },
  }, [showTeacher, sale, serials, paper]);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!sale) {
    return (
      <Empty icon={AlertTriangle} title="Bill nahi mila" hint="Shayad link ghalat hai ya bill delete ho chuka"
        action={<Link to="/sales"><Button variant="secondary"><ArrowLeft className="h-4 w-4" /> Saari bikri</Button></Link>} />
    );
  }

  const s: any = sale;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ReceiptTeacher onClose={() => setShowTeacher(false)} />}

      <Link to="/sales" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 font-extrabold transition">
        <ArrowLeft className="h-4 w-4" /> Saari bikri
      </Link>

      <ApplianceHero
        badge="Bill / Receipt"
        badgeIcon={<Receipt className="h-3.5 w-3.5 text-amber-300" />}
        title={`🧾 ${s.saleNumber}`}
        subtitle={
          <>
            {s.customer?.name ?? 'Walk-in'}
            <span className="opacity-50 mx-1.5">•</span>
            {fmtDateTime(s.soldAt)}
            <span className="opacity-50 mx-1.5">•</span>
            <strong className="text-cyan-200">{formatPKR(s.total)}</strong>
            {due > 0 && <><span className="opacity-50 mx-1.5">•</span><strong className="text-rose-300">{formatPKR(due)} baqi</strong></>}
          </>
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'wa', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" />, onClick: wa, variant: 'accent', hideLabelOnMobile: true },
          { key: 'warranty', label: 'Warranty Card', icon: <ShieldCheck className="h-4 w-4" />, shortcut: 'W', onClick: printWarrantyCards, disabled: !serials.length, hideLabelOnMobile: true },
          { key: 'install', label: 'Installation Slip', icon: <HardHat className="h-4 w-4" />, shortcut: 'I', onClick: printInstallSlip, hideLabelOnMobile: true },
          { key: 'print', label: 'Bill Print', icon: <Printer className="h-4 w-4" />, shortcut: 'P', onClick: () => printBill(), variant: 'solid' },
        ]}
        shortcuts={[
          { keys: 'P', label: 'Bill' }, { keys: 'W', label: 'Warranty card' },
          { keys: 'I', label: 'Installation slip' }, { keys: 'T', label: 'Guide' },
        ]}
      />

      {/* Paper chooser */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kaghaz</span>
        {([['thermal80', '🧾 80mm'], ['thermal58', '🧾 58mm'], ['a4', '📄 A4']] as const).map(([v, label]) => (
          <button key={v} onClick={() => setPaper(v as Paper)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
              paper === v ? 'bg-cyan-600 border-cyan-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
            }`}>{label}</button>
        ))}
        <button onClick={() => printBill()}
          className="h-9 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
          <Printer className="h-3.5 w-3.5" /> Abhi print
        </button>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Package} tone="blue" label="Maal Ka Total" value={formatPKR(s.subtotal)}
          sub={`${(s.items ?? []).length} cheezein`} />
        <Kpi icon={HardHat} tone="amber" label="Services" value={formatPKR(svc.total)}
          sub={`installation ${formatPKR(svc.installation)} • delivery ${formatPKR(svc.delivery)}`} />
        <Kpi icon={Receipt} tone="cyan" label="Kul Bill" value={formatPKR(s.total)}
          sub={Number(s.discount) > 0 ? `discount ${formatPKR(s.discount)}` : undefined} />
        <Kpi icon={due > 0 ? AlertTriangle : CheckCircle2} tone={due > 0 ? 'rose' : 'emerald'}
          label={due > 0 ? 'Baqi (udhaar)' : 'Wusool'}
          value={due > 0 ? formatPKR(due) : formatPKR(s.paidAmount)}
          sub={due > 0 ? `${formatPKR(s.paidAmount)} mil chuka` : 'poora paisa mil gaya'}
          alert={due > 0} />
      </section>

      {/* Cheezein */}
      <Panel icon={Package} title="Cheezein" tone="cyan">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                <Th className="text-left">Cheez</Th>
                <Th className="text-center">Tadaad</Th>
                <Th className="text-right">Rate</Th>
                <Th className="text-right pr-4">Total</Th>
              </tr>
            </thead>
            <tbody>
              {(s.items ?? []).map((it: any, i: number) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2.5">
                    <div className="text-[13px] font-extrabold text-slate-900 dark:text-white">
                      {it.product?.name ?? it.name ?? 'Item'}
                    </div>
                    {(it.serials ?? []).length > 0 && (
                      <div className="mt-1 flex gap-1 flex-wrap">
                        {(it.serials ?? []).map((x: any) => (
                          <span key={x.serialNumber} className="px-1.5 py-0.5 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-mono text-[10px] font-extrabold">
                            🔖 {x.serialNumber}
                          </span>
                        ))}
                      </div>
                    )}
                    {it.note && <div className="text-[10px] font-bold text-slate-400 mt-0.5">{it.note}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs font-extrabold tabular-nums text-slate-700 dark:text-slate-200">{it.quantity}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatPKR(it.price ?? it.unitPrice ?? 0)}
                  </td>
                  <td className="px-3 py-2.5 pr-4 text-right text-xs font-extrabold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                    {formatPKR(it.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Services */}
      {svc.list.length > 0 && (
        <Panel icon={HardHat} title="Services" hint="Maal ke ilawa jo charge lage" tone="amber">
          <div className="space-y-1.5">
            {svc.list.map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                <span className="text-base shrink-0">{c.type === 'DELIVERY' ? '🚚' : c.type === 'INSTALLATION' ? '🔧' : '🧾'}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-extrabold text-slate-900 dark:text-white truncate">{c.label ?? c.type}</div>
                  {c.note && <div className="text-[10px] font-bold text-slate-400 truncate">{c.note}</div>}
                </div>
                <div className="text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100 shrink-0">{formatPKR(c.amount)}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Warranty */}
      {serials.length > 0 && (
        <Panel icon={ShieldCheck} title={`Warranty (${serials.length} units)`}
          hint="Har unit ka apna card nikalta hai — customer ko dein" tone="violet"
          right={
            <button onClick={printWarrantyCards}
              className="h-9 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
              <ShieldCheck className="h-3.5 w-3.5" /> Cards Print
            </button>
          }>
          <div className="space-y-1.5">
            {serials.map((x) => (
              <div key={x.serialNumber} className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Barcode className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span className="font-mono text-[11px] font-extrabold text-violet-800 dark:text-violet-200">{x.serialNumber}</span>
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 truncate">{x.productName}</span>
                </div>
                <div className="mt-1 flex gap-2 flex-wrap text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {x.warrantyEndDate && <span>🛡️ Main: {fmtDate(x.warrantyEndDate)}</span>}
                  {x.compressorWarrantyEndDate && <span>❄️ Compressor: {fmtDate(x.compressorWarrantyEndDate)}</span>}
                  {x.motorWarrantyEndDate && <span>⚙️ Motor: {fmtDate(x.motorWarrantyEndDate)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Hisab */}
      <Panel icon={Receipt} title="Hisab" tone={due > 0 ? 'rose' : 'emerald'}>
        <div className="space-y-1.5 max-w-md ml-auto">
          <Line label="Maal ka total" value={formatPKR(s.subtotal)} />
          {Number(s.discount) > 0 && <Line label="Discount" value={`−${formatPKR(s.discount)}`} tone="amber" />}
          {svc.installation > 0 && <Line label="Installation" value={`+${formatPKR(svc.installation)}`} tone="blue" />}
          {svc.delivery > 0 && <Line label="Delivery" value={`+${formatPKR(svc.delivery)}`} tone="emerald" />}
          {svc.other.map((c: any, i: number) => (
            <Line key={i} label={c.label ?? c.type} value={`+${formatPKR(c.amount)}`} />
          ))}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-900 to-cyan-900 text-white px-4 py-3 mt-2">
            <span className="text-sm font-extrabold">KUL BILL</span>
            <span className="text-xl font-extrabold tabular-nums">{formatPKR(s.total)}</span>
          </div>
          <Line label={`Wusool (${s.paymentMethod ?? '—'})`} value={formatPKR(s.paidAmount)} />
          {due > 0 && <Line label="BAQI — udhaar" value={formatPKR(due)} tone="rose" big />}
          {change > 0 && <Line label="Wapis diya" value={formatPKR(change)} tone="emerald" big />}
        </div>
      </Panel>
    </div>
  );
}

function Line({ label, value, tone = 'slate', big }: { label: string; value: string; tone?: string; big?: boolean }) {
  const tones: Record<string, string> = {
    slate: 'text-slate-600 dark:text-slate-300',
    amber: 'text-amber-700 dark:text-amber-400',
    blue: 'text-blue-700 dark:text-blue-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    rose: 'text-rose-700 dark:text-rose-400',
  };
  return (
    <div className={`flex items-center justify-between px-1 ${big ? 'text-sm font-extrabold' : 'text-xs font-bold'} ${tones[tone]}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function ReceiptTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Bill Se Kaunse Kaghaz Nikalte Hain?"
      intro={
        <>
          Appliance bechte waqt customer ko <strong>teen alag kaghaz</strong> chahiye hote hain —
          aur teenon isi safhe se nikalte hain.
        </>
      }
      blocks={[
        {
          title: '🧾 1. Bill',
          tone: 'cyan',
          tips: [
            <><Kbd dark>P</Kbd> — 80mm, 58mm ya A4 me se jo chunein. Choice yaad reh jati hai</>,
            <>Bill par <strong>maal, discount, installation aur delivery</strong> alag alag likhe hote hain — customer ko saaf pata chalta hai kis cheez ka kitna paisa</>,
            <>Har cheez ke neeche uska <strong>serial number</strong> bhi chapta hai</>,
            <>Udhaar reh gaya ho to <strong>"BAQI"</strong> laal me numaya hota hai</>,
          ],
        },
        {
          title: '🛡️ 2. Warranty Card',
          tone: 'violet',
          tips: [
            <><Kbd dark>W</Kbd> — har serial ka <strong>apna alag card</strong> (A5), teenon warranty ki tareekhon ke sath</>,
            <>Appliance me <strong>main, compressor aur motor</strong> ki warranty alag hoti hai — card par teenon likhi hoti hain</>,
            <>Card par shart bhi likhi hai ke warranty kab khatam ho jati hai — baad me jhagra nahi hota</>,
            <><strong>Customer ko zaroor dein</strong> — warranty ka jhagra hamesha usi unit par hota hai jiska card nahi hota</>,
          ],
        },
        {
          title: '🔧 3. Installation Slip',
          tone: 'amber',
          tips: [
            <><Kbd dark>I</Kbd> — <strong>technician ke liye</strong> parchi: pata, phone, kya lagana hai, aur site ki checklist</>,
            <>Checklist me bijli, plumbing, gas, jagah aur paani nikasi ke khanay hain — technician wahin tick karta hai</>,
            <>Agar bill ka paisa baqi ho to slip par <strong>"customer se wusool karna hai"</strong> bara likha aata hai — technician bhool nahi sakta</>,
          ],
        },
        {
          title: '💬 WhatsApp',
          tone: 'emerald',
          tips: [
            <>Ek click me customer ko poora bill WhatsApp par — cheezein, services, kul, wusool aur baqi</>,
            <><strong>Serial number bhi jate hain</strong> ye likh kar ke "warranty ke liye mehfooz rakhein"</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: 'P', label: 'Bill print' },
        { keys: 'W', label: 'Warranty cards' },
        { keys: 'I', label: 'Installation slip' },
        { keys: 'T', label: 'Ye guide' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Bhari saman bhejte waqt <strong>installation slip technician ke haath me</strong>
          dein, aur <strong>warranty card customer ke haath me</strong>. Ye do aadatein aadhi shikayat khatam kar deti hain.
        </>
      }
      onClose={onClose}
    />
  );
}

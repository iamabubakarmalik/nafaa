import JsBarcode from 'jsbarcode';
import { formatPKR } from '@core/lib/format';

/* ═════════════════════════════════════════════════════════════
   THERMAL RECEIPT — ek hi jagah, sab industries ke liye
   ─────────────────────────────────────────────────────────────
   Ye code pehle Retail, Bakery, Electronics aur Mobile — chaar
   POS pages me alag alag para tha. Har dafa jab bill par koi
   cheez theek ki jati (barcode asli banaya, harf mote kiye,
   khata ki lines jori gayin), wo sirf ek page par theek hoti
   thi aur baqi teen purane hi rehte thay.

   Ab ek hi jagah. Jo industry apna kuch alag chahti hai, wo
   `extraRows` aur `footerNote` se de deti hai — poora HTML
   dobara likhne ki zaroorat nahi.
   ═════════════════════════════════════════════════════════════ */

export type PrinterWidth = '80' | '58';

export interface ReceiptLine {
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
  /** Customer ko dikhne wala note — "1 piece damage tha" */
  note?: string;
}

/** Bill par apni marzi ki ek line — industry ke apne khane. */
export interface ReceiptRow {
  label: string;
  value: string;
  /** Mota kar ke — zaroori cheezon ke liye */
  bold?: boolean;
}

export interface ReceiptPayload {
  saleNumber: string;
  date: Date;
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  customerName?: string;

  /**
   * Maal lene kaun aaya tha — jab khud khate wala na aaya ho.
   *
   * Udhaar khata mahine bhar chalta hai aur maal aksar mulazim ya
   * ghar ka koi fard le jata hai. Bill par ye naam hona zaroori
   * hai: mahine ke aakhir me hisaab ho to dono taraf ek hi record.
   */
  receivedByName?: string;
  receivedByPhone?: string;

  /** Is bill se PEHLE customer par kitna udhaar tha (0/undefined = kuch nahi) */
  previousDue?: number;

  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  /** Ghar bhejne ka charge — receipt par alag line banti hai */
  deliveryCharge?: number;
  deliveryAddress?: string;
  total: number;
  paid: number;
  paymentLabel: string;

  /** Cashier ka naam — kis ne bill banaya */
  cashierName?: string;
  /** Industry ke apne khane (items ke baad, total se pehle) */
  extraRows?: ReceiptRow[];
  /** Neeche apna paigham — "3 din me wapsi", "Warranty 1 saal" */
  footerNote?: string;
}

export const escapeHtml = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Bill par ASLI CODE128 barcode.
 *
 * Pehle kuch pages par `pseudoBarcode()` tha — lakeeron ki chaurai
 * `charCodeAt % 3` se nikalti thi. Dekhne me barcode lagta tha, magar
 * koi scanner use parh hi nahi sakta tha. Ab asli CODE128: purana bill
 * haath me ho to gun se scan karke wohi bill khul jata hai.
 *
 * SVG yahan (mojooda window me) banta hai aur text ban kar print wale
 * safhe me jata hai — us nayi window me JsBarcode maujood nahi hota.
 */
export function realBarcodeSvg(value: string, widthMm: PrinterWidth): string {
  if (!value) return '';
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, {
      format: 'CODE128',
      /* 203-dpi head par 1.1 ki lakeer aadhe dot par girti hai aur
         scanner chook jata hai; itni chaurai par poore do dot. */
      width: widthMm === '80' ? 1.6 : 1.3,
      height: 45,
      margin: 0,
      displayValue: false,
      lineColor: '#000000',
      background: '#ffffff',
    });
    return new XMLSerializer().serializeToString(svg);
  } catch {
    return '';
  }
}

const row = (label: string, value: string, bold = false) =>
  `<div class="row${bold ? ' b' : ''}"><span>${escapeHtml(label)}</span><span class="v">${escapeHtml(value)}</span></div>`;

/** Bill ka poora HTML — print window me likhne ke liye tayyar. */
export function buildReceiptHtml(p: ReceiptPayload, widthMm: PrinterWidth): string {
  const wide = widthMm === '80';

  const itemsHtml = p.lines.map((l, i) => `
    <div class="item">
      <div class="iname">${i + 1}. ${escapeHtml(l.name)}</div>
      <div class="irow">
        <span class="iqty">${l.qty} ${escapeHtml(l.unit)} × ${formatPKR(l.price)}</span>
        <span class="iamt">${formatPKR(l.total)}</span>
      </div>
      ${l.note ? `<div class="inote">↳ ${escapeHtml(l.note)}</div>` : ''}
    </div>`).join('');

  const due = Math.max(p.total - p.paid, 0);
  const prevDue = p.previousDue ?? 0;

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(p.saleNumber)}</title>
<style>
  /* ─────────────────────────────────────────────────────────
     Kaghaz par har harf saaf chhapna chahiye.

     Purani receipt bareek nikalti thi. Do wajuhat:
       1. Courier New 400-weight — us ke danday 203-dpi thermal
          head par ek hi dot chaure bante hain, jo kaghaz par
          mushkil se nazar aate hain.
       2. Pata/phone 9px par, aur item ki tafseel 11px par
          bagair kisi weight ke — yehi lakeerein sab se pehle
          gayab hoti hain.

     Ab sans-serif (Courier se mote danday), har cheez kam se kam
     700 weight, naap bara, aur anti-aliasing band — warna browser
     kinaron par halke grey pixel banata hai jo thermal head
     chhaap hi nahi pata aur harf khokhla nazar aata hai.
     ───────────────────────────────────────────────────────── */
  @page { size: ${widthMm}mm auto; margin: 0; }
  * {
    box-sizing: border-box; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    -webkit-font-smoothing: none; text-rendering: geometricPrecision;
  }
  html, body { width: ${widthMm}mm; }
  body {
    font-family: Arial, Helvetica, 'Segoe UI', sans-serif;
    padding: ${wide ? '4mm 3mm' : '3mm 2mm'};
    color: #000;
    font-size: ${wide ? '13.5px' : '11.5px'};
    font-weight: 700;
    line-height: 1.4;
    background: #fff;
  }
  .c { text-align: center; }
  .b { font-weight: 900; }
  .shop { font-size: ${wide ? '20px' : '16px'}; font-weight: 900; letter-spacing: 0.3px; }
  .sub { font-size: ${wide ? '11.5px' : '10px'}; font-weight: 700; margin-top: 2px; }
  .div { border-top: 1.5px dashed #000; margin: 6px 0; }
  .dbl { border-top: 2.5px solid #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 3px 0; }
  .row .v { text-align: right; font-weight: 800; }
  .item { margin: 4px 0; }
  .iname { font-weight: 900; word-break: break-word; }
  .irow { display: flex; justify-content: space-between; font-weight: 700; font-size: ${wide ? '12.5px' : '10.5px'}; }
  .inote { font-size: ${wide ? '11px' : '9.5px'}; font-weight: 700; padding-left: 6px; }
  .iamt { font-weight: 900; }
  .total-row { display: flex; justify-content: space-between; font-size: ${wide ? '20px' : '16px'}; font-weight: 900; margin: 5px 0; }
  .khata-title { font-size: ${wide ? '11px' : '9.5px'}; font-weight: 900; letter-spacing: .5px; margin-bottom: 2px; }
  .khata-total { display: flex; justify-content: space-between; font-size: ${wide ? '15px' : '12.5px'}; font-weight: 900; border-top: 2px solid #000; margin-top: 3px; padding-top: 3px; }
  /* Le jane wale ka khana — khali dabba jahan wo dastkhat kare.
     Udhaar ke maamle me kaghaz par dastkhat hi asal saboot hai. */
  .recv { border: 2px solid #000; padding: 4px 5px; margin: 6px 0; }
  .recv-title { font-size: ${wide ? '10.5px' : '9px'}; font-weight: 900; letter-spacing: .5px; }
  .recv-name { font-size: ${wide ? '15px' : '12.5px'}; font-weight: 900; word-break: break-word; }
  .recv-sign { border-top: 1.5px dotted #000; margin-top: 12px; padding-top: 2px; font-size: ${wide ? '10px' : '8.5px'}; font-weight: 700; }
  .barcode { text-align: center; margin: 8px 0 2px; }
  .barcode svg { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  .barnum { font-size: 10.5px; font-weight: 800; letter-spacing: 1.5px; margin-top: 3px; }
  .thanks { font-size: ${wide ? '11.5px' : '10px'}; font-weight: 700; margin-top: 6px; }
</style></head><body>
  <div class="c shop">${escapeHtml(p.shopName)}</div>
  ${p.shopAddress ? `<div class="c sub">${escapeHtml(p.shopAddress)}</div>` : ''}
  ${p.shopPhone ? `<div class="c sub">Ph: ${escapeHtml(p.shopPhone)}</div>` : ''}
  <div class="div"></div>
  ${row('RECEIPT', p.saleNumber)}
  ${row('DATE', p.date.toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' }))}
  ${p.customerName ? row('CUSTOMER', p.customerName) : ''}
  ${p.cashierName ? row('CASHIER', p.cashierName) : ''}
  <div class="div"></div>
  ${itemsHtml}
  <div class="div"></div>
  ${row('Items', String(p.lines.length))}
  ${p.discount > 0 ? `
    ${row('Subtotal', formatPKR(p.subtotal))}
    ${row('Discount', `−${formatPKR(p.discount)}`)}
  ` : ''}
  ${p.deliveryCharge && p.deliveryCharge > 0 ? `
    ${p.discount > 0 ? '' : row('Subtotal', formatPKR(p.subtotal))}
    ${row('Delivery', `+${formatPKR(p.deliveryCharge)}`)}
    ${p.deliveryAddress ? `<div class="sub" style="margin:1px 0 3px;">📍 ${escapeHtml(p.deliveryAddress)}</div>` : ''}
  ` : ''}
  ${(p.extraRows ?? []).map((r) => row(r.label, r.value, r.bold)).join('')}
  <div class="dbl"></div>
  <div class="total-row"><span>TOTAL</span><span>${formatPKR(p.total)}</span></div>
  ${row(p.paymentLabel, formatPKR(p.paid))}
  ${p.paid > p.total ? row('CHANGE (wapis dein)', formatPKR(p.paid - p.total), true) : ''}
  ${due > 0 ? row('UDHAAR (baqi)', formatPKR(due), true) : ''}
  ${prevDue > 0 ? `
    <div class="div"></div>
    <div class="khata-title">KHATA — ${escapeHtml(p.customerName || 'Customer')}</div>
    ${row('Pichla udhaar', formatPKR(prevDue))}
    ${due > 0 ? row('Is bill ka', `+${formatPKR(due)}`) : ''}
    <div class="khata-total"><span>KUL UDHAAR</span><span>${formatPKR(prevDue + due)}</span></div>
  ` : ''}
  ${p.receivedByName ? `
    <div class="recv">
      <div class="recv-title">MAAL LE JANE WALA</div>
      <div class="recv-name">${escapeHtml(p.receivedByName)}</div>
      ${p.receivedByPhone ? `<div class="sub">Ph: ${escapeHtml(p.receivedByPhone)}</div>` : ''}
      <div class="recv-sign">Dastkhat / Signature</div>
    </div>
  ` : ''}
  <div class="div"></div>
  <div class="barcode">${realBarcodeSvg(p.saleNumber, widthMm)}<div class="barnum">${escapeHtml(p.saleNumber)}</div></div>
  <div class="div"></div>
  ${p.footerNote ? `<div class="c thanks">${escapeHtml(p.footerNote)}</div>` : ''}
  <div class="c thanks">Shukriya! Phir tashreef laiye.</div>
  <div class="c sub" style="margin-top:2px;">Powered by Nafaa POS</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 600);
      }, 150);
    };
  </script>
</body></html>`;
}

/**
 * Bill seedha printer par — beech me koi safha khole baghair.
 *
 * `false` tab milta hai jab browser ne popup rok diya ho. Bulane wale
 * ko us soorat me dukaan-daar ko batana chahiye ("popup allow karein"),
 * chup-chaap nazar-andaz nahi karna chahiye.
 */
export function printReceiptDirect(p: ReceiptPayload, widthMm: PrinterWidth): boolean {
  const w = window.open('', '_blank', `width=${widthMm === '80' ? 400 : 330},height=700`);
  if (!w) return false;
  w.document.open();
  w.document.write(buildReceiptHtml(p, widthMm));
  w.document.close();
  return true;
}

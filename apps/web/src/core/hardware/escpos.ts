/**
 * ESC/POS — thermal printer ki zabaan (Epson, Xprinter, Black Copper,
 * Sewoo… sab samajhte hain). Sirf ASCII: Urdu harf printer ke font me
 * nahi hote, is liye bill Roman me.
 */
const ESC = 0x1b;
const GS = 0x1d;

export class EscPos {
  private out: number[] = [];
  constructor(readonly cols: number) {
    this.out.push(ESC, 0x40); // init
  }

  private text(s: string) {
    // ASCII ke bahar ke harf printer par kachra — saaf kar do
    const clean = s.normalize('NFKD').replace(/[^\x20-\x7e\n]/g, '');
    for (let i = 0; i < clean.length; i++) this.out.push(clean.charCodeAt(i));
    return this;
  }

  align(a: 'left' | 'center' | 'right') { this.out.push(ESC, 0x61, a === 'left' ? 0 : a === 'center' ? 1 : 2); return this; }
  bold(on: boolean) { this.out.push(ESC, 0x45, on ? 1 : 0); return this; }
  /** 1 = aam, 2 = double height+width */
  size(n: 1 | 2) { this.out.push(GS, 0x21, n === 2 ? 0x11 : 0x00); return this; }
  line(s = '') { return this.text(s.slice(0, this.cols * 3)).feed(1); }
  feed(n = 1) { for (let i = 0; i < n; i++) this.out.push(0x0a); return this; }
  rule(ch = '-') { return this.line(ch.repeat(this.cols)); }

  /** Baayen label, daayen value — ek line me */
  row(left: string, right: string, width = this.cols) {
    const r = right.slice(0, width);
    const l = left.slice(0, Math.max(0, width - r.length - 1));
    return this.line(l + ' '.repeat(Math.max(1, width - l.length - r.length)) + r);
  }

  /** Lamba text kai lines me */
  wrap(s: string, indent = '') {
    const words = s.split(/\s+/);
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > this.cols - indent.length) { this.line(indent + cur.trim()); cur = w; }
      else cur += ' ' + w;
    }
    if (cur.trim()) this.line(indent + cur.trim());
    return this;
  }

  /** CODE128 barcode (GS k 73) */
  barcode(value: string) {
    const v = value.replace(/[^\x20-\x7e]/g, '').slice(0, 40);
    if (!v) return this;
    const data = [0x7b, 0x42, ...Array.from(v).map((c) => c.charCodeAt(0))]; // {B = code set B
    this.out.push(GS, 0x68, 60); // height
    this.out.push(GS, 0x77, this.cols >= 48 ? 2 : 2); // module width
    this.out.push(GS, 0x48, 0); // HRI off (neeche text khud)
    this.out.push(GS, 0x6b, 73, data.length, ...data);
    return this.feed(1);
  }

  /** QR code (GS ( k) — model 2 */
  qr(value: string, sizeDots = 6) {
    const d = Array.from(new TextEncoder().encode(value.slice(0, 300)));
    const len = d.length + 3;
    this.out.push(GS, 0x28, 0x6b, 4, 0, 0x31, 0x41, 0x32, 0x00);          // model 2
    this.out.push(GS, 0x28, 0x6b, 3, 0, 0x31, 0x43, sizeDots);             // size
    this.out.push(GS, 0x28, 0x6b, 3, 0, 0x31, 0x45, 0x31);                 // error level M
    this.out.push(GS, 0x28, 0x6b, len & 0xff, len >> 8, 0x31, 0x50, 0x30, ...d); // store
    this.out.push(GS, 0x28, 0x6b, 3, 0, 0x31, 0x51, 0x30);                 // print
    return this;
  }

  /** Cash drawer kholo (pin 2) — drawer printer ke RJ11 se jura ho */
  drawer() { this.out.push(ESC, 0x70, 0x00, 0x19, 0xfa); return this; }

  /** Kaat do (partial cut) */
  cut() { this.feed(3); this.out.push(GS, 0x56, 0x42, 0x00); return this; }

  bytes() { return new Uint8Array(this.out); }
}

/** Sirf drawer kholne ke bytes (bina bill) */
export const drawerKickBytes = () => new Uint8Array([ESC, 0x40, ESC, 0x70, 0x00, 0x19, 0xfa]);

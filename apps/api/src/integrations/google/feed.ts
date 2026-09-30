/* ═════════════════════════════════════════════════════════════
   GOOGLE MERCHANT CENTER — product feed (RSS 2.0 + g: namespace) aur
   local inventory (TSV). Merchant Center "Scheduled fetch" se roz ye
   URL parhta hai — koi Google API / approval nahi chahiye.
   ═════════════════════════════════════════════════════════════ */

export interface FeedItem {
  id: string;
  groupId?: string;
  title: string;
  description: string;
  link: string;
  image: string;
  extraImages: string[];
  price: number;
  inStock: boolean;
  brand?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  productType?: string | null;
  color?: string | null;
  size?: string | null;
}

/** GTIN (UPC/EAN) sahi hai? — check digit ke saath. Ghalat GTIN se Google product rok deta hai */
export function validGtin(raw?: string | null): string | null {
  const s = String(raw ?? '').replace(/\s/g, '');
  if (!/^\d{8}$|^\d{12,14}$/.test(s) || /^0+$/.test(s)) return null;
  // Andar ke (2xx) aur coupon (98/99) number GTIN nahi
  const p = s.padStart(14, '0');
  if (/^0{1,2}2/.test(p.slice(0, 3)) || /^(98|99)/.test(p.slice(1))) return null;
  const digits = p.split('').map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((t, d, i) => t + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check ? s : null;
}

const x = (v: unknown) => String(v ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n: number) => `${(Math.round(n * 100) / 100).toFixed(2)} PKR`;

export function productFeedXml(o: { title: string; link: string; items: FeedItem[] }) {
  const items = o.items.map((i) => {
    const tags: string[] = [
      `<g:id>${x(i.id)}</g:id>`,
      `<g:title>${x(i.title.slice(0, 150))}</g:title>`,
      `<g:description>${x((i.description || i.title).slice(0, 5000))}</g:description>`,
      `<g:link>${x(i.link)}</g:link>`,
      `<g:image_link>${x(i.image)}</g:image_link>`,
      ...i.extraImages.slice(0, 10).map((u) => `<g:additional_image_link>${x(u)}</g:additional_image_link>`),
      `<g:availability>${i.inStock ? 'in_stock' : 'out_of_stock'}</g:availability>`,
      `<g:price>${money(i.price)}</g:price>`,
      `<g:condition>new</g:condition>`,
    ];
    if (i.groupId) tags.push(`<g:item_group_id>${x(i.groupId)}</g:item_group_id>`);
    if (i.brand) tags.push(`<g:brand>${x(i.brand.slice(0, 70))}</g:brand>`);
    if (i.gtin) tags.push(`<g:gtin>${x(i.gtin)}</g:gtin>`);
    if (i.mpn) tags.push(`<g:mpn>${x(i.mpn.slice(0, 70))}</g:mpn>`);
    if (!i.gtin && !(i.brand && i.mpn)) tags.push('<g:identifier_exists>no</g:identifier_exists>');
    if (i.productType) tags.push(`<g:product_type>${x(i.productType.slice(0, 750))}</g:product_type>`);
    if (i.color) tags.push(`<g:color>${x(i.color.slice(0, 100))}</g:color>`);
    if (i.size) tags.push(`<g:size>${x(i.size.slice(0, 100))}</g:size>`);
    return `  <item>\n    ${tags.join('\n    ')}\n  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
 <channel>
  <title>${x(o.title)}</title>
  <link>${x(o.link)}</link>
  <description>${x(o.title)} — Nafaa POS product feed</description>
${items}
 </channel>
</rss>
`;
}

export interface LocalRow { storeCode: string; id: string; quantity: number; price: number }

/** Local inventory (dukaan me maujood) — TSV, Google ke khano ke naam */
export function localInventoryTsv(rows: LocalRow[]) {
  const clean = (v: string) => v.replace(/[\t\r\n]/g, ' ');
  const lines = ['store_code\tid\tquantity\tprice\tavailability'];
  for (const r of rows) {
    const q = Math.max(0, Math.floor(r.quantity));
    lines.push([clean(r.storeCode), clean(r.id), String(q), money(r.price), q > 0 ? 'in_stock' : 'out_of_stock'].join('\t'));
  }
  return lines.join('\n') + '\n';
}

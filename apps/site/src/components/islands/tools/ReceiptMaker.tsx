'use client';

/**
 * Receipt (bill) maker island: a till receipt for a 58 mm or 80 mm thermal
 * printer, or any printer. Shop details, items, discount, optional tax,
 * payment method and cash received (with change), then print. The shop
 * details are remembered on this device (localStorage); nothing is sent.
 *
 * A plain receipt, not an FBR fiscal invoice (that needs an FBR invoice
 * number and QR code from an integrated POS), and the island says so.
 *
 * With locale 'ur' the form and buttons are in Urdu; the printed receipt
 * itself stays in English (and left-to-right) so the till layout is the same.
 */
import { useEffect, useState } from 'react';
import { parseAmount, plain, round2 } from './format';
import { Field, Glyph, InputsPanel, Segmented, SmallButton, ToolFrame, pick, useToolUsed } from './kit';
import styles from './tools.module.css';

interface Item {
  id: number;
  name: string;
  qty: string;
  price: string;
}

interface Shop {
  name: string;
  line2: string;
  phone: string;
  footer: string;
}

type Paper = '58' | '80';
type Pay = 'Cash' | 'Card' | 'JazzCash' | 'Easypaisa' | 'Bank transfer';

const STORE_KEY = 'nafaa_tool_receipt_shop';
const PAYS: readonly Pay[] = ['Cash', 'Card', 'JazzCash', 'Easypaisa', 'Bank transfer'];
const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);
const money = (v: number) => new Intl.NumberFormat('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

function nowKarachi(): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date());
}

export function receiptTotals(items: { qty: number; price: number }[], discount: number, taxPct: number, received: number) {
  const subtotal = round2(items.reduce((s, i) => s + i.qty * i.price, 0));
  const disc = round2(Math.min(discount, subtotal));
  const tax = round2(((subtotal - disc) * taxPct) / 100);
  const total = round2(subtotal - disc + tax);
  return { subtotal, discount: disc, tax, total, change: received > 0 ? round2(received - total) : null };
}

const en = {
  frame: 'Receipt maker',
  yourShop: 'Your shop',
  shopName: 'Shop name',
  phone: 'Phone',
  address: 'Address',
  footer: 'Message at the bottom',
  footerHint: 'Saved on this device only.',
  billNo: 'Bill number',
  paper: 'Paper width',
  items: 'Items',
  item: (i: number) => `Item ${i}`,
  itemPlaceholder: 'Item name',
  qty: (i: number) => `Quantity, item ${i}`,
  qtyPlaceholder: 'Qty',
  price: (i: number) => `Price, item ${i}`,
  pricePlaceholder: 'Price',
  remove: (i: number) => `Remove item ${i}`,
  add: 'Add item',
  discount: 'Discount',
  tax: 'Sales tax (optional)',
  taxHint: 'Leave 0 if you do not charge tax.',
  paidBy: 'Paid by',
  pays: { Cash: 'Cash', Card: 'Card', JazzCash: 'JazzCash', Easypaisa: 'Easypaisa', 'Bank transfer': 'Bank transfer' } as Record<Pay, string>,
  received: 'Cash received',
  receivedHint: 'Shows the change to give back.',
  previewAria: 'Receipt preview',
  print: 'Print receipt',
  next: 'Next bill',
  note: 'In the print dialog choose your receipt printer and set margins to none. This is a plain receipt, not an FBR fiscal invoice.',
};

const STRINGS: { en: typeof en; ur: typeof en } = {
  en,
  ur: {
    frame: 'رسید بنائیں',
    yourShop: 'آپ کی دکان',
    shopName: 'دکان کا نام',
    phone: 'فون',
    address: 'پتہ',
    footer: 'نیچے لکھا جانے والا پیغام',
    footerHint: 'صرف اسی ڈیوائس پر محفوظ ہوتا ہے۔',
    billNo: 'بل نمبر',
    paper: 'کاغذ کی چوڑائی',
    items: 'آئٹمز',
    item: (i) => `آئٹم ${i}`,
    itemPlaceholder: 'آئٹم کا نام',
    qty: (i) => `تعداد، آئٹم ${i}`,
    qtyPlaceholder: 'تعداد',
    price: (i) => `قیمت، آئٹم ${i}`,
    pricePlaceholder: 'قیمت',
    remove: (i) => `آئٹم ${i} ہٹائیں`,
    add: 'آئٹم شامل کریں',
    discount: 'ڈسکاؤنٹ',
    tax: 'سیلز ٹیکس (اختیاری)',
    taxHint: 'ٹیکس نہیں لیتے تو 0 رہنے دیں۔',
    paidBy: 'پیسے کیسے دیے',
    pays: { Cash: 'کیش', Card: 'کارڈ', JazzCash: 'JazzCash', Easypaisa: 'Easypaisa', 'Bank transfer': 'بینک ٹرانسفر' },
    received: 'کتنا کیش ملا',
    receivedHint: 'واپس دینے والے پیسے دکھاتا ہے۔',
    previewAria: 'رسید کا پیش منظر',
    print: 'رسید پرنٹ کریں',
    next: 'اگلا بل',
    note: 'پرنٹ والی ونڈو میں اپنا رسید پرنٹر چنیں اور margins کو none کر دیں۔ یہ سادہ رسید ہے، FBR سے جڑی انوائس نہیں۔',
  },
};

export default function ReceiptMaker({ locale }: { locale?: string }) {
  const tx = pick(STRINGS, locale);
  const used = useToolUsed('receipt-maker');
  const [shop, setShop] = useState<Shop>({ name: '', line2: '', phone: '', footer: 'Shukriya! Phir tashreef layein.' });
  const [paper, setPaper] = useState<Paper>('80');
  const [billNo, setBillNo] = useState('1001');
  const [stamp, setStamp] = useState('');
  const [items, setItems] = useState<Item[]>([{ id: 1, name: '', qty: '1', price: '' }]);
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [pay, setPay] = useState<Pay>('Cash');
  const [received, setReceived] = useState('');

  useEffect(() => {
    setStamp(nowKarachi());
    try {
      const saved = window.localStorage.getItem(STORE_KEY);
      if (saved) setShop((prev) => ({ ...prev, ...(JSON.parse(saved) as Partial<Shop>) }));
    } catch {
      // Storage can be blocked; the form still works.
    }
  }, []);

  const updateShop = (patch: Partial<Shop>) => {
    used();
    setShop((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        // Remembering details is optional.
      }
      return next;
    });
  };
  const updateItem = (id: number, patch: Partial<Item>) => {
    used();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };
  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  const lines = items.map((i) => ({ ...i, q: n(i.qty), p: n(i.price) }));
  const t = receiptTotals(lines.map((l) => ({ qty: l.q, price: l.p })), n(discount), n(tax), pay === 'Cash' ? n(received) : 0);
  const count = lines.reduce((s, l) => s + (l.p > 0 ? l.q : 0), 0);
  const width = paper === '58' ? '48mm' : '72mm';

  return (
    <ToolFrame label={tx.frame}>
      <InputsPanel className="space-y-6">
        <div>
          <h3 className="text-h4 text-fg-strong">{tx.yourShop}</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label={tx.shopName} inputMode="text" autoComplete="organization" value={shop.name} onChange={(v) => updateShop({ name: v })} />
            <Field label={tx.phone} inputMode="text" autoComplete="tel" value={shop.phone} onChange={(v) => updateShop({ phone: v })} />
            <Field label={tx.address} inputMode="text" value={shop.line2} onChange={(v) => updateShop({ line2: v })} className="sm:col-span-2" />
            <Field label={tx.footer} inputMode="text" value={shop.footer} onChange={(v) => updateShop({ footer: v })} className="sm:col-span-2" hint={tx.footerHint} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tx.billNo} inputMode="text" value={billNo} onChange={touch(setBillNo)} />
          <Segmented
            legend={tx.paper}
            value={paper}
            onChange={touch(setPaper)}
            options={[
              { value: '58', label: '58 mm' },
              { value: '80', label: '80 mm' },
            ]}
          />
        </div>
        <div>
          <h3 className="text-h4 text-fg-strong">{tx.items}</h3>
          <div className="mt-3 space-y-3 sm:space-y-2">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.25rem] gap-2 sm:grid-cols-[minmax(0,1fr)_4.5rem_7rem_2.25rem]">
                <Field label={tx.item(index + 1)} hideLabel inputMode="text" placeholder={tx.itemPlaceholder} value={item.name} onChange={(v) => updateItem(item.id, { name: v })} className="col-span-3 sm:col-span-1" />
                <Field label={tx.qty(index + 1)} hideLabel placeholder={tx.qtyPlaceholder} value={item.qty} onChange={(v) => updateItem(item.id, { qty: v })} />
                <Field label={tx.price(index + 1)} hideLabel prefix="Rs" placeholder={tx.pricePlaceholder} value={item.price} onChange={(v) => updateItem(item.id, { price: v })} />
                <button
                  type="button"
                  aria-label={tx.remove(index + 1)}
                  disabled={items.length === 1}
                  onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                  className="inline-flex h-11 items-center justify-center rounded-md text-fg-subtle transition-colors duration-fast hover:bg-surface-3 hover:text-fg-strong disabled:opacity-40"
                >
                  {Glyph.x}
                </button>
              </div>
            ))}
            <SmallButton
              variant="ghost"
              className="-ml-2"
              onClick={() => setItems((prev) => [...prev, { id: Math.max(0, ...prev.map((i) => i.id)) + 1, name: '', qty: '1', price: '' }])}
            >
              {Glyph.plus}
              {` ${tx.add}`}
            </SmallButton>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tx.discount} prefix="Rs" value={discount} onChange={touch(setDiscount)} placeholder="0" />
          <Field label={tx.tax} suffix="%" value={tax} onChange={touch(setTax)} placeholder="0" hint={tx.taxHint} />
        </div>
        <div className="space-y-4">
          <Segmented legend={tx.paidBy} value={pay} onChange={touch(setPay)} options={PAYS.map((p) => ({ value: p, label: tx.pays[p] }))} />
          {pay === 'Cash' ? (
            <Field label={tx.received} prefix="Rs" value={received} onChange={touch(setReceived)} placeholder="0" hint={tx.receivedHint} className="sm:max-w-[50%]" />
          ) : null}
        </div>
      </InputsPanel>

      <div className="min-w-0 space-y-3 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
        <div className="flex justify-center rounded-lg border border-line bg-surface-3 p-4">
          <article
            aria-label={tx.previewAria}
            dir={locale === 'ur' ? 'ltr' : undefined}
            style={{ '--paper': width }}
            className={`${styles.sheet} ${styles.receipt} w-[var(--paper)] max-w-full bg-white px-2 py-3 font-mono text-[11px] leading-snug text-black shadow-e2`}
          >
            <header className="text-center">
              <p className="break-words text-[13px] font-bold uppercase">{shop.name || 'Shop name'}</p>
              {shop.line2 ? <p className="break-words">{shop.line2}</p> : null}
              {shop.phone ? <p>Ph: {shop.phone}</p> : null}
            </header>
            <div className="my-2 border-t border-dashed border-black" />
            <div className="flex justify-between gap-2">
              <span>Bill # {billNo}</span>
              <span className="text-right">{stamp}</span>
            </div>
            <div className="my-2 border-t border-dashed border-black" />
            <table className="w-full border-collapse tabular-nums">
              <thead>
                <tr className="text-left">
                  <th className="pb-1 font-bold">Item</th>
                  <th className="pb-1 text-right font-bold">Qty</th>
                  <th className="pb-1 text-right font-bold">Amt</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="break-words pr-1">
                      {l.name || 'Item'}
                      {l.q !== 1 && l.p > 0 ? <span className="block text-[10px]">@ {money(l.p)}</span> : null}
                    </td>
                    <td className="text-right">{plain(l.q)}</td>
                    <td className="text-right">{money(round2(l.q * l.p))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="my-2 border-t border-dashed border-black" />
            <dl className="space-y-0.5 tabular-nums">
              <div className="flex justify-between">
                <dt>Subtotal ({plain(count)} items)</dt>
                <dd>{money(t.subtotal)}</dd>
              </div>
              {t.discount ? (
                <div className="flex justify-between">
                  <dt>Discount</dt>
                  <dd>-{money(t.discount)}</dd>
                </div>
              ) : null}
              {t.tax ? (
                <div className="flex justify-between">
                  <dt>Sales tax ({plain(n(tax))}%)</dt>
                  <dd>{money(t.tax)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-black pt-1 text-[13px] font-bold">
                <dt>TOTAL Rs</dt>
                <dd>{money(t.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Paid by</dt>
                <dd>{pay}</dd>
              </div>
              {t.change !== null ? (
                <>
                  <div className="flex justify-between">
                    <dt>Cash received</dt>
                    <dd>{money(n(received))}</dd>
                  </div>
                  <div className="flex justify-between font-bold">
                    <dt>{t.change < 0 ? 'Still to pay' : 'Change'}</dt>
                    <dd>{money(Math.abs(t.change))}</dd>
                  </div>
                </>
              ) : null}
            </dl>
            <div className="my-2 border-t border-dashed border-black" />
            {shop.footer ? <p className="break-words text-center">{shop.footer}</p> : null}
          </article>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SmallButton
            variant="primary"
            onClick={() => {
              used();
              setStamp(nowKarachi());
              window.setTimeout(() => window.print(), 0);
            }}
          >
            {Glyph.printer}
            {` ${tx.print}`}
          </SmallButton>
          <SmallButton
            variant="ghost"
            onClick={() => {
              used();
              setItems([{ id: 1, name: '', qty: '1', price: '' }]);
              setDiscount('');
              setReceived('');
              setBillNo((prev) => (/^\d+$/.test(prev) ? String(Number(prev) + 1) : prev));
            }}
          >
            {Glyph.reset}
            {` ${tx.next}`}
          </SmallButton>
        </div>
        <p className="text-small text-fg-subtle">
          {tx.note}
        </p>
      </div>
    </ToolFrame>
  );
}

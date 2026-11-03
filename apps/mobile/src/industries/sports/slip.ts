/**
 * Slips through the shared receipt engine (web orderSlip / repairSlip): the
 * team order with kit lines, printing list and money, and the repair slip.
 * Slip words follow the shop's bill language.
 */

import { formatMoney } from '@/core/format';
import { getReceiptSetup, printPaper, printReceipt, shareReceiptPdf, type ReceiptDoc, type ReceiptLang, type ReceiptRowDoc } from '@/core/receipt';
import { t } from '@/core/i18n';
import type { RepairDetail, SportsRepairService, TeamOrderDetail } from './api';
import { TEAM_STATUS, day, dayFull, typeLabel } from './meta';

type Word = 'team' | 'contact' | 'delivery' | 'status' | 'print' | 'players' | 'design' | 'advance' | 'balance' | 'org' | 'notSet' | 'job' | 'condition' | 'estimate' | 'ready' | 'tell' | 'bring' | 'customer' | 'shop' | 'po';

const WORDS: Record<ReceiptLang, Record<Word, string>> = {
  roman: {
    team: 'Team', contact: 'Rabta', delivery: 'Delivery', status: 'Halat', print: 'Printing list', players: 'players', design: 'Printing / design', advance: 'Advance mila', balance: 'Baqi', org: 'Idara', notSet: 'Tay nahi',
    job: 'Kaam', condition: 'Haalat', estimate: 'Andaza', ready: 'Tayyar', tell: 'Bata denge', bring: 'Saman lene ke liye yeh parchi saath laayein.', customer: 'Customer', shop: 'Dukaan', po: 'PO',
  },
  en: {
    team: 'Team', contact: 'Contact', delivery: 'Delivery', status: 'Status', print: 'Printing list', players: 'players', design: 'Printing / design', advance: 'Advance received', balance: 'Balance', org: 'Organisation', notSet: 'Not set',
    job: 'Work', condition: 'Condition', estimate: 'Estimate', ready: 'Ready by', tell: 'We will tell you', bring: 'Please bring this slip to collect the item.', customer: 'Customer', shop: 'Shop', po: 'PO',
  },
  ur: {
    team: 'ٹیم', contact: 'رابطہ', delivery: 'ڈیلیوری', status: 'حالت', print: 'پرنٹنگ لسٹ', players: 'کھلاڑی', design: 'پرنٹنگ / ڈیزائن', advance: 'ایڈوانس ملا', balance: 'باقی', org: 'ادارہ', notSet: 'طے نہیں',
    job: 'کام', condition: 'حالت', estimate: 'اندازہ', ready: 'تیار', tell: 'بتا دیں گے', bring: 'سامان لینے کے لیے یہ پرچی ساتھ لائیں۔', customer: 'گاہک', shop: 'دکان', po: 'پی او',
  },
};
const row = (label: string, value?: string | null, bold?: boolean): ReceiptRowDoc[] => (value ? [{ label, value, ...(bold && { bold }) }] : []);

export function teamSlip(o: TeamOrderDetail, lang: ReceiptLang): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const roster = o.playerNames ?? [];
  return {
    saleNumber: o.orderNumber, date: new Date(o.createdAt), customerName: o.teamName, customerPhone: o.contactPhone, customerAddress: o.address ?? undefined, partyLabel: w.team,
    infoRows: [
      ...row(w.org, o.organization), ...row(w.contact, o.contactPerson), ...row(w.delivery, o.expectedDeliveryDate ? dayFull(o.expectedDeliveryDate) : w.notSet, true), ...row(w.status, t(TEAM_STATUS[o.status]?.label ?? o.status)),
      ...row(w.po, o.poNumber), ...(roster.length ? [{ label: w.print, value: `${roster.length} ${w.players}` }] : []), ...row(w.design, o.customizationDetails),
    ],
    lines: o.items.map((i) => ({ name: `${i.productName}${[i.size, i.color].filter(Boolean).length ? ` (${[i.size, i.color].filter(Boolean).join(' · ')})` : ''}`, qty: i.quantity, unit: '', price: i.unitPrice + (i.printingPrice ?? 0), total: i.total }) as ReceiptDoc['lines'][number]),
    subtotal: o.subtotal, discount: o.discountAmount, deliveryCharge: o.shippingCharge || undefined,
    extraRows: roster.length ? roster.slice(0, 40).map((p, n) => ({ label: `${n + 1}. ${p.name}`, value: [p.number && `#${p.number}`, p.size].filter(Boolean).join(' ') })) : [],
    total: o.totalAmount, paid: o.advancePaid, paymentLabel: w.advance, footerNote: o.notes ?? undefined, signLabels: [w.customer, w.shop],
  };
}

export function repairSlip(r: Pick<RepairDetail | SportsRepairService, 'serviceNumber' | 'customerName' | 'customerPhone' | 'itemType' | 'itemBrand' | 'itemDescription' | 'issue' | 'repairType' | 'receivedAt' | 'estimatedReadyAt' | 'estimatedCost' | 'advancePaid'>, lang: ReceiptLang): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const left = Math.max(r.estimatedCost - r.advancePaid, 0);
  return {
    saleNumber: r.serviceNumber, date: new Date(r.receivedAt), customerName: r.customerName, customerPhone: r.customerPhone, partyLabel: w.customer,
    infoRows: [...row(w.job, t(r.repairType || r.issue)), ...row(w.condition, r.itemDescription), ...row(w.ready, r.estimatedReadyAt ? day(r.estimatedReadyAt) : w.tell, true)],
    lines: [{ name: `${t(r.itemType)}${r.itemBrand ? ` · ${r.itemBrand}` : ''}`, qty: 1, unit: '', price: r.estimatedCost, total: r.estimatedCost } as ReceiptDoc['lines'][number]],
    subtotal: r.estimatedCost, discount: 0, total: r.estimatedCost, paid: r.advancePaid, paymentLabel: w.advance, footerNote: `${w.balance}: ${formatMoney(left)}. ${w.bring}`, signLabels: [w.customer, w.shop],
  };
}

export async function sendSlip(doc: ReceiptDoc, shop: string, lang: ReceiptLang, share = false) {
  const setup = getReceiptSetup(shop);
  const opts = { paper: printPaper(setup), setup, copies: 1, lang };
  if (share) await shareReceiptPdf(doc, opts);
  else await printReceipt(doc, opts);
}

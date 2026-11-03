/**
 * Workshop slips through the shared receipt engine (web slips.ts): the job card
 * the customer keeps when leaving the vehicle (and the estimate as work goes
 * on), and the WhatsApp texts for jobs and service reminders. Words follow the
 * shop's bill language.
 */

import { isReady, jobDue } from '@nafaa/core/industries/autoparts';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { slipRow, type ReceiptDoc, type ReceiptLang } from '../_shared/trade/slip';
import type { ReminderRow, WorkshopJob } from './api';
import { dateTime, dayOnly, jobTypeOf, km, priorityOf, statusOf, vehicleName } from './meta';

type Word = 'customer' | 'shop' | 'vehicle' | 'meter' | 'work' | 'complaint' | 'check' | 'status' | 'urgent' | 'ready' | 'mechanic' | 'fuel' | 'with' | 'damage' | 'labour' | 'outside'
  | 'ownPart' | 'laterEstimate' | 'advance' | 'received' | 'nothing' | 'balance' | 'khata' | 'allPaid' | 'warranty' | 'bring' | 'stampDone' | 'stampCard' | 'spare' | 'tools';

const WORDS: Record<ReceiptLang, Record<Word, string>> = {
  roman: {
    customer: 'Customer', shop: 'Dukaan', vehicle: 'Gaari', meter: 'Meter', work: 'Kaam', complaint: 'Shikayat', check: 'Check', status: 'Halat', urgent: 'Jaldi', ready: 'Gaari milegi',
    mechanic: 'Mechanic', fuel: 'Petrol', with: 'Saath', damage: 'Nuqsan pehle se', labour: 'Mazdoori', outside: 'Bahar ka kaam', ownPart: 'apna part', laterEstimate: 'Kaam ka andaza baad me',
    advance: 'Advance mila', received: 'Mila', nothing: 'Abhi kuch nahi mila', balance: 'Baqi', khata: 'khata me', allPaid: 'Poora paisa mil gaya.', warranty: 'Kaam par {{m}} mahine ki warranty.',
    bring: 'Gaari me qeemti saman na chhorein. Ye parchi saath laayein.', stampDone: 'GAARI DE DI', stampCard: 'JOB CARD', spare: 'Stepney', tools: 'Auzaar',
  },
  en: {
    customer: 'Customer', shop: 'Shop', vehicle: 'Vehicle', meter: 'Odometer', work: 'Work', complaint: 'Complaint', check: 'Findings', status: 'Status', urgent: 'Priority', ready: 'Ready by',
    mechanic: 'Mechanic', fuel: 'Fuel', with: 'In the vehicle', damage: 'Existing damage', labour: 'Labour', outside: 'Outside work', ownPart: 'customer part', laterEstimate: 'Estimate to follow',
    advance: 'Advance received', received: 'Received', nothing: 'Nothing received yet', balance: 'Balance', khata: 'on khata', allPaid: 'Fully paid.', warranty: '{{m}} months warranty on the work.',
    bring: 'Do not leave valuables in the vehicle. Please bring this slip.', stampDone: 'HANDED BACK', stampCard: 'JOB CARD', spare: 'Spare tyre', tools: 'Tools',
  },
  ur: {
    customer: 'گاہک', shop: 'دکان', vehicle: 'گاڑی', meter: 'میٹر', work: 'کام', complaint: 'شکایت', check: 'چیک', status: 'حالت', urgent: 'جلدی', ready: 'گاڑی ملے گی',
    mechanic: 'مکینک', fuel: 'پیٹرول', with: 'ساتھ', damage: 'پہلے سے نقصان', labour: 'مزدوری', outside: 'باہر کا کام', ownPart: 'اپنا پارٹ', laterEstimate: 'کام کا اندازہ بعد میں',
    advance: 'ایڈوانس ملا', received: 'ملا', nothing: 'ابھی کچھ نہیں ملا', balance: 'باقی', khata: 'کھاتے میں', allPaid: 'پورا پیسہ مل گیا۔', warranty: 'کام پر {{m}} مہینے کی وارنٹی۔',
    bring: 'گاڑی میں قیمتی سامان نہ چھوڑیں۔ یہ پرچی ساتھ لائیں۔', stampDone: 'گاڑی دے دی', stampCard: 'جاب کارڈ', spare: 'اسٹیپنی', tools: 'اوزار',
  },
};

/** Job card: vehicle, km, complaint, work and parts so far, estimate and advance. */
export function jobCard(j: WorkshopJob, lang: ReceiptLang): ReceiptDoc {
  const w = WORDS[lang] ?? WORDS.roman;
  const lines = [
    ...j.laborItems.map((l) => ({ name: `${w.labour}: ${l.description}`, qty: 1, unit: '', price: Number(l.total), total: Number(l.total) })),
    ...j.partsUsed.map((p) => ({ name: `${p.partName}${p.partNumber ? ` (${p.partNumber})` : ''}${p.isCustomerSupplied ? ` — ${w.ownPart}` : ''}`, qty: Number(p.quantity), unit: '', price: Number(p.unitPrice), total: Number(p.total) })),
    ...(j.externalWork ?? []).map((e) => ({ name: `${w.outside}: ${e.description}`, qty: 1, unit: '', price: Number(e.total), total: Number(e.total) })),
  ];
  const paid = Number(j.paidAmount) || 0;
  const total = Number(j.total) || 0;
  const due = jobDue(j);
  const delivered = j.status === 'DELIVERED';
  const kit = [j.hasSpareTire ? w.spare : '', j.hasToolkit ? w.tools : ''].filter(Boolean).join(', ');
  return {
    saleNumber: j.jobNumber,
    date: new Date(j.receivedAt),
    stamp: delivered ? w.stampDone : w.stampCard,
    customerName: j.customerName ?? undefined,
    customerPhone: j.customerPhone ?? undefined,
    partyLabel: w.customer,
    infoRows: [
      { label: w.vehicle, value: [j.registrationNumber, vehicleName(j)].filter(Boolean).join(' — ') || '—', bold: true },
      ...slipRow(w.meter, j.odometerKm != null ? km(j.odometerKm) : null),
      { label: w.work, value: jobTypeOf(j.jobType) },
      ...slipRow(w.complaint, j.customerComplaint),
      ...slipRow(w.check, j.diagnosis),
      { label: w.status, value: t(statusOf(j.status).label) },
      ...(j.priority !== 'NORMAL' ? [{ label: w.urgent, value: t(priorityOf(j.priority).label) }] : []),
      ...slipRow(w.ready, j.promisedAt && !delivered ? dateTime(j.promisedAt) : null, true),
      ...slipRow(w.mechanic, j.mechanicName),
      ...slipRow(w.fuel, j.fuelLevel),
      ...slipRow(w.with, kit),
      ...slipRow(w.damage, j.externalDamages),
    ],
    lines: lines.length ? lines : [{ name: w.laterEstimate, qty: 1, unit: '', price: 0, total: 0 }],
    subtotal: Number(j.subtotal) || lines.reduce((s, l) => s + l.total, 0),
    discount: Number(j.discount) || 0,
    total,
    paid,
    paymentLabel: paid > 0 ? (delivered ? w.received : w.advance) : w.nothing,
    footerNote: [
      due > 0 ? `${w.balance} ${formatMoney(due)}${delivered ? ` — ${w.khata}` : ''}.` : total > 0 ? w.allPaid : '',
      j.warrantyMonths > 0 ? w.warranty.replace('{{m}}', String(j.warrantyMonths)) : '',
      delivered ? '' : w.bring,
    ].filter(Boolean).join(' '),
    signLabels: [w.customer, w.shop],
  } as ReceiptDoc;
}

type MsgWord = 'hello' | 'yourVehicle' | 'ready' | 'status' | 'readyAt' | 'bill' | 'got' | 'due' | 'thanks' | 'reminderTail' | 'orKm';
const MSG: Record<ReceiptLang, Record<MsgWord, string>> = {
  roman: { hello: 'Assalam o alaikum', yourVehicle: 'aap ki gaari', ready: 'Gaari tayyar hai — jab chahein le jayein.', status: 'Halat', readyAt: 'Tayyar hogi', bill: 'Bill', got: 'Mila', due: 'Baqi', thanks: 'Shukriya!',
    reminderTail: 'Waqt par service se gaari lambi chalti hai. Aaj hi aayein ya call karein.', orKm: 'ya {{km}} par' },
  en: { hello: 'Hello', yourVehicle: 'your vehicle', ready: 'Your vehicle is ready — collect it any time.', status: 'Status', readyAt: 'Ready by', bill: 'Bill', got: 'Received', due: 'Balance', thanks: 'Thank you!',
    reminderTail: 'Servicing on time keeps your vehicle running longer. Please visit or call us today.', orKm: 'or at {{km}}' },
  ur: { hello: 'السلام علیکم', yourVehicle: 'آپ کی گاڑی', ready: 'گاڑی تیار ہے — جب چاہیں لے جائیں۔', status: 'حالت', readyAt: 'تیار ہوگی', bill: 'بل', got: 'ملا', due: 'باقی', thanks: 'شکریہ!',
    reminderTail: 'وقت پر سروس سے گاڑی لمبی چلتی ہے۔ آج ہی آئیں یا کال کریں۔', orKm: 'یا {{km}} پر' },
};

/** WhatsApp text for a job: status, ready time and money. */
export function jobMessage(j: WorkshopJob, shop: string, lang: ReceiptLang): string {
  const m = MSG[lang] ?? MSG.roman;
  const total = Number(j.total) || 0;
  const paid = Number(j.paidAmount) || 0;
  const due = jobDue(j);
  const ready = isReady(j.status);
  return [
    `${m.hello} ${j.customerName ?? ''},`.replace(' ,', ','),
    `${shop}: ${m.yourVehicle} ${[j.registrationNumber, vehicleName(j)].filter(Boolean).join(' ')} (${j.jobNumber})`,
    ready ? m.ready : `${m.status}: ${t(statusOf(j.status).label)}`,
    !ready && j.promisedAt && j.status !== 'DELIVERED' ? `${m.readyAt}: ${dateTime(j.promisedAt)}` : '',
    total > 0 ? `${m.bill}: ${formatMoney(total)}${paid > 0 ? ` · ${m.got}: ${formatMoney(paid)}` : ''}` : '',
    due > 0 ? `${m.due}: ${formatMoney(due)}` : '',
    m.thanks,
  ].filter(Boolean).join('\n');
}

/** WhatsApp text for a service reminder. */
export function reminderMessage(r: ReminderRow, shop: string, lang: ReceiptLang): string {
  const m = MSG[lang] ?? MSG.roman;
  const v = r.vehicle;
  return [
    `${m.hello} ${v?.ownerName ?? ''},`.replace(' ,', ','),
    `${shop}: ${m.yourVehicle} ${[v?.registrationNumber, v ? vehicleName(v) : ''].filter(Boolean).join(' ')}`,
    `${r.title}${r.dueDate ? ` — ${dayOnly(r.dueDate)}` : ''}${r.dueOdometerKm ? ` ${m.orKm.replace('{{km}}', km(r.dueOdometerKm))}` : ''}.`,
    m.reminderTail,
    m.thanks,
  ].join('\n');
}

/** WhatsApp text for a vehicle whose service time has come (customer vehicles screen). */
export function serviceNudge(owner: string | undefined, plateNo: string, shop: string, lang: ReceiptLang): string {
  const m = MSG[lang] ?? MSG.roman;
  return [`${m.hello} ${owner ?? ''},`.replace(' ,', ','), `${shop}: ${m.yourVehicle} ${plateNo}`, m.reminderTail, m.thanks].join('\n');
}

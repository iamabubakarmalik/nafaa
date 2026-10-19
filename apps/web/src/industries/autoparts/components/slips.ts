/**
 * Printed slips for the workshop, through the shared receipt engine so they
 * follow the shop's bill design and printer: the job card the customer keeps
 * when leaving the vehicle (and the estimate as work goes on), and the
 * WhatsApp texts for jobs and service reminders.
 */

import { formatPKR } from '@core/lib/format';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup, printPaper } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptRowDoc } from '@core/receipt/types';
import type { WorkshopJob } from '../api/workshop-jobs.api';
import type { ReminderRow } from '../api/service-reminders.api';
import { dateTime, dayOnly, jobTypeOf, km, priorityOf, statusOf, vehicleName } from './meta';

const row = (label: string, value?: string | number | null, bold = false): ReceiptRowDoc[] =>
  (value || value === 0 ? [{ label, value: String(value), bold }] : []);

/** Job card: vehicle, km, complaint, work and parts so far, estimate and advance. */
export function printJobCard(j: WorkshopJob, shopName: string) {
  const setup = getReceiptSetup(shopName);
  const lines = [
    ...j.laborItems.map((l) => ({ name: `Mazdoori: ${l.description}`, qty: 1, unit: '', price: Number(l.total), total: Number(l.total) })),
    ...j.partsUsed.map((p) => ({ name: `${p.partName}${p.partNumber ? ` (${p.partNumber})` : ''}${p.isCustomerSupplied ? ' — apna part' : ''}`, qty: Number(p.quantity), unit: '', price: Number(p.unitPrice), total: Number(p.total) })),
    ...(j.externalWork ?? []).map((e) => ({ name: `Bahar ka kaam: ${e.description}`, qty: 1, unit: '', price: Number(e.total), total: Number(e.total) })),
  ];
  const paid = Number(j.paidAmount) || 0;
  const total = Number(j.total) || 0;
  const due = Math.max(total - paid, 0);
  const delivered = j.status === 'DELIVERED';
  const kit = [j.hasSpareTire ? 'Stepney' : '', j.hasToolkit ? 'Auzaar' : ''].filter(Boolean).join(', ');
  const doc: ReceiptDoc = {
    saleNumber: j.jobNumber,
    date: new Date(j.receivedAt),
    stamp: delivered ? 'GAARI DE DI' : 'JOB CARD',
    customerName: j.customerName ?? undefined,
    customerPhone: j.customerPhone ?? undefined,
    partyLabel: 'Customer',
    infoRows: [
      { label: 'Gaari', value: [j.registrationNumber, vehicleName(j)].filter(Boolean).join(' — ') || '—', bold: true },
      ...row('Meter', j.odometerKm != null ? km(j.odometerKm) : null),
      { label: 'Kaam', value: jobTypeOf(j.jobType) },
      ...row('Shikayat', j.customerComplaint),
      ...row('Check', j.diagnosis),
      { label: 'Halat', value: statusOf(j.status).label },
      ...(j.priority !== 'NORMAL' ? [{ label: 'Jaldi', value: priorityOf(j.priority).label }] : []),
      ...row('Gaari milegi', j.promisedAt && !delivered ? dateTime(j.promisedAt) : null, true),
      ...row('Mechanic', j.mechanicName),
      ...row('Petrol', j.fuelLevel),
      ...row('Saath', kit),
      ...row('Nuqsan pehle se', j.externalDamages),
    ],
    lines: lines.length ? lines : [{ name: 'Kaam ka andaza baad me', qty: 1, unit: '', price: 0, total: 0 }],
    subtotal: Number(j.subtotal) || lines.reduce((s, l) => s + l.total, 0),
    discount: Number(j.discount) || 0,
    total,
    paid,
    paymentLabel: paid > 0 ? (delivered ? 'Mila' : 'Advance mila') : 'Abhi kuch nahi mila',
    footerNote: [
      due > 0 ? `Baqi ${formatPKR(due)}${delivered ? ' — khata me' : ' gaari lete waqt'}.` : total > 0 ? 'Poora paisa mil gaya.' : '',
      j.warrantyMonths > 0 ? `Kaam par ${j.warrantyMonths} mahine ki warranty.` : '',
      delivered ? '' : 'Gaari me qeemti saman na chhorein. Ye parchi saath laayein.',
    ].filter(Boolean).join(' '),
    signLabels: ['Customer', 'Dukaan'],
  };
  printReceipt(doc, { paper: printPaper(setup), setup, copies: 1 });
}

/** WhatsApp text for a job: status, ready time and money. */
export function jobMessage(j: WorkshopJob, shopName: string): string {
  const total = Number(j.total) || 0;
  const paid = Number(j.paidAmount) || 0;
  const due = Math.max(total - paid, 0);
  const ready = ['READY_FOR_TEST', 'QUALITY_CHECK', 'COMPLETED'].includes(j.status);
  return [
    `Assalam o alaikum ${j.customerName ?? ''},`.replace(' ,', ','),
    `${shopName}: aap ki gaari ${[j.registrationNumber, vehicleName(j)].filter(Boolean).join(' ')} (job ${j.jobNumber})`,
    ready ? 'Gaari tayyar hai — jab chahein le jayein.' : `Halat: ${statusOf(j.status).label}`,
    !ready && j.promisedAt && j.status !== 'DELIVERED' ? `Tayyar hogi: ${dateTime(j.promisedAt)}` : '',
    total > 0 ? `Bill: ${formatPKR(total)}${paid > 0 ? ` · Mila: ${formatPKR(paid)}` : ''}` : '',
    due > 0 ? `Baqi: ${formatPKR(due)}` : '',
    'Shukriya!',
  ].filter(Boolean).join('\n');
}

/** WhatsApp text for a service reminder. */
export function reminderMessage(r: ReminderRow, shopName: string): string {
  const v = r.vehicle;
  return [
    `Assalam o alaikum ${v?.ownerName ?? ''},`.replace(' ,', ','),
    `${shopName}: aap ki gaari ${[v?.registrationNumber, v ? vehicleName(v) : ''].filter(Boolean).join(' ')}`,
    `${r.title}${r.dueDate ? ` — ${dayOnly(r.dueDate)}` : ''}${r.dueOdometerKm ? ` ya ${km(r.dueOdometerKm)} par` : ''}.`,
    'Waqt par service se gaari lambi chalti hai. Aaj hi aayein ya call karein.',
    'Shukriya!',
  ].join('\n');
}

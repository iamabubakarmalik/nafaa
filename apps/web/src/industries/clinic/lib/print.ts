/**
 * Clinic prints: the token slip goes through the shop's receipt design
 * (thermal or A4, like every bill); the prescription and the lab report
 * are A4 pages with the clinic's name, the doctor and the patient on top.
 */

import { printHtml, printReceipt } from '@core/receipt/print';
import { esc } from '@core/receipt/html';
import { NAFAA, fetchReceiptSetup, getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptSetup } from '@core/receipt/types';
import type { Appointment, FeeSale } from '../api/appointments.api';
import type { LabOrder } from '../api/lab-orders.api';
import type { Prescription } from '../api/prescriptions.api';
import type { Vitals } from '../api/vitals.api';
import { ageOf, bloodLabel, dateTime, drName, genderLabel, shortDate, visitLabel } from './meta';

type PatientLite = { fullName: string; mrn: string; phonePrimary?: string | null; dateOfBirth?: string | null; gender?: string | null; bloodGroup?: string | null; allergies?: string[] };
type DoctorLite = { fullName: string; title?: string | null; qualifications?: string[]; pmcNumber?: string | null };

const setup = () => fetchReceiptSetup().catch(() => getReceiptSetup());

/** Token slip with the fee bill, printed in the shop's receipt design. */
export function printTokenSlip(apt: Appointment, patient: PatientLite | null | undefined, doctor: DoctorLite | null | undefined, sale?: FeeSale | null) {
  const paid = sale ? sale.paidAmount : apt.paidAmount;
  printReceipt({
    saleNumber: sale?.saleNumber ?? apt.appointmentNumber,
    date: new Date(),
    stamp: `Token ${apt.tokenNumber ?? '-'}`,
    customerName: patient?.fullName,
    customerPhone: patient?.phonePrimary ?? undefined,
    infoRows: [
      { label: 'Token', value: String(apt.tokenNumber ?? '-'), bold: true },
      { label: 'Doctor', value: drName(doctor) || '—' },
      { label: 'MR No.', value: patient?.mrn ?? '—' },
      { label: 'Visit', value: visitLabel(apt.visitType) },
      { label: 'Waqt', value: dateTime(apt.scheduledStart) },
    ],
    lines: [{ name: `Consultation fee${apt.isEmergency ? ' (emergency)' : ''}`, qty: 1, unit: 'visit', price: apt.consultationFee, total: apt.consultationFee }]
      .concat(apt.otherCharges ? [{ name: 'Doosre charges', qty: 1, unit: 'visit', price: apt.otherCharges, total: apt.otherCharges }] : []),
    subtotal: apt.consultationFee + apt.otherCharges,
    discount: apt.discount,
    extraRows: apt.taxAmount ? [{ label: 'Tax', value: String(apt.taxAmount) }] : undefined,
    total: apt.total,
    paid,
    paymentLabel: sale ? (sale.creditAmount > 0 ? `Khata Rs ${sale.creditAmount}` : 'Paid') : apt.paymentStatus === 'PAID' ? 'Paid' : 'Fees baqi',
    footerNote: 'Apna number aane par andar tashreef laayein. Agli visit par ye parchi saath laayein.',
  });
}

const page = (s: ReceiptSetup, title: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; font-size: 12.5px; margin: 0; }
  .head { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid ${esc(s.design.accent)}; padding-bottom: 10px; }
  .shop { font-size: 20px; font-weight: 800; color: ${esc(s.design.accent)}; }
  .muted { color: #64748b; }
  .dr { text-align: right; }
  .dr b { font-size: 15px; }
  .pt { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; margin: 12px 0; }
  .pt span { display: block; font-size: 10.5px; color: #64748b; }
  .warn { color: #be123c; font-weight: 700; }
  h3 { font-size: 13px; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: .04em; color: #334155; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { font-size: 10.5px; text-transform: uppercase; color: #64748b; background: #f8fafc; }
  .rx { font-size: 26px; font-weight: 800; color: ${esc(s.design.accent)}; margin-top: 8px; }
  .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; white-space: pre-wrap; }
  .foot { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 36px; }
  .sign { border-top: 1px solid #94a3b8; padding-top: 4px; min-width: 200px; text-align: center; }
  .nafaa { margin-top: 18px; text-align: center; font-size: 9.5px; color: #94a3b8; }
  .abn { color: #be123c; font-weight: 700; }
</style></head><body>${body}<div class="nafaa">${esc(NAFAA.name)} · ${esc(NAFAA.web)} · ${esc(NAFAA.phone)}</div></body></html>`;

function header(s: ReceiptSetup, doctor: DoctorLite | null | undefined) {
  return `<div class="head"><div><div class="shop">${esc(s.shop.name)}</div>
    <div class="muted">${esc([s.shop.address, s.shop.phone].filter(Boolean).join(' · '))}</div></div>
    ${doctor ? `<div class="dr"><b>${esc(drName(doctor))}</b><br><span class="muted">${esc((doctor.qualifications ?? []).join(', '))}</span>
    ${doctor.pmcNumber ? `<br><span class="muted">PMDC ${esc(doctor.pmcNumber)}</span>` : ''}</div>` : ''}</div>`;
}

function patientBox(p: PatientLite | null | undefined, extra: Array<[string, string]> = []) {
  if (!p) return '';
  const cells: Array<[string, string]> = [
    ['Mareez', p.fullName], ['MR No.', p.mrn], ['Umar / Jins', [ageOf(p.dateOfBirth), genderLabel(p.gender)].filter(Boolean).join(' · ') || '—'],
    ['Phone', p.phonePrimary || '—'], ...(p.bloodGroup ? [['Blood group', bloodLabel(p.bloodGroup)] as [string, string]] : []), ...extra,
  ];
  const allergy = p.allergies?.length ? `<div style="grid-column: 1 / -1" class="warn">Allergy: ${esc(p.allergies.join(', '))}</div>` : '';
  return `<div class="pt">${cells.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join('')}${allergy}</div>`;
}

const timing = (it: Prescription['items'][number]) => [it.beforeMeal && 'khane se pehle', it.afterMeal && 'khane ke baad', it.atBedtime && 'sone se pehle', it.emptyStomach && 'khaali pait'].filter(Boolean).join(', ');

/** A4 prescription: diagnosis, medicines with dose and timing, advice and follow-up. */
export async function printPrescription(input: {
  rx: Pick<Prescription, 'prescriptionNumber' | 'issuedAt' | 'items' | 'generalInstructions'>;
  patient: PatientLite | null | undefined;
  doctor: DoctorLite | null | undefined;
  encounter?: { finalDiagnosis?: string | null; provisionalDiagnosis?: string | null; advice?: string | null; followUpDate?: string | null; subjective?: string | null } | null;
  vitals?: Partial<Vitals> | null;
}) {
  const s = await setup();
  const { rx, patient, doctor, encounter, vitals } = input;
  const v = vitals ? [
    vitals.bpSystolic && vitals.bpDiastolic ? `BP ${vitals.bpSystolic}/${vitals.bpDiastolic}` : '', vitals.pulseRate ? `Pulse ${vitals.pulseRate}` : '',
    vitals.temperatureF ? `Temp ${vitals.temperatureF}°F` : '', vitals.weightKg ? `Wazan ${vitals.weightKg} kg` : '', vitals.spo2 ? `SpO2 ${vitals.spo2}%` : '',
  ].filter(Boolean).join(' · ') : '';
  const diagnosis = encounter?.finalDiagnosis || encounter?.provisionalDiagnosis;
  const body = `${header(s, doctor)}
    ${patientBox(patient, [['Nuskha', rx.prescriptionNumber], ['Tareekh', shortDate(rx.issuedAt)]])}
    ${encounter?.subjective ? `<h3>Shikayat</h3><div class="box">${esc(encounter.subjective)}</div>` : ''}
    ${v ? `<h3>Vitals</h3><div>${esc(v)}</div>` : ''}
    ${diagnosis ? `<h3>Diagnosis</h3><div class="box">${esc(diagnosis)}</div>` : ''}
    <div class="rx">℞</div>
    <table><thead><tr><th>#</th><th>Dawai</th><th>Khuraak</th><th>Kitni dafa</th><th>Kitne din</th><th>Hidayat</th></tr></thead><tbody>
    ${rx.items.map((it, i) => `<tr><td>${i + 1}</td><td><b>${esc([it.form, it.drugName, it.strength].filter(Boolean).join(' '))}</b>${it.quantity ? `<br><span class="muted">Miqdar: ${esc(it.quantity)}</span>` : ''}</td>
      <td>${esc(it.dose || '—')}</td><td>${esc(it.frequency || '—')}</td><td>${it.durationDays ? `${it.durationDays} din` : '—'}</td>
      <td>${esc([timing(it), it.instructions].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('')}
    </tbody></table>
    ${rx.generalInstructions || encounter?.advice ? `<h3>Hidayat</h3><div class="box">${esc([rx.generalInstructions, encounter?.advice].filter(Boolean).join('\n'))}</div>` : ''}
    <div class="foot"><div>${encounter?.followUpDate ? `<b>Dobara aayein: ${esc(shortDate(encounter.followUpDate))}</b>` : ''}</div>
    <div class="sign">${esc(drName(doctor) || 'Doctor')}<br><span class="muted">Dastakhat</span></div></div>`;
  printHtml(page(s, `Nuskha ${rx.prescriptionNumber}`, body));
}

/** A4 lab report with results, reference ranges and abnormal marks. */
export async function printLabReport(order: LabOrder, patient: PatientLite | null | undefined, doctor: DoctorLite | null | undefined) {
  const s = await setup();
  const body = `${header(s, null)}
    ${patientBox(patient, [['Lab order', order.orderNumber], ['Sample', order.sampleCollectedAt ? dateTime(order.sampleCollectedAt) : '—'], ['Report', order.reportedAt ? dateTime(order.reportedAt) : '—'], ['Doctor', drName(doctor) || '—']])}
    <h3>Lab report${order.labName ? ` · ${esc(order.labName)}` : ''}</h3>
    <table><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Normal range</th></tr></thead><tbody>
    ${order.tests.map((t) => `<tr><td><b>${esc(t.testName)}</b></td><td class="${t.isAbnormal || t.isCritical ? 'abn' : ''}">${esc(t.result || 'Baqi')}${t.isCritical ? ' (critical)' : t.isAbnormal ? ' (H/L)' : ''}</td>
      <td>${esc(t.unit || '')}</td><td>${esc(t.referenceRange || '')}</td></tr>`).join('')}
    </tbody></table>
    ${order.notes ? `<h3>Note</h3><div class="box">${esc(order.notes)}</div>` : ''}
    <div class="foot"><div class="muted">Ye report doctor ko dikhayein.</div><div class="sign">${esc(order.tests.find((t) => t.performedBy)?.performedBy || 'Lab')}<br><span class="muted">Dastakhat</span></div></div>`;
  printHtml(page(s, `Lab ${order.orderNumber}`, body));
}

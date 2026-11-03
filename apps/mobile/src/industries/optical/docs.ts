/**
 * Optical print documents (web optical lib/print.ts): the customer's
 * prescription, the order slip given with the advance, the eye test report
 * and the lab slip (power and lens, no prices). Built on the shared A4 page.
 */

import { fmtPower, type Power } from '@nafaa/core/industries/optical';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import type { PrintDoc } from '@/modules/purchasing/lib/docs';
import type { OpticalEyeTest, OpticalLensOrder, OpticalPrescription } from './api';
import { dayOnly, rxTypeLabel } from './meta';

const powerTable = (p: Power): PrintDoc['tables'][number] => {
  const c = (v?: number | null, axis?: boolean) => (v == null ? '—' : axis ? `${v}` : fmtPower(v, t('Plano')));
  return {
    columns: [{ label: t('Aankh') }, { label: 'SPH', end: true }, { label: 'CYL', end: true }, { label: 'AXIS', end: true }, { label: 'ADD', end: true }],
    rows: [
      [t('R (Dayan)'), c(p.rightSph), c(p.rightCyl), c(p.rightAxis, true), c(p.rightAdd)],
      [t('L (Bayan)'), c(p.leftSph), c(p.leftCyl), c(p.leftAxis, true), c(p.leftAdd)],
    ],
    footer: p.pupilDistance != null ? ['PD', `${p.pupilDistance} mm`, '', '', ''] : undefined,
  };
};

const facts = (pairs: Array<[string, string | number | null | undefined]>): PrintDoc['tables'][number] => ({
  columns: [{ label: '' }, { label: '' }],
  rows: pairs.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
});

export function rxDoc(rx: OpticalPrescription): PrintDoc {
  const extra: Array<[string, string]> = [];
  if (rx.rightVa || rx.leftVa) extra.push([t('Nazar R / L'), [rx.rightVa, rx.leftVa].filter(Boolean).join(' / ')]);
  if (rx.clRightBaseCurve || rx.clLeftBaseCurve) {
    extra.push([t('R BC / DIA'), [rx.clRightBaseCurve, rx.clRightDiameter].filter(Boolean).join(' / ')], [t('L BC / DIA'), [rx.clLeftBaseCurve, rx.clLeftDiameter].filter(Boolean).join(' / ')]);
  }
  return {
    title: t('Nuskha (Prescription)'), subtitle: rx.prescriptionNumber,
    meta: [[t('Date'), dayOnly(rx.prescriptionDate)], [t('Muddat'), dayOnly(rx.expiryDate)]],
    tables: [
      facts([[t('Customer'), rx.customerName], [t('Mobile'), rx.customerPhone], [t('Umar'), rx.customerAge], [t('Type'), rxTypeLabel(rx.prescriptionType)], [t('Doctor'), rx.doctorName ?? rx.prescribedBy], [t('Clinic'), rx.clinicName]]),
      powerTable(rx),
      ...(extra.length ? [facts(extra)] : []),
    ],
    note: [rx.notes, t('Saal me ek dafa aankh zaroor check karwayein.')].filter(Boolean).join('\n'),
  };
}

export function testDoc(x: OpticalEyeTest): PrintDoc {
  return {
    title: t('Eye test report'), subtitle: x.testNumber, meta: [[t('Date'), dayOnly(x.testCompletedAt ?? x.appointmentDate)]],
    tables: [
      facts([[t('Customer'), x.customerName], [t('Mobile'), x.customerPhone], [t('Umar'), x.customerAge], [t('Optometrist'), x.optometristName], [t('Shikayat'), x.chiefComplaint]]),
      powerTable(x),
      facts([
        [t('Nazar R / L'), [x.rightVa, x.leftVa].filter(Boolean).join(' / ')], [t('Aankh ka pressure'), x.intraocularPressure], [t('Rang ki pehchan'), x.colorVisionTest],
        [t('Tashkhees'), x.diagnosis], [t('Mashwara'), x.recommendation], [t('Dobara aayein'), x.requiresFollowUp ? dayOnly(x.followUpDate) : null],
      ]),
    ],
  };
}

/** Customer's copy of a glasses or repair order: what was ordered, money and pickup date. */
export function orderDoc(o: OpticalLensOrder, repair: boolean): PrintDoc {
  const lens = [o.lensType, o.lensIndex, o.lensMaterial].filter(Boolean).join(' · ');
  return {
    title: repair ? t('Repair parchi') : t('Chashma order'), subtitle: o.orderNumber,
    meta: [[t('Order'), dayOnly(o.orderedAt)], [t('Tayyar hoga'), dayOnly(o.expectedDate)]],
    tables: [
      facts([[t('Customer'), o.customerName], [t('Mobile'), o.customerPhone], [t('Frame'), o.frameName], ...(repair ? [] : [[t('Lens'), lens], [t('Coating'), o.lensCoatings.join(', ')]] as Array<[string, string]>)]),
      ...(repair ? [] : [powerTable(o)]),
    ],
    totals: [
      ...(o.framePrice ? [[t('Frame'), formatPKR(o.framePrice)] as [string, string]] : []),
      ...(o.lensPrice ? [[repair ? t('Repair') : t('Lens'), formatPKR(o.lensPrice)] as [string, string]] : []),
      ...(o.fittingCharge ? [[t('Fitting'), formatPKR(o.fittingCharge)] as [string, string]] : []),
      [t('Kul'), formatPKR(o.totalPrice), true],
      [t('Advance / mila'), formatPKR(o.paidAmount)],
      [t('Baqi'), formatPKR(o.remainingAmount), true],
    ],
    note: t('Chashma lene aate waqt ye parchi saath layein.'),
  };
}

/** Slip that goes to the lab with the frame: power and lens only, no prices. */
export function labDoc(o: OpticalLensOrder): PrintDoc {
  return {
    title: t('Lab order'), subtitle: o.orderNumber, meta: [[t('Date'), dayOnly(o.orderedAt)], [t('Chahiye'), dayOnly(o.expectedDate)]],
    tables: [
      facts([[t('Lab'), o.labName], [t('Lab ref'), o.labOrderRef], [t('Frame'), o.frameName], [t('Lens'), o.lensType], [t('Index'), o.lensIndex], [t('Material'), o.lensMaterial], [t('Coating'), o.lensCoatings.join(', ')]]),
      powerTable(o),
    ],
    note: o.notes ? o.notes.split('\n').filter((l) => !/^(Booking|Bill) /.test(l)).join('\n') : undefined,
  };
}

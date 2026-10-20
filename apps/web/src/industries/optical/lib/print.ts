/**
 * Optical print documents: the customer's nuskha (prescription), the order
 * slip given with the advance, and the lab slip (power and lens, no prices).
 */

import { formatPKR } from '@core/lib/format';
import type { PrintDoc, PrintSection } from '@core/print';
import type { OpticalEyeTest } from '../api/eye-tests.api';
import type { OpticalLensOrder } from '../api/lens-orders.api';
import type { OpticalPrescription } from '../api/prescriptions.api';
import { dayOnly, fmtPower, rxTypeLabel, type Power } from './meta';

const POWER_COLS = [{ label: 'Aankh' }, { label: 'SPH', align: 'right' as const }, { label: 'CYL', align: 'right' as const }, { label: 'AXIS', align: 'right' as const }, { label: 'ADD', align: 'right' as const }];

function powerSection(p: Power, title = 'Number (power)'): PrintSection {
  const c = (v?: number | null, axis?: boolean) => (v == null ? '—' : axis ? `${v}` : fmtPower(v));
  return {
    kind: 'table', title, columns: POWER_COLS,
    rows: [
      ['R (Dayan)', c(p.rightSph), c(p.rightCyl), c(p.rightAxis, true), c(p.rightAdd)],
      ['L (Bayan)', c(p.leftSph), c(p.leftCyl), c(p.leftAxis, true), c(p.leftAdd)],
    ],
    footer: p.pupilDistance != null ? ['PD', `${p.pupilDistance} mm`, '', '', ''] : undefined,
  };
}

const rows = (pairs: Array<[string, string | number | null | undefined]>) =>
  pairs.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([label, value]) => ({ label, value: String(value) }));

export function rxDoc(rx: OpticalPrescription): PrintDoc {
  return {
    title: 'Nuskha (Prescription)',
    subtitle: rx.prescriptionNumber,
    meta: [['Date', dayOnly(rx.prescriptionDate)], ['Muddat', dayOnly(rx.expiryDate)]],
    sections: [
      { kind: 'rows', rows: rows([['Customer', rx.customerName], ['Mobile', rx.customerPhone], ['Umar', rx.customerAge], ['Type', rxTypeLabel(rx.prescriptionType)], ['Doctor', rx.doctorName ?? rx.prescribedBy], ['Clinic', rx.clinicName]]) },
      powerSection(rx),
      ...(rx.rightVa || rx.leftVa ? [{ kind: 'rows' as const, title: 'Nazar (VA)', rows: rows([['R', rx.rightVa], ['L', rx.leftVa]]) }] : []),
      ...(rx.clRightBaseCurve || rx.clLeftBaseCurve ? [{ kind: 'rows' as const, title: 'Contact lens', rows: rows([['R BC / DIA', [rx.clRightBaseCurve, rx.clRightDiameter].filter(Boolean).join(' / ')], ['L BC / DIA', [rx.clLeftBaseCurve, rx.clLeftDiameter].filter(Boolean).join(' / ')]]) }] : []),
      ...(rx.notes ? [{ kind: 'text' as const, title: 'Note', text: rx.notes }] : []),
    ],
    footer: 'Saal me ek dafa aankh zaroor check karwayein.',
  };
}

export function testDoc(t: OpticalEyeTest): PrintDoc {
  return {
    title: 'Eye test report',
    subtitle: t.testNumber,
    meta: [['Date', dayOnly(t.testCompletedAt ?? t.appointmentDate)]],
    sections: [
      { kind: 'rows', rows: rows([['Customer', t.customerName], ['Mobile', t.customerPhone], ['Umar', t.customerAge], ['Optometrist', t.optometristName], ['Shikayat', t.chiefComplaint]]) },
      powerSection(t),
      { kind: 'rows', title: 'Check', rows: rows([['Nazar R / L', [t.rightVa, t.leftVa].filter(Boolean).join(' / ')], ['Aankh ka pressure', t.intraocularPressure], ['Rang ki pehchan', t.colorVisionTest], ['Tashkhees', t.diagnosis], ['Mashwara', t.recommendation], ['Dobara aayein', t.requiresFollowUp ? dayOnly(t.followUpDate) : null]]) },
    ],
  };
}

/** Customer's copy of a glasses or repair order: what was ordered, money and pickup date. */
export function orderDoc(o: OpticalLensOrder, repair: boolean): PrintDoc {
  return {
    title: repair ? 'Repair parchi' : 'Chashma order',
    subtitle: o.orderNumber,
    meta: [['Order', dayOnly(o.orderedAt)], ['Tayyar hoga', dayOnly(o.expectedDate)]],
    sections: [
      { kind: 'rows', rows: rows([['Customer', o.customerName], ['Mobile', o.customerPhone], ['Frame', o.frameName], ...(repair ? [] : [['Lens', [o.lensType, o.lensIndex, o.lensMaterial].filter(Boolean).join(' · ')], ['Coating', o.lensCoatings.join(', ')]] as Array<[string, string]>)]) },
      ...(repair ? [] : [powerSection(o)]),
      {
        kind: 'rows', title: 'Hisaab',
        rows: [
          ...rows([['Frame', o.framePrice ? formatPKR(o.framePrice) : null], [repair ? 'Repair' : 'Lens', o.lensPrice ? formatPKR(o.lensPrice) : null], ['Fitting', o.fittingCharge ? formatPKR(o.fittingCharge) : null]]),
          { label: 'Kul', value: formatPKR(o.totalPrice), strong: true },
          { label: 'Advance / mila', value: formatPKR(o.paidAmount) },
          { label: 'Baqi', value: formatPKR(o.remainingAmount), strong: true },
        ],
      },
    ],
    footer: 'Chashma lene aate waqt ye parchi saath layein.',
  };
}

/** Slip that goes to the lab with the frame: power and lens only, no prices. */
export function labDoc(o: OpticalLensOrder): PrintDoc {
  return {
    title: 'Lab order',
    subtitle: o.orderNumber,
    meta: [['Date', dayOnly(o.orderedAt)], ['Chahiye', dayOnly(o.expectedDate)]],
    sections: [
      { kind: 'rows', rows: rows([['Lab', o.labName], ['Lab ref', o.labOrderRef], ['Frame', o.frameName], ['Lens', o.lensType], ['Index', o.lensIndex], ['Material', o.lensMaterial], ['Coating', o.lensCoatings.join(', ')]]) },
      powerSection(o),
      ...(o.notes ? [{ kind: 'text' as const, title: 'Note', text: o.notes.split('\n').filter((l) => !/^(Booking|Bill) /.test(l)).join('\n') }] : []),
    ],
  };
}

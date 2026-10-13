/**
 * Recomputes a run line after the user's changes, with the same rules as the
 * server (payroll.helper.ts), so the sheet shows the net pay before saving.
 * The server works it out again when the salary is saved.
 */

import type { PayPreview, RunEdit, RunRow } from '../api/payroll.api';

const sum = (l?: Array<{ amount: number }>) => (l ?? []).reduce((a, x) => a + (Number(x.amount) || 0), 0);

export function applyEdit(row: RunRow, edit: RunEdit | undefined): PayPreview {
  const p = row.preview;
  if (!edit) return p;
  const variable = p.unitKind === 'days' || p.unitKind === 'hours' || p.unitKind === 'tasks';
  const units = variable && edit.units != null ? edit.units : p.units;
  const basePay = variable ? Math.round(p.rate * units) : p.basePay;
  const absentCut = edit.skipAbsentCut ? 0 : Math.min(basePay, p.absentCut);
  const overtimePay = Math.round(edit.overtimePay ?? p.overtimePay);
  const commission = edit.includeCommission === false ? 0 : p.commission;
  const bonuses = Math.round(sum(edit.adds));
  const otherCuts = Math.round(sum(edit.cuts));
  const gross = basePay + overtimePay + commission + bonuses;
  const deductions = absentCut + otherCuts + p.advance;
  return {
    ...p, units, basePay, absentCut, overtimePay, commission, bonuses, otherCuts, gross, deductions,
    net: Math.max(0, gross - deductions),
    advanceTooBig: p.advance > 0 && p.advance > gross - absentCut - otherCuts,
  };
}

/** Amount paid now for a line: the typed amount, capped at the net pay. */
export const payNow = (net: number, edit?: RunEdit) => Math.min(Math.round(edit?.payAmount ?? net), net);

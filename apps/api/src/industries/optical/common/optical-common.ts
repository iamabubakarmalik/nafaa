/**
 * Pieces every optical desk shares: running numbers per year (business
 * time), eye power checks, and paging arguments.
 */

import { BadRequestException } from '@nestjs/common';
import { tzParts } from '../../../common/helpers/business-time.helper';
import { apiMessage, apiText, joinMessages, MessageText } from '../../../common/i18n/api-message';

export const r2 = (v: number) => Math.round(v * 100) / 100;

/** Next free number like `RX-2026-00012`; `exists` checks one candidate. */
export async function nextNumber(prefix: string, count: number, exists: (n: string) => Promise<boolean>) {
  const year = tzParts(new Date()).year;
  for (let seq = count + 1; ; seq++) {
    const n = `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
    if (!(await exists(n))) return n;
  }
}

export interface EyePower {
  rightSph?: number | null; rightCyl?: number | null; rightAxis?: number | null; rightAdd?: number | null;
  leftSph?: number | null; leftCyl?: number | null; leftAxis?: number | null; leftAdd?: number | null;
  pupilDistance?: number | null;
}

const quarter = (v: number) => Math.abs(v * 4 - Math.round(v * 4)) < 1e-6;

/**
 * Checks eye power the way a lab reads it: SPH -30..+30 and CYL -10..+10 in
 * 0.25 steps, AXIS 0-180 (needed when CYL is set), ADD +0.50..+4.00, PD 40-80 mm.
 */
export function checkEyePower(p: EyePower) {
  const errors: MessageText[] = [];
  for (const [side, label] of [['right', apiText('Right (R)')], ['left', apiText('Left (L)')]] as const) {
    const sph = p[`${side}Sph`];
    const cyl = p[`${side}Cyl`];
    const axis = p[`${side}Axis`];
    const add = p[`${side}Add`];
    if (sph != null && (sph < -30 || sph > 30 || !quarter(sph))) errors.push(apiMessage('{{label}} SPH -30 se +30 ke beech, 0.25 ke qadam me', { label }));
    if (cyl != null && (cyl < -10 || cyl > 10 || !quarter(cyl))) errors.push(apiMessage('{{label}} CYL -10 se +10 ke beech, 0.25 ke qadam me', { label }));
    if (axis != null && (!Number.isInteger(axis) || axis < 0 || axis > 180)) errors.push(apiMessage('{{label}} AXIS 0 se 180 ke beech', { label }));
    if (cyl != null && cyl !== 0 && axis == null) errors.push(apiMessage('{{label}} CYL ke saath AXIS zaroori hai', { label }));
    if (add != null && add !== 0 && (add < 0.5 || add > 4 || !quarter(add))) errors.push(apiMessage('{{label}} ADD +0.50 se +4.00 ke beech', { label }));
  }
  if (p.pupilDistance != null && (p.pupilDistance < 40 || p.pupilDistance > 80)) errors.push(apiText('PD 40 se 80 mm ke beech'));
  if (errors.length) throw new BadRequestException(errors.length === 1 ? errors[0] : joinMessages(errors));
}

export interface PageArgs { page?: string | number; limit?: string | number }

export function pageArgs(q: PageArgs, max = 100) {
  const page = Math.max(1, Math.floor(Number(q.page) || 1));
  const limit = Math.min(max, Math.max(1, Math.floor(Number(q.limit) || 30)));
  return { page, limit, skip: (page - 1) * limit };
}

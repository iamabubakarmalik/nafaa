import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turns `from` / `to` query values into a createdAt-style range.
 * Plain day keys (YYYY-MM-DD) are read as whole Pakistan days; full ISO
 * timestamps keep working as before.
 */
export function dayRange(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  const out: { gte?: Date; lte?: Date } = {};
  if (from) {
    out.gte = DAY_KEY.test(from) ? startOfDayTz(new Date(`${from}T12:00:00+05:00`)) : new Date(from);
  }
  if (to) {
    out.lte = DAY_KEY.test(to) ? endOfDayTz(new Date(`${to}T12:00:00+05:00`)) : new Date(to);
  }
  return out.gte || out.lte ? out : undefined;
}

/** Start of the `from` day (Pakistan time), or `fallback` when missing. */
export function rangeStart(from: string | undefined, fallback: Date): Date {
  return dayRange(from, undefined)?.gte ?? fallback;
}

/** End of the `to` day (Pakistan time), or now when missing. */
export function rangeEnd(to: string | undefined): Date {
  return dayRange(undefined, to)?.lte ?? new Date();
}

/** Small parsing helpers shared by the admin Market services. */
import { BadRequestException } from '@nestjs/common';

export const DAY_MS = 86_400_000;

const n = (v: unknown) => Number(v ?? 0) || 0;
export const num = n;
export const round = (v: number) => Math.round(v * 100) / 100;
export const page = (v: unknown) => Math.max(1, Math.floor(n(v) || 1));
export const lim = (v: unknown, d = 25) => Math.max(1, Math.min(100, Math.floor(n(v) || d)));
export const text = (v: unknown, max = 80) => String(v ?? '').trim().slice(0, max);
export const pages = (total: number, limit: number) => Math.max(1, Math.ceil(total / limit));

/** YYYY-MM-DD dates are Pakistan calendar days. */
const pktDay = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00+05:00`);

/** [start, end) for a from/to pair of Pakistan days; `to` is inclusive. Defaults to the last 30 days. */
export function dayRange(from?: string, to?: string, defaultDays = 30) {
  const end = to && !Number.isNaN(pktDay(to)) ? new Date(pktDay(to) + DAY_MS) : new Date();
  const start = from && !Number.isNaN(pktDay(from)) ? new Date(pktDay(from)) : new Date(end.getTime() - defaultDays * DAY_MS);
  if (end.getTime() <= start.getTime()) throw new BadRequestException('The end date must be after the start date');
  if (end.getTime() - start.getTime() > 400 * DAY_MS) throw new BadRequestException('Range is limited to 400 days');
  return { start, end };
}

/** Optional range: only when at least one side is given. */
export function optionalRange(from?: string, to?: string) {
  if (!from && !to) return null;
  const end = to && !Number.isNaN(pktDay(to)) ? new Date(pktDay(to) + DAY_MS) : undefined;
  const start = from && !Number.isNaN(pktDay(from)) ? new Date(pktDay(from)) : undefined;
  return { ...(start && { gte: start }), ...(end && { lt: end }) };
}

/** Orders waiting too long: PENDING over 15 minutes, or never sent to the shop after 2 minutes. */
export const STUCK_PENDING_MS = 15 * 60_000;
export const STUCK_INTAKE_MS = 2 * 60_000;

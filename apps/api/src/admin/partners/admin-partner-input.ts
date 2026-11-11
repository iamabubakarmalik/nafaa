/**
 * Input checks for the admin partner endpoints. Bodies arrive as plain
 * objects (no class DTOs), so every field is read and checked here.
 */

import { BadRequestException } from '@nestjs/common';

export const PAYOUT_METHODS = ['JAZZCASH', 'EASYPAISA', 'BANK'];

export const text = (v: unknown, max = 200): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Optional text: undefined when the field was not sent, null when sent empty. */
export const optText = (v: unknown, max = 200): string | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return text(v, max) || null;
};

export function number(v: unknown, field: string, opts: { min?: number; max?: number; int?: boolean } = {}): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isFinite(n)) throw new BadRequestException(`${field} must be a number`);
  if (opts.int && !Number.isInteger(n)) throw new BadRequestException(`${field} must be a whole number`);
  if (opts.min !== undefined && n < opts.min) throw new BadRequestException(`${field} cannot be less than ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw new BadRequestException(`${field} cannot be more than ${opts.max}`);
  return n;
}

export function bool(v: unknown, field: string): boolean {
  if (typeof v !== 'boolean') throw new BadRequestException(`${field} must be true or false`);
  return v;
}

export function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string): T {
  const s = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (!allowed.includes(s as T)) throw new BadRequestException(`${field} must be one of: ${allowed.join(', ')}`);
  return s as T;
}

/** Page and limit from the query string (limit 1–100, default 25). */
export function paging(q: { page?: string; limit?: string }) {
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
  const page = Math.max(1, Number(q.page) || 1);
  return { page, limit, skip: (page - 1) * limit };
}

export const meta = (page: number, limit: number, total: number) => ({ page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });

/** "2026-11-05" (a Pakistan day) → its UTC start. Null when the key is not a valid date. */
export function pkDayStart(key: string | undefined): Date | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) - 5 * 3_600_000;
  return Number.isNaN(t) ? null : new Date(t);
}

/** UTC range for Pakistan day keys: [start of `from`, start of the day after `to`). */
export function pkDayRange(from?: string, to?: string): { gte?: Date; lt?: Date } | undefined {
  const start = pkDayStart(from);
  const endDay = pkDayStart(to);
  if (!start && !endDay) return undefined;
  return { ...(start ? { gte: start } : {}), ...(endDay ? { lt: new Date(endDay.getTime() + 86_400_000) } : {}) };
}

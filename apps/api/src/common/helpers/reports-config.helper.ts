/**
 * Report settings (Settings → Reports), stored in `TenantSettings.reportsConfig`.
 *
 *   fiscalYearStartMonth  first month of the shop's financial year (1–12)
 *   defaultPeriod         period a report opens with; 'auto' keeps each page's own
 *   compareDefault        comparison a report opens with: previous period, last year or off
 *   roundOff              money shown to the paisa or to the whole rupee
 *   staffFigures          money figures staff (not the owner) may see in reports;
 *                         a display rule on top of their permissions, never a grant
 *   summary               daily summary channels, recipients and included lines
 *
 * A missing or partial value falls back to the defaults below, which match how
 * reports behaved before the setting existed.
 */

import { PrismaService } from '../../prisma/prisma.service';

export const REPORT_FIGURES = ['profit', 'drawer'] as const;
export const REPORT_PERIODS = ['auto', 'today', 'yesterday', 'week', 'month', 'thisMonth', 'lastMonth', 'fiscalYear'] as const;
export const COMPARE_DEFAULTS = ['prev', 'year', 'off'] as const;
export const ROUND_OFF = ['paisa', 'rupee'] as const;
export const SUMMARY_CHANNELS = ['app', 'email', 'whatsapp'] as const;
export const SUMMARY_PARTS = [
  'returns', 'voids', 'discount', 'payments', 'drawer', 'profit', 'expenses', 'khata', 'lowStock', 'topItems', 'topStaff', 'branches', 'trend',
] as const;

export type ReportFigure = (typeof REPORT_FIGURES)[number];
export type SummaryChannel = (typeof SUMMARY_CHANNELS)[number];
export type SummaryPart = (typeof SUMMARY_PARTS)[number];

export interface ReportsConfig {
  fiscalYearStartMonth: number;
  defaultPeriod: (typeof REPORT_PERIODS)[number];
  compareDefault: (typeof COMPARE_DEFAULTS)[number];
  roundOff: (typeof ROUND_OFF)[number];
  staffFigures: ReportFigure[];
  summary: {
    channels: SummaryChannel[];
    /** null = the owner and everyone with `reports.view`. */
    recipientIds: string[] | null;
    include: SummaryPart[];
  };
}

export const REPORTS_DEFAULTS: ReportsConfig = {
  fiscalYearStartMonth: 7,
  defaultPeriod: 'auto',
  compareDefault: 'prev',
  roundOff: 'paisa',
  staffFigures: [...REPORT_FIGURES],
  summary: { channels: ['app', 'email'], recipientIds: null, include: [...SUMMARY_PARTS] },
};

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const subset = <T extends string>(list: readonly T[], v: unknown, fallback: T[]): T[] =>
  Array.isArray(v) ? list.filter((x) => v.includes(x)) : fallback;

/** Stored JSON → a complete config; unknown keys and values are dropped. */
export function normalizeReportsConfig(raw: unknown): ReportsConfig {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const s = (r.summary && typeof r.summary === 'object' ? r.summary : {}) as Record<string, any>;
  const month = Number(r.fiscalYearStartMonth);
  const d = REPORTS_DEFAULTS;
  return {
    fiscalYearStartMonth: Number.isInteger(month) && month >= 1 && month <= 12 ? month : d.fiscalYearStartMonth,
    defaultPeriod: pick(REPORT_PERIODS, r.defaultPeriod, d.defaultPeriod),
    compareDefault: pick(COMPARE_DEFAULTS, r.compareDefault, d.compareDefault),
    roundOff: pick(ROUND_OFF, r.roundOff, d.roundOff),
    staffFigures: subset(REPORT_FIGURES, r.staffFigures, d.staffFigures),
    summary: {
      // The in-app notification always goes out.
      channels: ['app', ...subset(SUMMARY_CHANNELS, s.channels, d.summary.channels).filter((c) => c !== 'app')],
      recipientIds: Array.isArray(s.recipientIds) ? s.recipientIds.filter((x: unknown): x is string => typeof x === 'string') : null,
      include: subset(SUMMARY_PARTS, s.include, d.summary.include),
    },
  };
}

/** Config is read on every report request; a short cache keeps that to one query per tenant. */
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { at: number; config: ReportsConfig }>();

export async function readReportsConfig(prisma: PrismaService, tenantId: string): Promise<ReportsConfig> {
  const hit = cache.get(tenantId);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.config;
  const row = await prisma.tenantSettings.findUnique({ where: { tenantId }, select: { reportsConfig: true } });
  const config = normalizeReportsConfig(row?.reportsConfig);
  cache.set(tenantId, { at: Date.now(), config });
  return config;
}

/** Drops the cached copy after a save on this server. */
export function forgetReportsConfig(tenantId: string): void {
  cache.delete(tenantId);
}

export const isOwnerRole = (role?: string | null) => role === 'OWNER' || role === 'SUPER_ADMIN';

/** Figures hidden from this user in reports: none for the owner, else the ones not allowed for staff. */
export function hiddenFiguresFor(role: string | null | undefined, config: ReportsConfig): ReportFigure[] {
  if (isOwnerRole(role)) return [];
  return REPORT_FIGURES.filter((f) => !config.staffFigures.includes(f));
}

export async function hiddenFigures(prisma: PrismaService, user: { tenantId: string; role?: string | null }): Promise<ReportFigure[]> {
  if (isOwnerRole(user.role)) return [];
  return hiddenFiguresFor(user.role, await readReportsConfig(prisma, user.tenantId));
}

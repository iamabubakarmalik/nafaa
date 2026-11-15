import {
  DEFAULT_PREFS,
  alertPlan,
  allowedCategories,
  categoryForType,
  inQuietHours,
  normalizePrefs,
  pktDayKey,
  planDedupe,
  priorityToSeverity,
  severityToPriority,
} from './admin-notify.logic';
import { AdminNotificationsService } from './admin-notifications.service';

/** 2026-11-15 at hh:mm Pakistan time (UTC+5). */
const pkt = (hh: number, mm = 0) => new Date(Date.UTC(2026, 10, 15, hh - 5, mm));

describe('admin notify: dedupe plan', () => {
  const now = new Date('2026-11-15T10:00:00Z');

  it('creates when nothing matches the key', () => {
    expect(planDedupe(null, now)).toEqual({ action: 'create' });
  });

  it('bumps inside the window, counted from the first occurrence', () => {
    const latest = { id: 'a', createdAt: new Date(now.getTime() - 29 * 60_000) };
    expect(planDedupe(latest, now)).toEqual({ action: 'bump', id: 'a' });
    expect(planDedupe(latest, now, { windowMinutes: 10 })).toEqual({ action: 'create' });
  });

  it('creates a new row once the window has passed', () => {
    const latest = { id: 'a', createdAt: new Date(now.getTime() - 31 * 60_000) };
    expect(planDedupe(latest, now)).toEqual({ action: 'create' });
  });

  it('"once" never sends twice, however old the first one is', () => {
    const latest = { id: 'a', createdAt: new Date(now.getTime() - 400 * 86_400_000) };
    expect(planDedupe(latest, now, { once: true })).toEqual({ action: 'skip' });
    expect(planDedupe(null, now, { once: true })).toEqual({ action: 'create' });
  });
});

describe('admin notify: preferences', () => {
  it('fills defaults and drops junk', () => {
    const p = normalizePrefs({ sound: false, categories: { social: false, nope: true }, quietHours: { enabled: true, start: '25:00', end: '07:30' }, extra: 1 });
    expect(p.sound).toBe(false);
    expect(p.toast).toBe(true);
    expect(p.categories.social).toBe(false);
    expect(p.categories.billing).toBe(true);
    expect((p.categories as Record<string, boolean>).nope).toBeUndefined();
    expect(p.quietHours).toEqual({ enabled: true, start: DEFAULT_PREFS.quietHours.start, end: '07:30' });
    expect((p as unknown as Record<string, unknown>).extra).toBeUndefined();
    expect(normalizePrefs('garbage')).toEqual(DEFAULT_PREFS);
  });

  it('quiet hours use Pakistan time and may cross midnight', () => {
    const q = { enabled: true, start: '22:00', end: '08:00' };
    expect(inQuietHours(q, pkt(23))).toBe(true);
    expect(inQuietHours(q, pkt(7, 59))).toBe(true);
    expect(inQuietHours(q, pkt(8))).toBe(false);
    expect(inQuietHours(q, pkt(14))).toBe(false);
    expect(inQuietHours({ enabled: true, start: '13:00', end: '15:00' }, pkt(14))).toBe(true);
    expect(inQuietHours({ ...q, enabled: false }, pkt(23))).toBe(false);
  });

  it('alert plan: category off = nothing; quiet hours mute sound and desktop but not critical', () => {
    const prefs = normalizePrefs({ categories: { marketing: false }, quietHours: { enabled: true, start: '22:00', end: '08:00' } });
    expect(alertPlan(prefs, 'marketing', 'critical', pkt(12))).toEqual({ toast: false, sound: false, desktop: false });
    expect(alertPlan(prefs, 'billing', 'info', pkt(12))).toEqual({ toast: true, sound: true, desktop: true });
    expect(alertPlan(prefs, 'billing', 'info', pkt(23))).toEqual({ toast: true, sound: false, desktop: false });
    expect(alertPlan(prefs, 'system', 'critical', pkt(23))).toEqual({ toast: true, sound: true, desktop: true });
    const strict = normalizePrefs({ ...prefs, criticalInQuiet: false });
    expect(alertPlan(strict, 'system', 'critical', pkt(23))).toEqual({ toast: true, sound: false, desktop: false });
  });

  it('day key is the Pakistan date', () => {
    expect(pktDayKey(new Date('2026-11-15T19:30:00Z'))).toBe('2026-11-16');
    expect(pktDayKey(new Date('2026-11-15T18:59:00Z'))).toBe('2026-11-15');
  });
});

describe('admin notify: access and mapping', () => {
  it('super admins see every category; staff only what their role allows', () => {
    expect(allowedCategories({ isSuperAdmin: true, permissions: [] })).toContain('system');
    const finance = allowedCategories({ isSuperAdmin: false, permissions: ['billing.view', 'notifications.view'] });
    expect(finance).toEqual(['billing', 'general']);
    expect(allowedCategories(null)).toEqual([]);
  });

  it('maps severity and older rows', () => {
    expect(severityToPriority('critical')).toBe('URGENT');
    expect(priorityToSeverity('HIGH')).toBe('warning');
    expect(priorityToSeverity('LOW')).toBe('info');
    expect(categoryForType('NEW_TENANT')).toBe('shops');
    expect(categoryForType('USER_ACTION', '/setups')).toBe('billing');
    expect(categoryForType('INFO', '/social/handoff')).toBe('social');
    expect(categoryForType('INFO')).toBe('general');
  });
});

describe('AdminNotificationsService.notify dedupe', () => {
  const make = () => {
    const rows: any[] = [];
    const prisma: any = {
      adminNotification: {
        findFirst: jest.fn(async ({ where }: any) => [...rows].reverse().find((r) => r.dedupeKey === where.dedupeKey) ?? null),
        create: jest.fn(async ({ data }: any) => { const r = { id: `n${rows.length + 1}`, createdAt: new Date(), occurrences: 1, ...data }; rows.push(r); return r; }),
        update: jest.fn(async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id); r.occurrences += data.occurrences.increment; if (data.lastAt) Object.assign(r, { lastAt: data.lastAt, isRead: data.isRead }); return r; }),
      },
    };
    const service = new AdminNotificationsService(prisma);
    return { service, prisma, rows };
  };
  const event = { category: 'system' as const, event: 'system.job_failed', title: 'Job failed', message: 'x', dedupeKey: 'job-failed:A' };

  it('a burst of the same event gives one row with a count', async () => {
    const { service, rows } = make();
    await Promise.all([service.notify(event), service.notify(event), service.notify(event)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].occurrences).toBe(3);
    service.onModuleDestroy();
  });

  it('quiet repeats raise the count without making it unread again', async () => {
    const { service, rows } = make();
    await service.notify({ ...event, quietRepeat: true });
    rows[0].isRead = true;
    await service.notify({ ...event, quietRepeat: true });
    expect(rows[0]).toMatchObject({ occurrences: 2, isRead: true });
    service.onModuleDestroy();
  });

  it('once-keys are skipped after the first, and failures never throw', async () => {
    const { service, rows, prisma } = make();
    await service.notify({ ...event, once: true });
    await service.notify({ ...event, once: true });
    expect(rows).toHaveLength(1);
    prisma.adminNotification.findFirst.mockRejectedValueOnce(new Error('db down'));
    await expect(service.notify(event)).resolves.toBeNull();
    service.onModuleDestroy();
  });
});

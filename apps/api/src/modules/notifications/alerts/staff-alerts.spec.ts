import { pushText } from './alert-catalog';
import {
  deviceHasTones, digestWindow, eventSwitch, inQuietHours, inScope, normalizePrefs, prefsView, pushSound, sanitizePrefsInput,
  type AlertPerson,
} from './alert-rules';
import { StaffAlertsService } from './staff-alerts.service';
import { PushDeliveryService } from '../../push/push-delivery.service';
import { eventForNotification } from '../notifications.service';

const owner: AlertPerson = { id: 'o', role: 'OWNER', permissions: [], shopId: null };
const manager: AlertPerson = { id: 'm', role: 'MANAGER', permissions: ['sales.view', 'expenses.view', 'returns.view'], shopId: 's1' };
const cashier: AlertPerson = { id: 'c', role: 'CASHIER', permissions: ['sales.view', 'online_orders.view'], shopId: 's1' };

describe('alert rules: who gets what', () => {
  it('gives owners and managers the important events by default and keeps sale pushes off', () => {
    const p = normalizePrefs(null);
    expect(eventSwitch('expense', owner, p)).toEqual({ inApp: true, push: true });
    expect(eventSwitch('expense', manager, p)).toEqual({ inApp: true, push: true });
    expect(eventSwitch('sale', owner, p)).toEqual({ inApp: true, push: false });
    expect(eventSwitch('purchase', owner, p)).toEqual({ inApp: true, push: false });
  });

  it('needs the permission: a cashier gets nothing for expenses, a manager without khata.view gets no khata alerts', () => {
    const p = normalizePrefs(null);
    expect(eventSwitch('expense', cashier, p)).toEqual({ inApp: false, push: false });
    expect(eventSwitch('khataPayment', manager, p)).toEqual({ inApp: false, push: false });
    // Staff with the permission see online orders in the app, without a push.
    expect(eventSwitch('onlineOrder', cashier, p)).toEqual({ inApp: true, push: false });
  });

  it('applies the person\'s own choices over the defaults, but never past the permission', () => {
    const p = normalizePrefs({ events: { sale: { push: true }, expense: { inApp: false, push: false } } });
    expect(eventSwitch('sale', owner, p)).toEqual({ inApp: true, push: true });
    expect(eventSwitch('expense', owner, p)).toEqual({ inApp: false, push: false });
    const wants = normalizePrefs({ events: { expense: { inApp: true, push: true } } });
    expect(eventSwitch('expense', cashier, wants)).toEqual({ inApp: false, push: false });
  });

  it('keeps account messages for the owner only', () => {
    const p = normalizePrefs(null);
    expect(eventSwitch('account', owner, p).push).toBe(true);
    expect(eventSwitch('account', manager, p)).toEqual({ inApp: false, push: false });
  });

  it('lists only events the person may receive on the settings screen', () => {
    const events = prefsView(cashier, normalizePrefs(null)).map((e) => e.event);
    expect(events).toContain('sale');
    expect(events).toContain('onlineOrder');
    expect(events).not.toContain('expense');
    expect(events).not.toContain('account');
  });

  it('limits people tied to a shop to that shop; owners see all', () => {
    expect(inScope(manager, 's1')).toBe(true);
    expect(inScope(manager, 's2')).toBe(false);
    expect(inScope(owner, 's2')).toBe(true);
    expect(inScope(manager, null)).toBe(true);
  });
});

describe('alert rules: stored values', () => {
  it('drops unknown events, bad sounds and bad times', () => {
    const p = normalizePrefs({ events: { nope: { push: true }, sale: { push: 'yes' } }, sound: 'trumpet', quietStart: '25:00', saleDigestMinutes: 7 });
    expect(p.events).toEqual({ sale: {} });
    expect(p.sound).toBe('chime');
    expect(p.quietStart).toBe('22:00');
    expect(p.saleDigestMinutes).toBe(15);
  });

  it('merges a partial update and keeps the old value for an invalid one', () => {
    const current = normalizePrefs({ sound: 'cash', saleDigestMinutes: 30, events: { sale: { push: true } } });
    const next = sanitizePrefsInput({ sound: 'bell', saleDigestMinutes: 9, events: { sale: { inApp: false } }, role: 'OWNER' }, current);
    expect(next.sound).toBe('bell');
    expect(next.saleDigestMinutes).toBe(30);
    expect(next.events.sale).toEqual({ push: true, inApp: false });
    expect((next as unknown as Record<string, unknown>).role).toBeUndefined();
  });
});

describe('alert rules: quiet hours, windows and sounds', () => {
  const tz = 'Asia/Karachi';
  const at = (hhmm: string) => new Date(`2026-11-04T${hhmm}:00+05:00`);

  it('handles quiet hours across midnight in the business time zone', () => {
    const p = { quietHours: true, quietStart: '22:00', quietEnd: '08:00' };
    expect(inQuietHours(p, at('23:30'), tz)).toBe(true);
    expect(inQuietHours(p, at('07:59'), tz)).toBe(true);
    expect(inQuietHours(p, at('08:00'), tz)).toBe(false);
    expect(inQuietHours(p, at('14:00'), tz)).toBe(false);
    expect(inQuietHours({ ...p, quietHours: false }, at('23:30'), tz)).toBe(false);
  });

  it('puts every sale of the same quarter hour in one window', () => {
    const a = digestWindow(new Date('2026-11-04T10:01:00Z'), 15);
    const b = digestWindow(new Date('2026-11-04T10:14:59Z'), 15);
    const c = digestWindow(new Date('2026-11-04T10:15:00Z'), 15);
    expect(a.start.getTime()).toBe(b.start.getTime());
    expect(c.start.getTime()).toBe(a.end.getTime());
  });

  it('uses tone channels only on builds that carry the tones', () => {
    expect(deviceHasTones('android', '2.0.0')).toBe(false);
    expect(deviceHasTones('android', '2.0.1')).toBe(true);
    expect(deviceHasTones('android', '2.1.0')).toBe(true);
    expect(deviceHasTones('android', null)).toBe(false);
    expect(deviceHasTones('ios', '2.0.0')).toBe(true);
    expect(pushSound({ sound: 'cash', vibrate: true }, { quiet: false, tones: true })).toEqual({ channelId: 'nafaa-cash', sound: 'cash.wav' });
    expect(pushSound({ sound: 'cash', vibrate: false }, { quiet: false, tones: true })).toEqual({ channelId: 'nafaa-cash-novib', sound: 'cash.wav' });
    expect(pushSound({ sound: 'cash', vibrate: true }, { quiet: false, tones: false, legacyChannel: 'sales' })).toEqual({ channelId: 'sales', sound: 'default' });
    expect(pushSound({ sound: 'cash', vibrate: true }, { quiet: true, tones: true })).toEqual({ channelId: 'nafaa-silent', sound: null });
    expect(pushSound({ sound: 'silent', vibrate: true }, { quiet: false, tones: false })).toEqual({ channelId: 'nafaa-silent', sound: null });
  });

  it('writes the push in the receiver\'s language', () => {
    expect(pushText('en', '🧾 Naya Expense')).toBe('🧾 New expense');
    expect(pushText('roman', '🧾 Naya Expense')).toBe('🧾 Naya Expense');
    expect(pushText('ur', '{{customer}} ne Rs {{amount}} diye', { customer: 'Ali', amount: '500' })).toBe('Ali نے Rs 500 دیے');
    expect(pushText('en', 'Unknown {{x}}', { x: 1 })).toBe('Unknown 1');
  });

  it('maps stored notification types to events for push choices', () => {
    expect(eventForNotification('NEW_SALE')).toBe('sale');
    expect(eventForNotification('INFO', { kind: 'daily-summary' })).toBe('dailySummary');
    expect(eventForNotification('INFO', { kind: 'ONLINE_ORDER' })).toBe('onlineOrder');
    expect(eventForNotification('PAYMENT_REJECTED')).toBe('account');
    expect(eventForNotification('INFO')).toBeNull();
  });
});

describe('StaffAlertsService', () => {
  const device = (token: string, platform = 'android', runtimeVersion = '2.0.0') => ({ pushToken: token, platform, runtimeVersion });
  const row = (over: Record<string, unknown>) => ({
    id: 'x', role: 'OWNER', permissions: [], shopId: null, language: 'en', pushTokens: [], notificationPref: null, mobileDevices: [], ...over,
  });

  function setup(people: any[]) {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(people),
        findFirst: jest.fn().mockImplementation(({ where }) => Promise.resolve(people.find((p) => p.id === where.id) ?? null)),
        findUnique: jest.fn().mockResolvedValue({ fullName: 'Asad' }),
      },
      notification: { createMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue(null) },
      sale: { aggregate: jest.fn().mockResolvedValue({ _count: { _all: 3 }, _sum: { total: 4500 } }) },
      product: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const delivery = { deliver: jest.fn().mockImplementation((items: any[]) => Promise.resolve(items.map(() => ({ ok: true, ticketId: 't' })))), waitForReceipts: jest.fn().mockResolvedValue({ t: { status: 'ok' } }) };
    const clocks = { clock: jest.fn().mockResolvedValue({ tz: 'Asia/Karachi', dayStartHour: 0 }) };
    const queue = { add: jest.fn().mockResolvedValue({}) };
    const svc = new StaffAlertsService(prisma as any, delivery as any, clocks as any, queue as any);
    return { svc, prisma, delivery, queue };
  }

  it('tells the right people about an expense, not the person who added it', async () => {
    const people = [
      row({ id: 'owner', mobileDevices: [device('ExponentPushToken[o]')] }),
      row({ id: 'actor', role: 'MANAGER', permissions: ['expenses.view'], shopId: 's1', mobileDevices: [device('ExponentPushToken[a]')] }),
      row({ id: 'cashier', role: 'CASHIER', permissions: ['sales.view'], mobileDevices: [device('ExponentPushToken[c]')] }),
      row({ id: 'other-shop', role: 'MANAGER', permissions: ['expenses.view'], shopId: 's2', mobileDevices: [device('ExponentPushToken[s]')] }),
    ];
    const { svc, prisma, delivery } = setup(people);
    await svc.run({ tenantId: 't', event: 'expense', shopId: 's1', actorId: 'actor', title: '🧾 Naya Expense', message: { message: '', messageKey: '{{title}} · Rs {{amount}} · {{by}}', params: { title: 'Rent', amount: '500' } } });
    const rows = prisma.notification.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.userId)).toEqual(['owner']);
    expect(rows[0].message).toBe('Rent · Rs 500 · Asad');
    const items = delivery.deliver.mock.calls[0][0];
    expect(items).toHaveLength(1);
    expect(items[0].message).toMatchObject({ to: 'ExponentPushToken[o]', title: '🧾 New expense', body: 'Rent · Rs 500 · Asad', channelId: 'default', sound: 'default' });
  });

  it('respects a person who turned the push off but kept the in-app row', async () => {
    const people = [row({ id: 'owner', notificationPref: { events: { expense: { push: false } } }, mobileDevices: [device('ExponentPushToken[o]')] })];
    const { svc, prisma, delivery } = setup(people);
    await svc.run({ tenantId: 't', event: 'expense', title: 'a', message: 'b' });
    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it('batches sale pushes into one summary per window instead of one per bill', async () => {
    const people = [row({ id: 'owner', notificationPref: { events: { sale: { push: true } }, saleDigestMinutes: 15 }, mobileDevices: [device('ExponentPushToken[o]')] })];
    const { svc, delivery, queue } = setup(people);
    await svc.run({ tenantId: 't', event: 'sale', amount: 900, title: 'a', message: 'b' });
    await svc.run({ tenantId: 't', event: 'sale', amount: 900, title: 'a', message: 'b' });
    expect(delivery.deliver).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledTimes(2);
    const [first, second] = queue.add.mock.calls;
    expect(first[2].jobId).toBe(second[2].jobId);
    const out = await svc.sendDigest(first[1]);
    expect(out.sent).toBe(3);
    expect(delivery.deliver.mock.calls[0][0][0].message).toMatchObject({ title: '💰 3 sales', body: 'Rs 4,500 in the last 15 min' });
  });

  it('sends each sale at once when the summary is off, and skips bills below the chosen amount', async () => {
    const people = [row({ id: 'owner', notificationPref: { events: { sale: { push: true } }, saleDigestMinutes: 0, saleMinAmount: 1000 }, mobileDevices: [device('ExponentPushToken[o]')] })];
    const { svc, delivery, prisma } = setup(people);
    await svc.run({ tenantId: 't', event: 'sale', amount: 500, title: 'a', message: 'b' });
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
    await svc.run({ tenantId: 't', event: 'sale', amount: 1500, title: 'a', message: 'b' });
    expect(delivery.deliver).toHaveBeenCalledTimes(1);
  });

  it('only flags discounts at or above each person\'s threshold', async () => {
    const people = [
      row({ id: 'strict', notificationPref: { discountPercent: 10 }, mobileDevices: [device('ExponentPushToken[1]')] }),
      row({ id: 'relaxed', notificationPref: { discountPercent: 30 }, mobileDevices: [device('ExponentPushToken[2]')] }),
    ];
    const { svc, prisma } = setup(people);
    await svc.run({ tenantId: 't', event: 'bigDiscount', percent: 15, title: 'a', message: 'b' });
    expect(prisma.notification.createMany.mock.calls[0][0].data.map((r: any) => r.userId)).toEqual(['strict']);
  });

  it('goes silent in quiet hours and uses the tone channel on new builds', async () => {
    const people = [row({ id: 'owner', notificationPref: { sound: 'bell', quietHours: true, quietStart: '00:00', quietEnd: '23:59' }, mobileDevices: [device('ExponentPushToken[o]', 'android', '2.0.1')] })];
    const { svc, delivery } = setup(people);
    await svc.run({ tenantId: 't', event: 'expense', title: 'a', message: 'b' });
    expect(delivery.deliver.mock.calls[0][0][0].message).toMatchObject({ channelId: 'nafaa-silent', sound: null });
  });

  it('keeps a register opening in the app only', async () => {
    const people = [row({ id: 'owner', mobileDevices: [device('ExponentPushToken[o]')] })];
    const { svc, prisma, delivery } = setup(people);
    await svc.run({ tenantId: 't', event: 'register', pushWorthy: false, title: 'a', message: 'b' });
    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it('reports the real test result', async () => {
    const { svc } = setup([row({ id: 'owner', mobileDevices: [device('ExponentPushToken[o]')] })]);
    await expect(svc.testPush('owner', 't')).resolves.toMatchObject({ status: 'delivered', devices: 1 });
    const none = setup([row({ id: 'owner' })]);
    await expect(none.svc.testPush('owner', 't')).resolves.toMatchObject({ status: 'no-device' });
  });
});

describe('PushDeliveryService.summarize', () => {
  it('turns receipts into one plain outcome', () => {
    expect(PushDeliveryService.summarize([])).toBe('no-device');
    expect(PushDeliveryService.summarize([{ platform: 'android', ok: true, dryRun: true }])).toBe('dry-run');
    expect(PushDeliveryService.summarize([{ platform: 'android', ok: true, receipt: { status: 'error', error: 'InvalidCredentials' } }])).toBe('android-setup');
    expect(PushDeliveryService.summarize([{ platform: 'ios', ok: true, receipt: { status: 'error', error: 'InvalidCredentials' } }])).toBe('ios-setup');
    expect(PushDeliveryService.summarize([
      { platform: 'android', ok: true, receipt: { status: 'error', error: 'InvalidCredentials' } },
      { platform: 'ios', ok: true, receipt: { status: 'ok' } },
    ])).toBe('delivered');
    expect(PushDeliveryService.summarize([{ platform: 'android', ok: true }])).toBe('sent');
    expect(PushDeliveryService.summarize([{ platform: 'android', ok: false, error: 'DeviceNotRegistered' }])).toBe('device-gone');
  });
});

describe('PushDeliveryService.deliver', () => {
  it('logs every push with its ticket and drops tokens of uninstalled apps', async () => {
    const prisma = {
      pushTicket: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      mobileDevice: { updateMany: jest.fn().mockResolvedValue({}) },
      user: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    };
    const push = {
      expoDeliveryEnabled: () => true,
      sendExpo: jest.fn().mockResolvedValue([{ ok: true, ticketId: 'k1' }, { ok: false, error: 'DeviceNotRegistered' }]),
    };
    const svc = new PushDeliveryService(prisma as any, push as any);
    const out = await svc.deliver([
      { event: 'expense', platform: 'android', message: { to: 'A', title: 't', body: 'b' } },
      { event: 'expense', platform: 'ios', message: { to: 'B', title: 't', body: 'b' } },
    ]);
    expect(out.map((r) => r.ok)).toEqual([true, false]);
    const logged = prisma.pushTicket.createMany.mock.calls[0][0].data;
    expect(logged.map((r: any) => r.status)).toEqual(['SENT', 'ERROR']);
    expect(logged[0].ticketId).toBe('k1');
    expect(prisma.mobileDevice.updateMany).toHaveBeenCalledWith({ where: { pushToken: { in: ['B'] } }, data: { pushToken: null } });
  });

  it('sends nothing when delivery is off on this server', async () => {
    const push = { expoDeliveryEnabled: () => false, sendExpo: jest.fn() };
    const svc = new PushDeliveryService({} as any, push as any);
    await expect(svc.deliver([{ event: 'test', message: { to: 'A', title: 't', body: 'b' } }])).resolves.toEqual([{ ok: true, dryRun: true }]);
    expect(push.sendExpo).not.toHaveBeenCalled();
  });
});


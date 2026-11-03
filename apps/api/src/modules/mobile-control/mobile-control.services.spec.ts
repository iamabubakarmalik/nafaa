import { MobileDevicesService } from './mobile-devices.service';
import { MobilePushService } from './mobile-push.service';
import { MobileConfigService } from './mobile-config.service';

const user = { id: 'u1', tenantId: 't1', role: 'OWNER', email: 'a@b.c', sub: 'u1', shopId: null, permissions: [] } as any;
const beat = { installId: 'install-0001', platform: 'android' as const, appVersion: '2.0.0', language: 'en' as const };

function devicePrisma(existing: any) {
  return {
    mobileDevice: {
      findUnique: jest.fn().mockResolvedValue(existing),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'd-new', ...data })),
      update: jest.fn().mockResolvedValue({}),
    },
    mobileDeviceDay: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
    user: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
  };
}

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: 'd1', installId: 'install-0001', tenantId: 't1', userId: 'u1', platform: 'android', appVersion: '2.0.0',
  buildNumber: null, runtimeVersion: null, updateId: null, osVersion: null, deviceModel: null, deviceBrand: null,
  language: 'en', pushToken: null, country: null, lastSeenAt: new Date(), ...overrides,
});

describe('MobileDevicesService.heartbeat', () => {
  const notifications = { registerPushToken: jest.fn().mockResolvedValue({}) } as any;

  it('creates a device on first contact and marks the day', async () => {
    const prisma = devicePrisma(null);
    const svc = new MobileDevicesService(prisma as any, notifications);
    const out = await svc.heartbeat(user, { ...beat, pushToken: 'ExponentPushToken[abc]' }, 'PK');
    expect(out.deviceId).toBe('d-new');
    expect(prisma.mobileDevice.create).toHaveBeenCalled();
    expect(prisma.mobileDeviceDay.createMany).toHaveBeenCalled();
    expect(notifications.registerPushToken).toHaveBeenCalledWith('u1', 'ExponentPushToken[abc]');
  });

  it('writes nothing when the device was just seen and nothing changed', async () => {
    const prisma = devicePrisma(stored());
    const svc = new MobileDevicesService(prisma as any, notifications);
    await svc.heartbeat(user, beat, null);
    expect(prisma.mobileDevice.update).not.toHaveBeenCalled();
    expect(prisma.mobileDeviceDay.createMany).not.toHaveBeenCalled();
  });

  it('updates at once when the version changes', async () => {
    const prisma = devicePrisma(stored());
    const svc = new MobileDevicesService(prisma as any, notifications);
    await svc.heartbeat(user, { ...beat, appVersion: '2.0.1' }, null);
    expect(prisma.mobileDevice.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ appVersion: '2.0.1' }),
    }));
  });

  it('counts a new session after a long gap and keeps the stored push token when none is sent', async () => {
    const prisma = devicePrisma(stored({ lastSeenAt: new Date(Date.now() - 2 * 3_600_000), pushToken: 'ExponentPushToken[old]' }));
    const svc = new MobileDevicesService(prisma as any, notifications);
    await svc.heartbeat(user, beat, null);
    const data = prisma.mobileDevice.update.mock.calls[0][0].data;
    expect(data.sessions).toEqual({ increment: 1 });
    expect(data.pushToken).toBe('ExponentPushToken[old]');
  });

  it('clears the push token when the app sends null', async () => {
    const prisma = devicePrisma(stored({ pushToken: 'ExponentPushToken[old]' }));
    const svc = new MobileDevicesService(prisma as any, notifications);
    await svc.heartbeat(user, { ...beat, pushToken: null }, null);
    expect(prisma.mobileDevice.update.mock.calls[0][0].data.pushToken).toBeNull();
  });
});

describe('MobilePushService', () => {
  function pushPrisma() {
    return {
      tenant: { findMany: jest.fn().mockResolvedValue([{ id: 't1' }]) },
      subscription: { findMany: jest.fn().mockResolvedValue([{ tenantId: 't1', plan: { slug: 'pro' } }, { tenantId: 't2', plan: { slug: 'basic' } }]) },
      mobileDevice: {
        findMany: jest.fn().mockResolvedValue([
          { pushToken: 'A', language: 'ur', platform: 'android', appVersion: '2.0.0' },
          { pushToken: 'A', language: 'ur', platform: 'android', appVersion: '2.0.0' },
          { pushToken: 'B', language: 'en', platform: 'ios', appVersion: '1.9.0' },
        ]),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ pushTokens: ['A', 'C'], language: 'roman' }]) },
      mobilePushBroadcast: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    };
  }
  const push = { expoDeliveryEnabled: () => false } as any;
  const queue = { add: jest.fn() } as any;

  it('dedupes tokens and adds people on the older app when no platform or version filter is set', async () => {
    const prisma = pushPrisma();
    const svc = new MobilePushService(prisma as any, push, queue);
    const out = await svc.audience({ audience: 'all' });
    expect(out).toMatchObject({ total: 3, devices: 2, olderApp: 1, delivery: 'dry-run' });
    expect(out.byLanguage).toEqual({ ur: 1, en: 1, roman: 1 });
  });

  it('applies the version range to devices and leaves the older app out', async () => {
    const prisma = pushPrisma();
    const svc = new MobilePushService(prisma as any, push, queue);
    const out = await svc.audience({ audience: 'all', minVersion: '2.0.0' });
    expect(out).toMatchObject({ total: 1, devices: 1, olderApp: 0 });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('resolves a plan audience to the businesses on that plan', async () => {
    const prisma = pushPrisma();
    const svc = new MobilePushService(prisma as any, push, queue);
    await svc.audience({ audience: 'plan', planSlugs: ['pro'] });
    expect(prisma.mobileDevice.findMany.mock.calls[0][0].where.tenantId).toEqual({ in: ['t1'] });
  });

  it('refuses a targeted push with nothing picked, and a second push while one is sending', async () => {
    const prisma = pushPrisma();
    const svc = new MobilePushService(prisma as any, push, queue);
    await expect(svc.create('admin', { title: { en: 'Hi' }, body: { en: 'There' }, audience: 'plan' })).rejects.toThrow('Pick at least one');
    prisma.mobilePushBroadcast.count.mockResolvedValue(1);
    await expect(svc.create('admin', { title: { en: 'Hi' }, body: { en: 'There' } })).rejects.toThrow('still sending');
  });
});

describe('MobileConfigService.publicConfig', () => {
  const now = Date.now();
  const announcement = (over: Record<string, unknown>) => ({
    id: 'a', title: { en: 'T' }, body: { en: 'B' }, tone: 'info', ctaLabel: null, ctaLink: null,
    audience: 'all', planSlugs: [], industries: [], tenantIds: [], platforms: [], minVersion: null, maxVersion: null,
    startsAt: null, endsAt: null, dismissible: true, isActive: true, priority: 0, updatedAt: new Date(now), ...over,
  });

  function build(rows: any[]) {
    const prisma = {
      systemSetting: {
        findUnique: jest.fn().mockResolvedValue({
          value: JSON.stringify({ releases: { android: { minVersion: '2.0.1', latestVersion: '2.2.0' } }, maintenance: { enabled: true, platforms: ['ios'] } }),
          updatedAt: new Date(now),
        }),
      },
      mobileAnnouncement: { findMany: jest.fn().mockResolvedValue(rows) },
      tenant: { findUnique: jest.fn().mockResolvedValue({ businessType: 'BAKERY' }) },
      subscription: { findFirst: jest.fn().mockResolvedValue({ plan: { slug: 'pro' } }) },
    };
    const appearance = { platform: jest.fn().mockResolvedValue({ mobileTabBar: 'icons' }) };
    return new MobileConfigService(prisma as any, appearance as any);
  }

  it('computes the update prompt, platform maintenance and targeted banners', async () => {
    const svc = build([
      announcement({ id: 'everyone' }),
      announcement({ id: 'bakery', audience: 'industry', industries: ['BAKERY'] }),
      announcement({ id: 'future', startsAt: new Date(now + 86_400_000) }),
      announcement({ id: 'ios-only', platforms: ['ios'] }),
    ]);
    const signedOut = await svc.publicConfig({ platform: 'android', version: '2.0.0' });
    expect(signedOut.update.state).toBe('force');
    expect(signedOut.maintenance.active).toBe(false);
    expect(signedOut.announcements.map((a) => a.id)).toEqual(['everyone']);
    expect(signedOut.appearance).toEqual({ mobileTabBar: 'icons' });

    const signedIn = await svc.publicConfig({ platform: 'android', version: '2.1.0', tenantId: 't1' });
    expect(signedIn.update.state).toBe('soft');
    expect(signedIn.announcements.map((a) => a.id)).toEqual(['everyone', 'bakery']);

    const ios = await svc.publicConfig({ platform: 'ios', version: '2.1.0' });
    expect(ios.maintenance.active).toBe(true);
  });
});

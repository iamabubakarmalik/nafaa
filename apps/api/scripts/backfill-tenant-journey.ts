/**
 * Fills the merchant journey for shops that signed up before it was recorded
 * (migration 20261204100000_tenant_journey).
 *
 * What it infers, from data already in the database:
 *   - last seen per app (web, desktop, Android, iOS) for every user and shop,
 *     from sessions, login history, mobile devices and User.lastSeenAt/Via;
 *   - first use of the Android and iOS apps per shop;
 *   - the signup platform: Sign in with Apple means the iOS app, otherwise
 *     the owner's earliest session, login or device within 24 hours of the
 *     shop being created;
 *   - signup method (email, Google, Apple) and the referral or partner code.
 *
 * It never overwrites what was recorded at signup and only moves last-seen
 * dates forward. Rows it fills are marked inferred = true. Safe to run more
 * than once. User rows are updated with raw SQL so "updatedAt" (read by sync)
 * does not change.
 *
 *   npx ts-node scripts/backfill-tenant-journey.ts            report only
 *   npx ts-node scripts/backfill-tenant-journey.ts --apply    write
 *
 * Optional: --tenant <tenantId> to limit to one shop.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { platformFromUserAgent, type ClientPlatform } from '../src/modules/journey/client-platform';

type Seen = Record<ClientPlatform, Date | null>;
const COLUMN: Record<ClientPlatform, string> = { web: 'lastSeenWebAt', desktop: 'lastSeenDesktopAt', android: 'lastSeenAndroidAt', ios: 'lastSeenIosAt' };
const PLATFORMS: ClientPlatform[] = ['web', 'desktop', 'android', 'ios'];
const DAY = 86_400_000;

const emptySeen = (): Seen => ({ web: null, desktop: null, android: null, ios: null });
const later = (a: Date | null, b: Date | null) => (!a ? b : !b ? a : a > b ? a : b);
const earlier = (a: Date | null, b: Date | null) => (!a ? b : !b ? a : a < b ? a : b);

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const onlyTenant = arg('--tenant');
  const prisma = new PrismaClient();

  const url = process.env.DATABASE_URL ?? '';
  console.log(`Database: ${url.replace(/:\/\/([^:]+):[^@]*@/, '://$1:****@')}`);
  console.log(apply ? 'Mode: APPLY (writes journey data)\n' : 'Mode: report only (nothing changes)\n');

  const tw = onlyTenant ? { tenantId: onlyTenant } : {};
  const [tenants, users, sessions, logins, devices, referrals, journeys] = await Promise.all([
    prisma.tenant.findMany({
      where: { slug: { not: 'nafaa-system' }, ...(onlyTenant ? { id: onlyTenant } : {}) },
      select: { id: true, name: true, createdAt: true, partner: { select: { code: true } } },
    }),
    prisma.user.findMany({
      where: { ...tw, role: { notIn: ['ADMIN_STAFF', 'PARTNER', 'SUPER_ADMIN'] } },
      select: {
        id: true, tenantId: true, role: true, authProvider: true, lastSeenAt: true, lastSeenVia: true,
        lastSeenWebAt: true, lastSeenDesktopAt: true, lastSeenAndroidAt: true, lastSeenIosAt: true,
      },
    }),
    prisma.session.findMany({
      where: onlyTenant ? { user: { tenantId: onlyTenant } } : {},
      select: { userId: true, userAgent: true, platform: true, createdAt: true, lastUsedAt: true },
    }),
    prisma.loginHistory.findMany({ where: { ...tw, success: true }, select: { userId: true, userAgent: true, createdAt: true } }),
    prisma.mobileDevice.findMany({ where: tw, select: { tenantId: true, userId: true, platform: true, firstSeenAt: true, lastSeenAt: true } }),
    prisma.referral.findMany({ where: onlyTenant ? { refereeTenantId: onlyTenant } : {}, select: { refereeTenantId: true, code: true } }),
    prisma.tenantJourney.findMany({ where: tw }),
  ]);

  const userById = new Map(users.map((u) => [u.id, u]));
  const journeyByTenant = new Map(journeys.map((j) => [j.tenantId, j]));
  const referralByTenant = new Map(referrals.map((r) => [r.refereeTenantId, r.code]));

  // Evidence per user: (platform, first at, last at).
  type Evidence = { platform: ClientPlatform; first: Date; last: Date };
  const evidence = new Map<string, Evidence[]>();
  const add = (userId: string, platform: ClientPlatform, first: Date, last: Date) => {
    if (!userById.has(userId)) return;
    evidence.set(userId, [...(evidence.get(userId) ?? []), { platform, first, last }]);
  };
  for (const s of sessions) {
    if (!s.platform && !s.userAgent) continue;
    add(s.userId, (s.platform as ClientPlatform | null) ?? platformFromUserAgent(s.userAgent), s.createdAt, s.lastUsedAt);
  }
  for (const l of logins) if (l.userAgent) add(l.userId, platformFromUserAgent(l.userAgent), l.createdAt, l.createdAt);
  for (const d of devices) add(d.userId, d.platform === 'ios' ? 'ios' : 'android', d.firstSeenAt, d.lastSeenAt);
  for (const u of users) {
    if (!u.lastSeenAt || !u.lastSeenVia) continue;
    let platform: ClientPlatform | null = u.lastSeenVia === 'web' ? 'web' : u.lastSeenVia === 'desktop' ? 'desktop' : null;
    if (u.lastSeenVia === 'mobile') {
      const mine = devices.filter((d) => d.userId === u.id).sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())[0];
      platform = mine?.platform === 'ios' ? 'ios' : 'android';
    }
    if (platform) add(u.id, platform, u.lastSeenAt, u.lastSeenAt);
  }

  // Users: last seen per app.
  let userUpdates = 0;
  const userSeen = new Map<string, Seen>();
  for (const u of users) {
    const seen: Seen = { web: u.lastSeenWebAt, desktop: u.lastSeenDesktopAt, android: u.lastSeenAndroidAt, ios: u.lastSeenIosAt };
    const before = { ...seen };
    for (const e of evidence.get(u.id) ?? []) seen[e.platform] = later(seen[e.platform], e.last);
    userSeen.set(u.id, seen);
    const changed = PLATFORMS.filter((p) => seen[p] && seen[p]?.getTime() !== before[p]?.getTime());
    if (!changed.length) continue;
    userUpdates++;
    if (apply) {
      const sets = Prisma.join(changed.map((p) => Prisma.sql`${Prisma.raw(`"${COLUMN[p]}"`)} = ${seen[p]}`));
      await prisma.$executeRaw`UPDATE "User" SET ${sets} WHERE id = ${u.id}`;
    }
  }

  // Shops: last seen per app, first mobile use, signup platform and source.
  const usersByTenant = new Map<string, typeof users>();
  for (const u of users) usersByTenant.set(u.tenantId, [...(usersByTenant.get(u.tenantId) ?? []), u]);
  const summary = { tenants: tenants.length, journeyRows: 0, signupInferred: 0, signupUnknown: 0, byPlatform: {} as Record<string, number> };

  for (const t of tenants) {
    const team = usersByTenant.get(t.id) ?? [];
    const seen = emptySeen();
    let firstAndroid: Date | null = null;
    let firstIos: Date | null = null;
    for (const u of team) {
      const s = userSeen.get(u.id) ?? emptySeen();
      for (const p of PLATFORMS) seen[p] = later(seen[p], s[p]);
      for (const e of evidence.get(u.id) ?? []) {
        if (e.platform === 'android') firstAndroid = earlier(firstAndroid, e.first);
        if (e.platform === 'ios') firstIos = earlier(firstIos, e.first);
      }
    }

    const existing = journeyByTenant.get(t.id);
    const owner = team.find((u) => u.role === 'OWNER');
    const data: Prisma.TenantJourneyUncheckedCreateInput = { tenantId: t.id };
    const fill = <K extends keyof Prisma.TenantJourneyUncheckedCreateInput>(key: K, value: Prisma.TenantJourneyUncheckedCreateInput[K] | null | undefined) => {
      if (value == null) return;
      if (existing && (existing as Record<string, unknown>)[key as string] != null) return;
      data[key] = value as Prisma.TenantJourneyUncheckedCreateInput[K];
    };

    // Last seen only moves forward; first seen only moves back.
    const keep = (cur: Date | null | undefined, next: Date | null, pick: typeof later) => {
      const v = pick(cur ?? null, next);
      return v && v.getTime() !== cur?.getTime() ? v : undefined;
    };
    const lastWeb = keep(existing?.lastSeenWebAt, seen.web, later);
    const lastDesktop = keep(existing?.lastSeenDesktopAt, seen.desktop, later);
    const lastAndroid = keep(existing?.lastSeenAndroidAt, seen.android, later);
    const lastIos = keep(existing?.lastSeenIosAt, seen.ios, later);
    const firstA = keep(existing?.firstSeenAndroidAt, firstAndroid, earlier);
    const firstI = keep(existing?.firstSeenIosAt, firstIos, earlier);
    if (lastWeb) data.lastSeenWebAt = lastWeb;
    if (lastDesktop) data.lastSeenDesktopAt = lastDesktop;
    if (lastAndroid) data.lastSeenAndroidAt = lastAndroid;
    if (lastIos) data.lastSeenIosAt = lastIos;
    if (firstA) data.firstSeenAndroidAt = firstA;
    if (firstI) data.firstSeenIosAt = firstI;

    // Signup facts, only when nothing was recorded at signup.
    if (!existing?.signupRecordedAt) {
      let platform: ClientPlatform | null = null;
      if (owner?.authProvider === 'APPLE') platform = 'ios';
      else if (owner) {
        const window = t.createdAt.getTime() + DAY;
        const first = (evidence.get(owner.id) ?? [])
          .filter((e) => e.first.getTime() >= t.createdAt.getTime() - 60_000 && e.first.getTime() <= window)
          .sort((a, b) => a.first.getTime() - b.first.getTime())[0];
        platform = first?.platform ?? null;
      }
      const method = owner?.authProvider === 'EMAIL' ? 'email' : owner?.authProvider === 'GOOGLE' ? 'google' : owner?.authProvider === 'APPLE' ? 'apple' : null;
      const sizeBefore = Object.keys(data).length;
      fill('signupPlatform', platform);
      fill('signupMethod', method);
      fill('referralCode', referralByTenant.get(t.id) ?? t.partner?.code ?? null);
      if (Object.keys(data).length > sizeBefore) data.inferred = true;
      if (platform) {
        summary.signupInferred++;
        summary.byPlatform[platform] = (summary.byPlatform[platform] ?? 0) + 1;
      } else if (!existing?.signupPlatform) summary.signupUnknown++;
    }

    if (Object.keys(data).length <= 1) continue;
    summary.journeyRows++;
    if (apply) {
      const { tenantId: _id, ...update } = data;
      await prisma.tenantJourney.upsert({ where: { tenantId: t.id }, create: data, update });
    }
  }

  console.log(`Shops checked:            ${summary.tenants}`);
  console.log(`Shop journey rows ${apply ? 'written' : 'to write'}: ${summary.journeyRows}`);
  console.log(`Users ${apply ? 'updated' : 'to update'} (last seen per app): ${userUpdates}`);
  console.log(`Signup platform inferred: ${summary.signupInferred} ${JSON.stringify(summary.byPlatform)}`);
  console.log(`Signup platform unknown:  ${summary.signupUnknown}`);
  if (!apply) console.log('\nNothing was written. Run again with --apply to write.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Records the merchant journey data that is not already in the database:
 * the platform and source of each signup, and the last time each shop (and
 * each user) used each Nafaa app. Every write here is best effort: a failure
 * is logged and never fails the request that triggered it.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PLATFORM_COLUMN, type ClientInfo, type ClientPlatform } from './client-platform';
import type { SignupSourceDto } from './dto/signup-source.dto';

/** Hosts of the Nafaa app itself; a referrer from these is not a source. */
const OWN_HOSTS = /(^|\.)app\.nafaa\.pk$|^localhost$|^127\.0\.0\.1$/i;
/** The web app may send the source up to this long after the shop was created. */
const SOURCE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

const SOURCE_FIELDS = [
  'utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent',
  'ftSource', 'ftMedium', 'ftCampaign', 'ftTerm', 'ftContent',
  'cta', 'landingPage', 'referralCode',
] as const;

const clean = (v: unknown, max = 150): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s || null;
};

export function referrerDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    return host && !OWN_HOSTS.test(host) ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

@Injectable()
export class JourneyCaptureService {
  private readonly logger = new Logger(JourneyCaptureService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Signup platform, app version and method of a new shop. Runs in the background. */
  recordSignup(tenantId: string | null | undefined, input: { client: ClientInfo; method: 'email' | 'google' | 'apple'; referralCode?: string | null }): void {
    if (!tenantId) return;
    const data = {
      signupPlatform: input.client.platform,
      signupAppVersion: input.client.appVersion,
      signupUserAgent: input.client.userAgent,
      signupMethod: input.method,
      referralCode: clean(input.referralCode, 40)?.toUpperCase() ?? null,
      signupRecordedAt: new Date(),
    };
    void (async () => {
      // Presence may have created the row a moment earlier; fill it only once.
      const { count } = await this.prisma.tenantJourney.updateMany({ where: { tenantId, signupRecordedAt: null }, data });
      if (!count) await this.prisma.tenantJourney.createMany({ data: [{ tenantId, ...data }], skipDuplicates: true });
    })().catch((e: Error) => this.logger.warn(`Signup journey not recorded for ${tenantId}: ${e.message}`));
  }

  /**
   * Source reported by the web app right after signup. Only empty fields are
   * filled, and only for a shop created in the last few days, so a later call
   * cannot rewrite where a shop came from.
   */
  async recordSource(tenantId: string, dto: SignupSourceDto): Promise<{ saved: boolean }> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { createdAt: true } });
    if (!tenant || Date.now() - tenant.createdAt.getTime() > SOURCE_WINDOW_MS) return { saved: false };

    const incoming: Record<string, string | null> = {};
    for (const key of SOURCE_FIELDS) incoming[key] = clean(dto[key], key === 'utmContent' || key === 'ftContent' || key === 'landingPage' ? 300 : 150);
    if (incoming.referralCode) incoming.referralCode = incoming.referralCode.toUpperCase();
    incoming.referrerDomain = referrerDomain(dto.referrer);

    const existing = await this.prisma.tenantJourney.findUnique({ where: { tenantId } });
    const patch: Record<string, string> = {};
    for (const [key, value] of Object.entries(incoming)) {
      if (value && !(existing as Record<string, unknown> | null)?.[key]) patch[key] = value;
    }
    if (!Object.keys(patch).length) return { saved: false };
    await this.prisma.tenantJourney.upsert({ where: { tenantId }, create: { tenantId, ...patch }, update: patch });
    return { saved: true };
  }

  /**
   * Last seen per app for the user and the shop. Raw SQL so "User".updatedAt
   * (read by sync and change feeds) does not move.
   */
  async touch(userId: string, tenantId: string | undefined, platform: ClientPlatform, at: Date): Promise<void> {
    const col = PLATFORM_COLUMN[platform];
    const last = Prisma.raw(`"lastSeen${col}At"`);
    await this.prisma.$executeRaw`UPDATE "User" SET ${last} = ${at} WHERE id = ${userId}`;
    if (!tenantId) return;
    if (platform === 'android' || platform === 'ios') {
      const first = Prisma.raw(`"firstSeen${col}At"`);
      await this.prisma.$executeRaw`
        INSERT INTO "tenant_journey" ("tenantId", ${last}, ${first}, "updatedAt") VALUES (${tenantId}, ${at}, ${at}, ${at})
        ON CONFLICT ("tenantId") DO UPDATE SET ${last} = EXCLUDED.${last}, ${first} = COALESCE("tenant_journey".${first}, EXCLUDED.${first}), "updatedAt" = EXCLUDED."updatedAt"`;
    } else {
      await this.prisma.$executeRaw`
        INSERT INTO "tenant_journey" ("tenantId", ${last}, "updatedAt") VALUES (${tenantId}, ${at}, ${at})
        ON CONFLICT ("tenantId") DO UPDATE SET ${last} = EXCLUDED.${last}, "updatedAt" = EXCLUDED."updatedAt"`;
    }
  }
}

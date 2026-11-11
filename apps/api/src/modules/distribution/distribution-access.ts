/**
 * Distribution is a switch (DistributionSettings.enabled) on top of a paid
 * plan feature (Plan.featureDistribution). This guard keeps every
 * distribution route except settings closed until both are on. Answers are
 * cached briefly per business; switching on in Settings clears the cache.
 */

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { apiMessage } from '../../common/i18n/api-message';
import { EntitlementsService } from '../billing/entitlements/entitlements.service';

const TTL_MS = 30_000;

export interface DistributionAccess {
  enabled: boolean;
  planAllows: boolean;
  planName: string | null;
}

@Injectable()
export class DistributionAccessService {
  private readonly cache = new Map<string, { at: number; value: DistributionAccess }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async read(tenantId: string): Promise<DistributionAccess> {
    const hit = this.cache.get(tenantId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
    // Plan feature, the Distribution add-on, a trial or an admin gift (pricing v2).
    const [settings, ent] = await Promise.all([
      this.prisma.distributionSettings.findUnique({ where: { tenantId }, select: { enabled: true } }),
      this.entitlements.get(tenantId),
    ]);
    const value = { enabled: !!settings?.enabled, planAllows: ent.features.includes('distribution'), planName: ent.plan?.name ?? null };
    this.cache.set(tenantId, { at: Date.now(), value });
    return value;
  }

  forget(tenantId: string) {
    this.cache.delete(tenantId);
  }

  /** Throws the reason distribution cannot be used right now. */
  async assertOpen(tenantId: string) {
    const a = await this.read(tenantId);
    if (!a.planAllows) throw new ForbiddenException(a.planName
      ? apiMessage('Distribution ke liye add-on chahiye — "Mera plan" me Distribution add-on jodein', { planName: a.planName })
      : apiMessage('Distribution ke liye add-on chahiye — "Mera plan" me Distribution add-on jodein'));
    if (!a.enabled) throw new ForbiddenException('Distribution band hai — Settings me Distribution on karein');
  }
}

@Injectable()
export class DistributionEnabledGuard implements CanActivate {
  constructor(private readonly access: DistributionAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest()?.user;
    if (!user?.tenantId) return true;
    await this.access.assertOpen(user.tenantId);
    return true;
  }
}

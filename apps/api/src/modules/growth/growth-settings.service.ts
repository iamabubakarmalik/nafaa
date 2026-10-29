/**
 * Reads and saves the growth tools' shop defaults, kept in
 * `TenantSettings.reportsConfig.growth` next to Settings → Reports.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CHANNEL_KINDS, GrowthSettings, normalizeGrowthSettings } from './growth-settings';

@Injectable()
export class GrowthSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string): Promise<GrowthSettings> {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { reportsConfig: true } });
    return normalizeGrowthSettings((s?.reportsConfig as Record<string, unknown> | null)?.growth);
  }

  /** Merges a partial change (price and/or ads) into the saved defaults. */
  async save(tenantId: string, patch: { price?: Record<string, unknown>; ads?: Record<string, unknown> }): Promise<GrowthSettings> {
    const row = await this.prisma.tenantSettings.findUnique({ where: { tenantId }, select: { reportsConfig: true } });
    const stored = (row?.reportsConfig && typeof row.reportsConfig === 'object' ? row.reportsConfig : {}) as Record<string, any>;
    const current = normalizeGrowthSettings(stored.growth);
    const price = patch.price && typeof patch.price === 'object' ? patch.price : {};
    const next = normalizeGrowthSettings({
      price: {
        ...current.price,
        ...price,
        channels: Object.fromEntries(CHANNEL_KINDS.map((k) => [k, { ...current.price.channels[k], ...(((price.channels as any)?.[k] as object) ?? {}) }])),
        courier: { ...current.price.courier, ...((price.courier as object) ?? {}) },
        target: { ...current.price.target, ...((price.target as object) ?? {}) },
      },
      ads: { ...current.ads, ...(patch.ads && typeof patch.ads === 'object' ? patch.ads : {}) },
    });
    const reportsConfig = JSON.parse(JSON.stringify({ ...stored, growth: next }));
    await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      create: { tenantId, reportsConfig },
      update: { reportsConfig },
    });
    return next;
  }
}

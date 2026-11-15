/**
 * Nafaa Market as a sales channel.
 *
 * Every shop listed on the Market gets one Integration of type NAFAA_MARKET
 * (category SALES_CHANNEL), linked from ShopMarketplaceProfile.integrationId.
 * Market orders enter the shop's Online Orders through it, so auto-accept,
 * risk checks, couriers and the POS bill work as for any other channel.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Integration, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { gateForBusinessType } from './market-config';

export const MARKET_CHANNEL_NAME = 'Nafaa Market';

@Injectable()
export class MarketChannelService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The shop's Market channel, created on first use. Also fills the shop's
   * gate from its POS business type when the owner has not picked one.
   * Safe to call any number of times.
   */
  async ensureChannel(shopId: string): Promise<Integration> {
    const profile = await this.prisma.shopMarketplaceProfile.findUnique({
      where: { shopId },
      select: { id: true, tenantId: true, gate: true, integrationId: true, tenant: { select: { businessType: true } } },
    });
    if (!profile) throw new NotFoundException('Dukaan ka Market profile nahi mila');

    if (!profile.gate) {
      await this.prisma.shopMarketplaceProfile.update({
        where: { id: profile.id },
        data: { gate: gateForBusinessType(profile.tenant.businessType).gate },
      });
    }

    if (profile.integrationId) {
      const linked = await this.prisma.integration.findUnique({ where: { id: profile.integrationId } });
      if (linked && linked.type === 'NAFAA_MARKET') {
        if (linked.status !== 'CONNECTED' || !linked.isActive) {
          return this.prisma.integration.update({ where: { id: linked.id }, data: { status: 'CONNECTED', isActive: true } });
        }
        return linked;
      }
    }

    // Reuse a channel left from an earlier link (e.g. the profile was re-created).
    const existing = await this.prisma.integration.findFirst({
      where: { tenantId: profile.tenantId, shopId, type: 'NAFAA_MARKET' },
      orderBy: { createdAt: 'asc' },
    });
    const integration = existing
      ? await this.prisma.integration.update({ where: { id: existing.id }, data: { status: 'CONNECTED', isActive: true } })
      : await this.prisma.integration.create({
          data: {
            tenantId: profile.tenantId,
            shopId,
            type: 'NAFAA_MARKET',
            category: 'SALES_CHANNEL',
            displayName: MARKET_CHANNEL_NAME,
            status: 'CONNECTED',
            webhookVerified: true,
            config: { shopId, platform: 'nafaa_market', priceFrom: 'NONE', priceFromAsk: false } as Prisma.InputJsonValue,
          },
        });

    // A unique link: another request may have linked a channel in between.
    await this.prisma.shopMarketplaceProfile
      .updateMany({ where: { id: profile.id, integrationId: null }, data: { integrationId: integration.id } })
      .catch(() => null);
    const fresh = await this.prisma.shopMarketplaceProfile.findUnique({ where: { id: profile.id }, select: { integrationId: true } });
    if (fresh?.integrationId && fresh.integrationId !== integration.id) {
      const winner = await this.prisma.integration.findUnique({ where: { id: fresh.integrationId } });
      if (winner) return winner;
    }
    if (fresh?.integrationId !== integration.id) {
      await this.prisma.shopMarketplaceProfile.update({ where: { id: profile.id }, data: { integrationId: integration.id } });
    }
    return integration;
  }

  /** True when this integration is a Market channel. */
  isMarketIntegration(i: { type: string } | null | undefined): boolean {
    return i?.type === 'NAFAA_MARKET';
  }
}

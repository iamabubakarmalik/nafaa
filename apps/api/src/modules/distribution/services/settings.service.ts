/**
 * Distribution settings: the on/off switch, credit rule, check-in radius,
 * numbering and defaults. Reading them also tells the client whether the
 * plan allows distribution, and carries the fixed lists (statuses, reasons).
 */

import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { BOOKER_REQUIRED_PERMISSIONS, DISTRIBUTION_PRESETS } from '../../../common/constants/permissions.constants';
import { DistributionAccessService } from '../distribution-access';
import {
  COLLECTION_STATUSES, CREDIT_MODES, DELIVERY_OUTCOMES, LOAD_SHEET_STATUSES, NO_ORDER_REASONS, ORDER_STATUSES, VISIT_OUTCOMES,
} from '../distribution.constants';
import { UpdateDistributionSettingsDto } from '../dto/setup.dto';
import { LIST_BASES } from '../helpers/pricing';
import { SCHEME_TYPES } from '../helpers/scheme-resolver';

const PUBLIC_FIELDS = {
  enabled: true, creditMode: true, requireCheckIn: true, checkInRadiusM: true, orderPrefix: true, loadSheetPrefix: true,
  recoveryNeedsVerify: true, defaultPriceListId: true, defaultShopId: true, updatedAt: true,
} as const;

export const DISTRIBUTION_META = {
  orderStatuses: ORDER_STATUSES,
  loadSheetStatuses: LOAD_SHEET_STATUSES,
  deliveryOutcomes: DELIVERY_OUTCOMES,
  collectionStatuses: COLLECTION_STATUSES,
  visitOutcomes: VISIT_OUTCOMES,
  noOrderReasons: NO_ORDER_REASONS,
  creditModes: CREDIT_MODES,
  schemeTypes: SCHEME_TYPES,
  listBases: LIST_BASES,
};

@Injectable()
export class DistributionSettingsService {
  constructor(private readonly prisma: PrismaService, private readonly access: DistributionAccessService) {}

  async get(user: AuthenticatedUser) {
    const row = await this.prisma.distributionSettings.findUnique({ where: { tenantId: user.tenantId }, select: PUBLIC_FIELDS });
    const access = await this.access.read(user.tenantId);
    return {
      settings: row ?? {
        enabled: false, creditMode: 'WARN_THEN_PIN', requireCheckIn: false, checkInRadiusM: 150, orderPrefix: 'SO-',
        loadSheetPrefix: 'LS-', recoveryNeedsVerify: true, defaultPriceListId: null, defaultShopId: null, updatedAt: null,
      },
      access,
      meta: DISTRIBUTION_META,
    };
  }

  async update(user: AuthenticatedUser, dto: UpdateDistributionSettingsDto) {
    const tenantId = user.tenantId;
    if (dto.enabled === true) {
      this.access.forget(tenantId);
      const a = await this.access.read(tenantId);
      if (!a.planAllows) throw new ForbiddenException(`Aap ke plan${a.planName ? ` (${a.planName})` : ''} me Distribution shamil nahi — plan upgrade karein`);
    }
    if (dto.defaultPriceListId) {
      const ok = await this.prisma.priceList.findFirst({ where: { id: dto.defaultPriceListId, tenantId }, select: { id: true } });
      if (!ok) throw new BadRequestException('Price list nahi mili');
    }
    if (dto.defaultShopId) {
      const ok = await this.prisma.shop.findFirst({ where: { id: dto.defaultShopId, tenantId, isActive: true }, select: { id: true } });
      if (!ok) throw new BadRequestException('Godown / shop nahi mila');
    }
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) if (v !== undefined) data[k] = typeof v === 'string' ? v.trim() || null : v;
    if (data.orderPrefix === null) data.orderPrefix = '';
    if (data.loadSheetPrefix === null) data.loadSheetPrefix = '';
    await this.prisma.distributionSettings.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
    this.access.forget(tenantId);
    return this.get(user);
  }

  presets() {
    return { presets: DISTRIBUTION_PRESETS, bookerRequired: BOOKER_REQUIRED_PERMISSIONS };
  }
}

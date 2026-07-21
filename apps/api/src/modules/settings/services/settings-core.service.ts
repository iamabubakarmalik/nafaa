import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashPassword } from '../../../common/utils/password.util';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { DEFAULT_SETTINGS } from '../constants/settings.constants';

@Injectable()
export class SettingsCoreService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all settings + tenant + computed flags */
  async get(user: AuthenticatedUser) {
    let settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (!settings) {
      settings = await this.prisma.tenantSettings.create({
        data: { tenantId: user.tenantId },
      });
    }

    const [tenant, activeSubscription, activePlan] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: {
          id: true, name: true, slug: true, status: true,
          currency: true, language: true, phone: true, address: true,
          referralCode: true, businessType: true, businessFeatures: true,
          defaultUnit: true, createdAt: true,
        },
      }),
      this.prisma.subscription.findFirst({
        where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'TRIAL'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plan.findFirst({ where: { isActive: true } }),
    ]);

    const notificationPref = await this.prisma.notificationPreference.findUnique({
      where: { tenantId: user.tenantId },
    });

    const { managerPin, ...safeSettings } = settings as any;

    return {
      settings: {
        ...safeSettings,
        hasManagerPin: !!managerPin,
      },
      tenant,
      subscription: activeSubscription,
      plan: activePlan,
      notificationPref,
    };
  }

  /** Partial update — updates ONLY provided fields, syncs to Tenant model too */
  async update(user: AuthenticatedUser, dto: UpdateSettingsDto) {
    const data: any = { ...dto };
    if (dto.managerPin) {
      data.managerPin = await hashPassword(dto.managerPin);
    }

    const tenantSync: any = {};
    if (dto.shopName) tenantSync.name = dto.shopName;
    if (dto.shopAddress !== undefined) tenantSync.address = dto.shopAddress || null;
    if (dto.shopPhone !== undefined) tenantSync.phone = dto.shopPhone || null;
    if (dto.language) tenantSync.language = dto.language;
    if (dto.currency) tenantSync.currency = dto.currency;

    const [settings] = await this.prisma.$transaction([
      this.prisma.tenantSettings.upsert({
        where: { tenantId: user.tenantId },
        create: { tenantId: user.tenantId, ...data },
        update: data,
      }),
      ...(Object.keys(tenantSync).length > 0
        ? [this.prisma.tenant.update({ where: { id: user.tenantId }, data: tenantSync })]
        : []),
    ]);

    // Log the change
    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'SETTINGS_UPDATED',
        entityType: 'TenantSettings',
        entityId: settings.id,
        description: `Updated ${Object.keys(dto).length} setting(s)`,
        metadata: { fields: Object.keys(dto) } as any,
      },
    });

    const { managerPin, ...safe } = settings as any;
    return { ...safe, hasManagerPin: !!managerPin };
  }

  /** Reset a whole section to defaults */
  async resetSection(user: AuthenticatedUser, section: string) {
    const reset = DEFAULT_SETTINGS[section];
    if (!reset) throw new BadRequestException(`Unknown section: ${section}`);

    await this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: reset,
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'SETTINGS_RESET',
        entityType: 'TenantSettings',
        description: `Reset "${section}" section to defaults`,
      },
    });

    return this.get(user);
  }

  /** Get receipt config (industry-aware) */
  async getReceiptConfig(user: AuthenticatedUser) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    const businessType = (settings as any)?.businessType ?? 'STANDARD';
    const defaults = this.getDefaultReceiptConfig(businessType);
    const stored = (settings as any)?.receiptConfig;
    const parsed = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : {};
    return { ...defaults, ...parsed };
  }

  async updateReceiptConfig(user: AuthenticatedUser, dto: any) {
    const existing = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (existing) {
      await this.prisma.tenantSettings.update({
        where: { tenantId: user.tenantId },
        data: { receiptConfig: dto } as any,
      });
    } else {
      await this.prisma.tenantSettings.create({
        data: { tenantId: user.tenantId, receiptConfig: dto } as any,
      });
    }

    return this.getReceiptConfig(user);
  }

  private getDefaultReceiptConfig(businessType: string) {
    const type = String(businessType).toUpperCase();

    if (type.includes('RESTAURANT') || type.includes('CAFE') || type.includes('BAKERY') || type.includes('FOOD')) {
      return {
        template: 'RESTAURANT',
        showLogo: true, showShopName: true, showShopAddress: true, showShopPhone: true,
        showCustomer: true, showTableNumber: true, showOrderMode: true, showWaiterName: false,
        showModifiers: true, showSpecialInstructions: true, showServiceCharge: true,
        showTaxBreakdown: true, showTip: true, showKot: true, showFooter: true,
        footerText: 'Thank you for dining with us!',
        paperWidth: 80, fontSize: 'normal',
        showQRCode: false, showBarcode: false, copies: 1,
      };
    }
    if (type.includes('CARPET') || type.includes('FLOORING')) {
      return {
        template: 'CARPET',
        showLogo: true, showShopName: true, showShopAddress: true, showShopPhone: true,
        showCustomer: true, showDimensions: true, showSqft: true, showRollNumber: true,
        showCutDetails: true, showFooter: true,
        footerText: 'Thank you for your business!',
        paperWidth: 80, fontSize: 'normal', copies: 1,
      };
    }
    if (type.includes('MOBILE') || type.includes('PHONE') || type.includes('ELECTRONICS')) {
      return {
        template: 'MOBILE',
        showLogo: true, showShopName: true, showShopAddress: true, showShopPhone: true,
        showCustomer: true, showImei: true, showWarranty: true, showSerialNumber: true,
        showPtaStatus: true, showFooter: true,
        footerText: 'Warranty terms apply — receipt safal rakhein',
        paperWidth: 80, fontSize: 'normal', copies: 1,
      };
    }
    return {
      template: 'STANDARD',
      showLogo: true, showShopName: true, showShopAddress: true, showShopPhone: true,
      showCustomer: true, showUnit: true, showMrp: false, showBarcode: false,
      showFooter: true, footerText: 'Thank you for shopping!',
      paperWidth: 80, fontSize: 'normal', copies: 1,
    };
  }
}

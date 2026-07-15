import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword, comparePassword } from '../../common/utils/password.util';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all settings (auto-create with defaults if missing) */
  async get(user: AuthenticatedUser) {
    let settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (!settings) {
      settings = await this.prisma.tenantSettings.create({
        data: { tenantId: user.tenantId },
      });
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true, name: true, slug: true, status: true,
        currency: true, language: true, phone: true, address: true,
        referralCode: true,
      },
    });

    // Hide sensitive fields
    const { managerPin, ...safeSettings } = settings;
    return {
      settings: {
        ...safeSettings,
        hasManagerPin: !!managerPin,
      },
      tenant,
    };
  }

  /** Update settings (partial — accepts any subset of fields) */
  async update(user: AuthenticatedUser, dto: UpdateSettingsDto) {
    // Hash manager PIN if provided
    const data: any = { ...dto };
    if (dto.managerPin) {
      data.managerPin = await hashPassword(dto.managerPin);
    }

    // Sync shopName & address to Tenant model too (for backward compat)
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

    const { managerPin, ...safeSettings } = settings;
    return {
      ...safeSettings,
      hasManagerPin: !!managerPin,
    };
  }

  /** Reset section to defaults */
  async resetSection(user: AuthenticatedUser, section: string) {
    const defaults: Record<string, any> = {
      receipt: {
        receiptSize: 'THERMAL_58MM',
        receiptHeader: null,
        receiptFooter: null,
        receiptShowLogo: true,
        receiptShowTax: true,
        receiptShowCustomer: true,
        receiptShowBarcode: false,
        receiptShowQrCode: false,
        invoicePrefix: 'INV-',
        invoiceStartNumber: 1,
        autoPrintReceipt: false,
        printCopiesCount: 1,
      },
      tax: {
        enableTax: false,
        taxRate: 0,
        taxInclusive: false,
        taxNumber: null,
        taxLabel: 'GST',
        defaultMarkup: 0,
        roundPriceTo: 1,
      },
      pos: {
        defaultPaymentMethod: 'CASH',
        allowNegativeStock: false,
        confirmBeforeCheckout: true,
        requireCustomerForSale: false,
        allowDiscount: true,
        maxDiscountPercent: 50,
        roundTotal: true,
        showProductImages: true,
        enableBarcodeScanner: true,
        enableQuickKeys: true,
      },
      notifications: {
        emailNotifications: true,
        smsNotifications: false,
        whatsappNotifications: false,
        pushNotifications: true,
        notifyLowStock: true,
        notifyOutOfStock: true,
        notifyNewSale: false,
        notifyDailySummary: true,
        dailySummaryTime: '21:00',
        notifyNewCustomer: false,
      },
      appearance: {
        theme: 'light',
        brandColor: '#16a34a',
        compactMode: false,
      },
    };

    const reset = defaults[section];
    if (!reset) throw new BadRequestException(`Unknown section: ${section}`);

    await this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: reset,
    });

    return this.get(user);
  }

  /** Verify manager PIN (used by sensitive actions) */
  async verifyPin(user: AuthenticatedUser, pin: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { managerPin: true },
    });
    if (!settings?.managerPin) {
      return { valid: false, message: 'PIN not set' };
    }
    const ok = await comparePassword(pin, settings.managerPin);
    return { valid: ok, message: ok ? 'PIN correct' : 'Invalid PIN' };
  }
  // ─── Receipt Configuration ───
  async getReceiptConfig(user: AuthenticatedUser) {
    const settings = await this.prisma.tenantSettings.findFirst({
      where: { tenantId: user.tenantId },
    });

    // Default config based on business type
    const businessType = (settings as any)?.businessType ?? 'STANDARD';
    const defaults = this.getDefaultReceiptConfig(businessType);

    const stored = (settings as any)?.receiptConfig;
    return { ...defaults, ...(stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : {}) };
  }

  async updateReceiptConfig(user: AuthenticatedUser, dto: any) {
    const existing = await this.prisma.tenantSettings.findFirst({
      where: { tenantId: user.tenantId },
    });

    if (existing) {
      return this.prisma.tenantSettings.update({
        where: { id: existing.id },
        data: { receiptConfig: dto } as any,
      });
    }

    return this.prisma.tenantSettings.create({
      data: {
        tenantId: user.tenantId,
        receiptConfig: dto,
      } as any,
    });
  }

  private getDefaultReceiptConfig(businessType: string) {
    const type = businessType.toUpperCase();

    if (type.includes('RESTAURANT') || type.includes('CAFE') || type.includes('BAKERY') || type.includes('FOOD')) {
      return {
        template: 'RESTAURANT',
        showLogo: true,
        showShopName: true,
        showShopAddress: true,
        showShopPhone: true,
        showCustomer: true,
        showTableNumber: true,
        showOrderMode: true,
        showWaiterName: false,
        showModifiers: true,
        showSpecialInstructions: true,
        showServiceCharge: true,
        showTaxBreakdown: true,
        showTip: true,
        showKot: true,
        showFooter: true,
        footerText: 'Thank you for dining with us!',
        paperWidth: 80, // 58mm or 80mm thermal
        fontSize: 'normal',
        showQRCode: false,
        showBarcode: false,
        copies: 1, // 1 = customer, 2 = customer + kitchen
      };
    }

    if (type.includes('CARPET') || type.includes('FLOORING')) {
      return {
        template: 'CARPET',
        showLogo: true,
        showShopName: true,
        showShopAddress: true,
        showShopPhone: true,
        showCustomer: true,
        showDimensions: true,
        showSqft: true,
        showRollNumber: true,
        showCutDetails: true,
        showWholesalePrice: false,
        showFooter: true,
        footerText: 'Thank you for your business!',
        paperWidth: 80,
        fontSize: 'normal',
        copies: 1,
      };
    }

    if (type.includes('MOBILE') || type.includes('PHONE') || type.includes('ELECTRONICS')) {
      return {
        template: 'MOBILE',
        showLogo: true,
        showShopName: true,
        showShopAddress: true,
        showShopPhone: true,
        showCustomer: true,
        showImei: true,
        showWarranty: true,
        showSerialNumber: true,
        showPtaStatus: false,
        showFooter: true,
        footerText: 'Thank you for shopping!',
        paperWidth: 80,
        fontSize: 'normal',
        copies: 1,
      };
    }

    // DEFAULT / RETAIL
    return {
      template: 'STANDARD',
      showLogo: true,
      showShopName: true,
      showShopAddress: true,
      showShopPhone: true,
      showCustomer: true,
      showUnit: true,
      showMrp: false,
      showBarcode: false,
      showFooter: true,
      footerText: 'Thank you for shopping!',
      paperWidth: 80,
      fontSize: 'normal',
      copies: 1,
    };
  }

}

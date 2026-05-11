import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
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
    const { comparePassword } = await import('../../common/utils/password.util');
    const ok = await comparePassword(pin, settings.managerPin);
    return { valid: ok, message: ok ? 'PIN correct' : 'Invalid PIN' };
  }
}

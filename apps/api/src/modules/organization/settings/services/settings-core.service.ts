import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpdateReceiptConfigDto } from '../dto/update-receipt-config.dto';
import { UpdateReportsConfigDto } from '../dto/update-reports-config.dto';
import { UpdateSettingsDto } from '../dto/update-settings.dto';
import { UpdatePosCounterDto } from '../dto/update-pos-counter.dto';
import { DEFAULT_SETTINGS, normalizePosCounter } from '../constants/settings.constants';
import { TenantTimezoneService } from '../../../../common/helpers/tenant-timezone.service';
import {
  forgetReportsConfig, hiddenFiguresFor, isOwnerRole, normalizeReportsConfig, readReportsConfig,
} from '../../../../common/helpers/reports-config.helper';

const RECEIPT_DEFAULTS = {
  paper: '80', style: 'modern', font: 'normal', accent: '#0f766e', watermark: 'both',
  showLogo: true, showAddress: true, showPhone: true, showTaxNumber: true, showCustomer: true, showCashier: true,
  showItemNumbers: true, showItemDetails: true, showSavings: true, showKhata: true, showBarcode: true,
  showPayQr: true, showReviewQr: true, showAmountInWords: true, showSignature: true,
  tagline: '', footer: '', terms: '', social: '', thanks: 'Shukriya! Phir tashreef laiye.', copies: 1, autoPrint: false,
  payAccounts: [], payWhen: 'due', payNote: '',
  a4Title: 'INVOICE', a4Layout: 'band', showStatus: true, showSku: false, showCustomerDetails: true, dueDays: 0,
  backText: '', backPrint: 'none', thermalPattern: false,
} as Record<string, unknown>;
const RECEIPT_KEYS = new Set(Object.keys(RECEIPT_DEFAULTS));

@Injectable()
export class SettingsCoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tzService: TenantTimezoneService,
  ) {}

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
    // Integration secrets never leave the server; the page only needs to know one is set.
    if (safeSettings.integrations && typeof safeSettings.integrations === 'object') {
      safeSettings.integrations = Object.fromEntries(Object.entries(safeSettings.integrations as Record<string, any>).map(([k, v]) => [k, {
        ...v,
        credentials: v?.credentials ? Object.fromEntries(Object.keys(v.credentials).map((c) => [c, '••••••'])) : undefined,
      }]));
    }

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

  /** What the POS needs to follow the shop's rules; readable by every staff member. */
  async counterRules(user: AuthenticatedUser) {
    const s = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: {
        defaultPaymentMethod: true, allowNegativeStock: true, confirmBeforeCheckout: true, requireCustomerForSale: true,
        allowDiscount: true, maxDiscountPercent: true, roundTotal: true, allowCredit: true,
        requirePinForVoid: true, requirePinForDiscount: true, requirePinForRefund: true, managerPin: true,
        enableLoyalty: true, loyaltyPointsPerRupee: true, loyaltyRedemptionRate: true,
        loyaltyMinRedeem: true, loyaltyMaxRedeemPercent: true,
        serviceChargePct: true, exchangeDays: true, receiptConfig: true, manufacturingEnabled: true,
      },
    });
    if (!s) return null;
    const { managerPin, receiptConfig, ...rules } = s;
    return { ...rules, hasManagerPin: !!managerPin, posCounter: normalizePosCounter((receiptConfig as Record<string, unknown> | null)?.posCounter) };
  }

  /** The POS counter screen setup (layout and parts shown), with defaults filled in. */
  async getPosCounter(user: AuthenticatedUser) {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { receiptConfig: true } });
    return normalizePosCounter((s?.receiptConfig as Record<string, unknown> | null)?.posCounter);
  }

  /** Saves part of the POS counter setup inside receiptConfig, leaving the receipt design as it is. */
  async updatePosCounter(user: AuthenticatedUser, dto: UpdatePosCounterDto) {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { receiptConfig: true } });
    const stored = (s?.receiptConfig && typeof s.receiptConfig === 'object' ? s.receiptConfig : {}) as Record<string, unknown>;
    const posCounter = normalizePosCounter({ ...normalizePosCounter(stored.posCounter), ...JSON.parse(JSON.stringify(dto)) });
    const receiptConfig = JSON.parse(JSON.stringify({ ...stored, posCounter }));
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, receiptConfig },
      update: { receiptConfig },
    });
    return posCounter;
  }

  /** Partial update — updates ONLY provided fields, syncs to Tenant model too */
  async update(user: AuthenticatedUser, dto: UpdateSettingsDto) {
    const data: any = { ...dto };
    // The owner PIN changes only through settings/security/set-pin, which checks the current PIN.
    delete data.managerPin;

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

    /* Timezone badla to yaad kiya hua fauran bhool jayein — warna
       dukaan-daar settings me waqt theek karta hai aur dashboard das
       minute tak purane waqt par hi report banata rehta hai. */
    /* Timezone ya karobari din ka ghanta badla — yaad kiya hua bhool
       jayein, warna agle 10 minute tak report purane hisab se banti rahegi */
    if (dto.timezone !== undefined || dto.businessDayStartHour !== undefined) {
      this.tzService.forget(user.tenantId);
    }

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

  /**
   * The receipt design: built-in defaults, then the older receipt columns
   * (paper size, header, footer, show flags), then the saved design.
   */
  async getReceiptConfig(user: AuthenticatedUser) {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
    const legacy: Record<string, unknown> = s ? {
      paper: s.receiptSize === 'THERMAL_58MM' ? '58' : s.receiptSize?.startsWith('A4') ? 'A4' : '80',
      tagline: s.receiptHeader ?? '',
      footer: s.receiptFooter ?? '',
      showLogo: s.receiptShowLogo,
      showCustomer: s.receiptShowCustomer,
      showBarcode: s.receiptShowBarcode || undefined,
      autoPrint: s.autoPrintReceipt,
      copies: s.printCopiesCount,
    } : {};
    const stored = (s?.receiptConfig && typeof s.receiptConfig === 'object' ? s.receiptConfig : {}) as Record<string, unknown>;
    const known = Object.fromEntries(Object.entries(stored).filter(([k]) => RECEIPT_KEYS.has(k)));
    const clean = Object.fromEntries(Object.entries({ ...legacy, ...known }).filter(([, v]) => v !== undefined && v !== null));
    return { ...RECEIPT_DEFAULTS, ...clean };
  }

  /** Saves part of the design and keeps the older columns in step. */
  async updateReceiptConfig(user: AuthenticatedUser, dto: UpdateReceiptConfigDto) {
    // Plain JSON (class instances from validation are not JSON values for Prisma).
    const next = JSON.parse(JSON.stringify({ ...(await this.getReceiptConfig(user)), ...dto })) as Record<string, any>;
    // The POS counter setup shares this JSON field; keep it.
    const prev = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { receiptConfig: true } });
    const posCounter = (prev?.receiptConfig as Record<string, unknown> | null)?.posCounter;
    if (posCounter !== undefined) next.posCounter = posCounter;
    const mirror = {
      receiptSize: next.paper === '58' ? 'THERMAL_58MM' : next.paper === 'A4' ? 'A4_BASIC' : 'THERMAL_80MM',
      receiptHeader: next.tagline || null,
      receiptFooter: next.footer || null,
      receiptShowLogo: !!next.showLogo,
      receiptShowCustomer: !!next.showCustomer,
      receiptShowBarcode: !!next.showBarcode,
      autoPrintReceipt: !!next.autoPrint,
      printCopiesCount: Number(next.copies) || 1,
    };
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, receiptConfig: next, ...mirror },
      update: { receiptConfig: next, ...mirror },
    });
    const { posCounter: _kept, ...design } = next;
    return design;
  }

  /** Design plus shop details for printing; readable by every staff member. */
  async receiptSetup(user: AuthenticatedUser) {
    const [design, s, tenant] = await Promise.all([
      this.getReceiptConfig(user),
      this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId } }),
      this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true, phone: true, address: true } }),
    ]);
    const address = [s?.shopAddress ?? tenant?.address, s?.shopCity].filter(Boolean).join(', ');
    return {
      design,
      shop: {
        name: s?.shopName || tenant?.name || 'Dukaan',
        legalName: s?.legalName ?? null,
        address: address || null,
        phone: s?.shopPhone || tenant?.phone || null,
        whatsapp: s?.shopWhatsapp ?? null,
        email: s?.shopEmail ?? null,
        taxNumber: s?.enableTax ? s?.taxNumber ?? null : null,
        taxLabel: s?.taxLabel ?? null,
        logoUrl: s?.logoUrl ?? null,
      },
    };
  }

  /** Settings → Reports, with defaults filled in. */
  async getReportsConfig(user: AuthenticatedUser) {
    const s = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId }, select: { reportsConfig: true } });
    return normalizeReportsConfig(s?.reportsConfig);
  }

  /**
   * Saves part of Settings → Reports. Which figures staff may see in reports
   * is the owner's call, so only the owner can change `staffFigures`.
   */
  async updateReportsConfig(user: AuthenticatedUser, dto: UpdateReportsConfigDto) {
    const current = await this.getReportsConfig(user);
    if (dto.staffFigures && !isOwnerRole(user.role)) {
      const same = dto.staffFigures.length === current.staffFigures.length && dto.staffFigures.every((f) => current.staffFigures.includes(f as never));
      if (!same) throw new ForbiddenException('Staff ko kaun se figures dikhein, ye sirf malik badal sakta hai');
    }
    let recipientIds = dto.summary?.recipientIds !== undefined ? dto.summary.recipientIds : current.summary.recipientIds;
    if (recipientIds) {
      // Keep only people of this shop.
      const users = await this.prisma.user.findMany({ where: { tenantId: user.tenantId, id: { in: recipientIds } }, select: { id: true } });
      const known = new Set(users.map((u) => u.id));
      recipientIds = recipientIds.filter((id) => known.has(id));
    }
    const next = normalizeReportsConfig({
      ...current,
      ...dto,
      summary: { ...current.summary, ...(dto.summary ?? {}), recipientIds },
    });
    const json = JSON.parse(JSON.stringify(next));
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, reportsConfig: json },
      update: { reportsConfig: json },
    });
    forgetReportsConfig(user.tenantId);
    return next;
  }

  /** What report pages need for the current user: default period and comparison, round-off, hidden figures. */
  async reportPrefs(user: AuthenticatedUser) {
    const c = await readReportsConfig(this.prisma, user.tenantId);
    return {
      fiscalYearStartMonth: c.fiscalYearStartMonth,
      defaultPeriod: c.defaultPeriod,
      compareDefault: c.compareDefault,
      roundOff: c.roundOff,
      creditProfit: c.creditProfit,
      hidden: hiddenFiguresFor(user.role, c),
    };
  }
}

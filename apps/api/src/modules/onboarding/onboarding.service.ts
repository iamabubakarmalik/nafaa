import {
  BadRequestException, ForbiddenException, Inject, Injectable,
  NotFoundException, forwardRef,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateStep1Dto } from './dto/update-step1.dto';
import { UpdateStep2Dto } from './dto/update-step2.dto';
import { UpdateStep3Dto } from './dto/update-step3.dto';
import { UpdateStep4Dto } from './dto/update-step4.dto';
import { UpdateStep5Dto } from './dto/update-step5.dto';
import { UpdateStep6Dto } from './dto/update-step6.dto';
import {
  BUSINESS_TYPES, BUSINESS_SIZES, PAKISTAN_CITIES, PAKISTAN_PROVINCES,
  PAYMENT_METHODS_LIST, PREFERRED_LANGUAGES, RECEIPT_TEMPLATES,
  SUGGESTED_CATEGORIES, TOTAL_STEPS, WORKING_DAYS,
} from './constants/onboarding.constants';
import {
  BUSINESS_TEMPLATES, BUSINESS_TYPE_OPTIONS, getBusinessTemplate,
} from './templates/business-templates';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /** Get static options + business templates */
  getOptions() {
    return {
      cities: PAKISTAN_CITIES,
      provinces: PAKISTAN_PROVINCES,
      businessTypes: BUSINESS_TYPE_OPTIONS, // Now uses expanded templates
      businessTypesLegacy: BUSINESS_TYPES,  // Keep for backward compat
      businessSizes: BUSINESS_SIZES,
      languages: PREFERRED_LANGUAGES,
      receiptTemplates: RECEIPT_TEMPLATES,
      paymentMethods: PAYMENT_METHODS_LIST,
      workingDays: WORKING_DAYS,
      suggestedCategories: SUGGESTED_CATEGORIES,
      businessTemplates: BUSINESS_TEMPLATES, // Full templates
      totalSteps: TOTAL_STEPS,
    };
  }

  async getOrCreate(user: AuthenticatedUser) {
    let progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (!progress) {
      progress = await this.prisma.onboardingProgress.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          currentStep: 1,
        },
      });
    }

    return this.enrich(progress);
  }

  async create(tenantId: string, userId: string) {
    const existing = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;

    return this.prisma.onboardingProgress.create({
      data: { tenantId, userId, currentStep: 1 },
    });
  }

  /**
   * STEP 1 — Business Info + AUTO-CONFIGURE TENANT
   * This is the magic — when user selects business type,
   * we auto-apply template to tenant
   */
  async updateStep1(user: AuthenticatedUser, dto: UpdateStep1Dto) {
    await this.ensureNotCompleted(user.tenantId);

    // Normalize legacy values
    const normalizedType = this.normalizeBusinessType(dto.businessType);
    const template = getBusinessTemplate(normalizedType);

    // Auto-configure tenant with business defaults
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        businessType: normalizedType,
        businessFeatures: template.features as any,
        defaultUnit: template.defaultUnit,
      },
    });

    // Sync to TenantSettings (so user can see/edit in settings page later)
    const settingsData: any = {
      // Business profile
      businessType: normalizedType,
      shopCity: dto.city,
      shopProvince: dto.province || null,
      // Industry-aware feature defaults
      trackExpiry: template.features.expiry,
      enableTax: false,
      // Smart defaults per industry
      receiptSize: this.getDefaultReceiptSize(normalizedType),
      defaultLowStockAlert: this.getDefaultLowStock(normalizedType),
    };

    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, ...settingsData },
      update: settingsData,
    });

    return this.updateAndAdvance(user.tenantId, 1, {
      businessType: dto.businessType,
      businessSize: dto.businessSize,
      city: dto.city,
      province: dto.province,
    });
  }

  async updateStep2(user: AuthenticatedUser, dto: UpdateStep2Dto) {
    await this.ensureNotCompleted(user.tenantId);

    const updates: any = {};
    if (dto.avatarUrl !== undefined) updates.avatarUrl = dto.avatarUrl;
    if (dto.whatsappNumber !== undefined) updates.phone = dto.whatsappNumber;
    if (Object.keys(updates).length > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: updates });
    }

    // Sync to TenantSettings — language + whatsapp
    const settingsData: any = {};
    if (dto.preferredLanguage) settingsData.language = dto.preferredLanguage;
    if (dto.whatsappNumber) settingsData.shopWhatsapp = dto.whatsappNumber;

    if (Object.keys(settingsData).length > 0) {
      await this.prisma.tenantSettings.upsert({
        where: { tenantId: user.tenantId },
        create: { tenantId: user.tenantId, ...settingsData },
        update: settingsData,
      });
    }

    return this.updateAndAdvance(user.tenantId, 2, dto);
  }

  async updateStep3(user: AuthenticatedUser, dto: UpdateStep3Dto) {
    await this.ensureNotCompleted(user.tenantId);

    if (dto.shopAddress !== undefined) {
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { address: dto.shopAddress },
      });
    }

    // Sync to TenantSettings — address, hours, working days, tax number
    const settingsData: any = {};
    if (dto.shopAddress !== undefined) settingsData.shopAddress = dto.shopAddress;
    if (dto.openTime) settingsData.openTime = dto.openTime;
    if (dto.closeTime) settingsData.closeTime = dto.closeTime;
    if (dto.workingDays && dto.workingDays.length > 0) {
      settingsData.workingDays = dto.workingDays;
    }
    if (dto.taxNumber !== undefined) settingsData.taxNumber = dto.taxNumber;

    if (Object.keys(settingsData).length > 0) {
      await this.prisma.tenantSettings.upsert({
        where: { tenantId: user.tenantId },
        create: { tenantId: user.tenantId, ...settingsData },
        update: settingsData,
      });
    }

    return this.updateAndAdvance(user.tenantId, 3, dto);
  }

  async updateStep4(user: AuthenticatedUser, dto: UpdateStep4Dto) {
    await this.ensureNotCompleted(user.tenantId);

    // Sync to TenantSettings — receipt template, low stock alert, default payment
    const settingsData: any = {};
    if (dto.receiptTemplate) settingsData.receiptSize = dto.receiptTemplate;
    if (dto.lowStockThreshold !== undefined) {
      settingsData.defaultLowStockAlert = dto.lowStockThreshold;
    }
    if (dto.paymentMethods && dto.paymentMethods.length > 0) {
      // Set default payment method to first one (usually CASH)
      settingsData.defaultPaymentMethod = dto.paymentMethods[0];
    }

    if (Object.keys(settingsData).length > 0) {
      await this.prisma.tenantSettings.upsert({
        where: { tenantId: user.tenantId },
        create: { tenantId: user.tenantId, ...settingsData },
        update: settingsData,
      });
    }

    if (dto.enabledCategories && dto.enabledCategories.length > 0) {
      const existing = await this.prisma.category.findMany({
        where: { tenantId: user.tenantId },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));

      const toCreate = dto.enabledCategories.filter(
        (name) => !existingNames.has(name.toLowerCase()),
      );

      const palette = ['#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#f59e0b', '#dc2626', '#0891b2', '#ea580c'];

      for (const [i, name] of toCreate.entries()) {
        try {
          await this.prisma.category.create({
            data: {
              tenantId: user.tenantId,
              name,
              color: palette[i % palette.length]!,
            },
          });
        } catch {}
      }
    }

    return this.updateAndAdvance(user.tenantId, 4, dto);
  }

  async updateStep5(user: AuthenticatedUser, dto: UpdateStep5Dto) {
    await this.ensureNotCompleted(user.tenantId);

    // Get tenant to use default unit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { defaultUnit: true },
    });
    const defaultUnit = tenant?.defaultUnit || 'pcs';

    let createdCount = 0;
    if (dto.products && dto.products.length > 0) {
      for (const p of dto.products) {
        try {
          let categoryId: string | undefined;
          if (p.category) {
            const cat = await this.prisma.category.findFirst({
              where: { tenantId: user.tenantId, name: p.category },
            });
            if (cat) categoryId = cat.id;
          }

          await this.prisma.product.create({
            data: {
              tenantId: user.tenantId,
              name: p.name,
              price: p.price,
              costPrice: p.costPrice ?? 0,
              stock: p.stock ?? 0,
              unit: p.unit ?? defaultUnit,
              categoryId,
              lowStockAlert: 10,
            },
          });
          createdCount++;
        } catch (e) {
          console.error('Quick product creation failed:', e);
        }
      }
    }

    return this.updateAndAdvance(user.tenantId, 5, {
      productsAddedCount: createdCount,
    });
  }

  async updateStep6(user: AuthenticatedUser, dto: UpdateStep6Dto) {
    await this.ensureNotCompleted(user.tenantId);

    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can add team members');
    }

    let teamCount = 0;
    if (dto.teamMembers && dto.teamMembers.length > 0) {
      for (const member of dto.teamMembers) {
        try {
          const exists = await this.prisma.user.findUnique({
            where: { email: member.email.toLowerCase() },
          });
          if (exists) continue;

          const passwordHash = await hashPassword(member.password);
          await this.prisma.user.create({
            data: {
              tenantId: user.tenantId,
              fullName: member.fullName,
              email: member.email.toLowerCase(),
              passwordHash,
              role: member.role as UserRole,
            },
          });
          teamCount++;
        } catch (e) {
          console.error('Team member creation failed:', e);
        }
      }
    }

    return this.updateAndAdvance(user.tenantId, 6, {
      teamMembersAdded: teamCount,
      wantsTutorial: dto.wantsTutorial ?? true,
    });
  }

  async skipStep(user: AuthenticatedUser, step: number) {
    await this.ensureNotCompleted(user.tenantId);

    if (![5, 6].includes(step)) {
      throw new BadRequestException('Ye step skip nahi ho sakti');
    }

    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId: user.tenantId },
    });
    if (!progress) throw new NotFoundException('Onboarding not started');

    const completedSteps = Array.from(new Set([...progress.completedSteps, step]));
    const nextStep = step + 1 > TOTAL_STEPS ? TOTAL_STEPS : step + 1;

    return this.enrich(
      await this.prisma.onboardingProgress.update({
        where: { tenantId: user.tenantId },
        data: { completedSteps, currentStep: nextStep },
      }),
    );
  }

  async complete(user: AuthenticatedUser) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId: user.tenantId },
    });
    if (!progress) throw new NotFoundException('Onboarding not started');

    if (progress.isCompleted) {
      return this.enrich(progress);
    }

    const updated = await this.prisma.onboardingProgress.update({
      where: { tenantId: user.tenantId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedSteps: [1, 2, 3, 4, 5, 6],
        currentStep: TOTAL_STEPS,
      },
    });

    // Send celebration email (fire-and-forget)
    this.sendCompletionEmail(user, updated).catch(() => {});

    return this.enrich(updated);
  }

  /**
   * Send onboarding complete celebration email
   */
  private async sendCompletionEmail(user: AuthenticatedUser, progress: any) {
    try {
      const [tenant, userRecord] = await Promise.all([
        this.prisma.tenant.findUnique({
          where: { id: user.tenantId },
          select: { name: true, businessType: true },
        }),
        this.prisma.user.findUnique({
          where: { id: user.id },
          select: { fullName: true, email: true },
        }),
      ]);

      if (!tenant || !userRecord) return;

      await this.authService.sendOnboardingCompleteEmail({
        tenantId: user.tenantId,
        tenantName: tenant.name,
        user: { fullName: userRecord.fullName, email: userRecord.email },
        businessType: tenant.businessType || 'GENERAL',
        categoriesCount: progress.enabledCategories?.length || 0,
        paymentMethodsCount: progress.paymentMethods?.length || 0,
        productsCount: progress.productsAddedCount || 0,
        teamCount: progress.teamMembersAdded || 0,
      });
    } catch (e: any) {
      console.error('Onboarding completion email failed:', e.message);
    }
  }

  /**
   * Get default receipt size based on business type
   */
  private getDefaultReceiptSize(businessType: string): string {
    const thermalTypes = ['GROCERY', 'PHARMACY', 'BAKERY', 'RESTAURANT', 'COSMETICS'];
    if (thermalTypes.includes(businessType)) return 'THERMAL_58MM';
    return 'A4_BASIC';
  }

  /**
   * Get default low stock threshold based on business type
   */
  private getDefaultLowStock(businessType: string): number {
    const defaults: Record<string, number> = {
      CARPET: 2,       // Rolls are bulky
      MOBILE: 5,       // High-value items
      PHARMACY: 20,    // Strips
      GROCERY: 10,
      RESTAURANT: 20,
      CLOTHING: 5,
      HARDWARE: 10,
      BAKERY: 15,
      GENERAL: 10,
    };
    return defaults[businessType] ?? 10;
  }

  async reset(user: AuthenticatedUser) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can reset onboarding');
    }
    return this.enrich(
      await this.prisma.onboardingProgress.update({
        where: { tenantId: user.tenantId },
        data: {
          currentStep: 1,
          completedSteps: [],
          isCompleted: false,
          isSkipped: false,
          completedAt: null,
        },
      }),
    );
  }

  /**
   * Get current business config for tenant
   * Used by frontend hook useBusinessFeatures()
   */
  async getBusinessConfig(user: AuthenticatedUser) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        businessType: true,
        businessFeatures: true,
        defaultUnit: true,
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    // Always resolve to a valid template — fallback to GENERAL
    const template =
      (tenant.businessType && getBusinessTemplate(tenant.businessType)) ||
      getBusinessTemplate('GENERAL');

    // Defensive: ensure all template fields exist
    const safeTemplate = {
      label: template?.label || 'General Retail',
      emoji: template?.emoji || '🏬',
      description: template?.description || 'Configure your business type',
      quickUnits: template?.quickUnits || ['pcs', 'kg', 'meter'],
      suggestedCategories: template?.suggestedCategories || [],
      highlights: template?.highlights || [],
    };

    const features =
      (tenant.businessFeatures as any) ||
      template?.features ||
      {};

    return {
      businessType: tenant.businessType || 'GENERAL',
      defaultUnit: tenant.defaultUnit || template?.defaultUnit || 'pcs',
      features,
      template: safeTemplate,
    };
  }

  /**
   * Update business features (toggle individual features)
   */
  async updateBusinessFeatures(
    user: AuthenticatedUser,
    features: Record<string, boolean>,
  ) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can update business features');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { businessFeatures: true },
    });

    const current = (tenant?.businessFeatures as any) || {};
    const updated = { ...current, ...features };

    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: { businessFeatures: updated },
    });

    return { features: updated };
  }

  /**
   * Change business type (re-applies template defaults)
   */
  async changeBusinessType(user: AuthenticatedUser, newType: string) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can change business type');
    }

    const normalizedType = this.normalizeBusinessType(newType);
    const template = getBusinessTemplate(normalizedType);

    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        businessType: normalizedType,
        businessFeatures: template.features as any,
        defaultUnit: template.defaultUnit,
      },
    });

    return this.getBusinessConfig(user);
  }

  // ===== Helpers =====
  private normalizeBusinessType(type: string): string {
    const mapping: Record<string, string> = {
      KIRYANA: 'GROCERY',
      MOBILE_SHOP: 'MOBILE',
      OTHER: 'GENERAL',
    };
    return mapping[type] || type;
  }

  private async ensureNotCompleted(tenantId: string) {
    const p = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId },
      select: { isCompleted: true },
    });
    if (p?.isCompleted) {
      throw new BadRequestException('Onboarding already completed');
    }
  }

  private async updateAndAdvance(tenantId: string, step: number, data: any) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId },
    });
    if (!progress) throw new NotFoundException('Onboarding not started');

    const completedSteps = Array.from(new Set([...progress.completedSteps, step]));
    const nextStep = step + 1 > TOTAL_STEPS ? TOTAL_STEPS : step + 1;
    const willComplete = step === TOTAL_STEPS;

    const updated = await this.prisma.onboardingProgress.update({
      where: { tenantId },
      data: {
        ...data,
        completedSteps,
        currentStep: willComplete ? TOTAL_STEPS : nextStep,
        isCompleted: willComplete ? true : false,
        completedAt: willComplete ? new Date() : null,
      },
    });

    // If this was step 6 (final step), send celebration email
    if (willComplete) {
      const owner = await this.prisma.user.findFirst({
        where: { tenantId, role: 'OWNER' },
        select: { id: true, tenantId: true, email: true, role: true, shopId: true, permissions: true },
      });
      if (owner) {
        this.sendCompletionEmail(
          {
            id: owner.id,
            sub: owner.id,
            tenantId: owner.tenantId,
            email: owner.email,
            role: owner.role,
            shopId: owner.shopId,
            permissions: owner.permissions ?? [],
          },
          updated,
        ).catch(() => {});
      }
    }

    return this.enrich(updated);
  }

  private enrich(progress: any) {
    return {
      ...progress,
      progressPercent: Math.round(
        (progress.completedSteps.length / TOTAL_STEPS) * 100,
      ),
      totalSteps: TOTAL_STEPS,
    };
  }
}

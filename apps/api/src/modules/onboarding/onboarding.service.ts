import {
  BadRequestException, ForbiddenException, Inject, Injectable,
  Logger, NotFoundException, forwardRef,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UpdateStep1Dto } from './dto/update-step1.dto';
import { UpdateStep2Dto } from './dto/update-step2.dto';
import { UpdateStep3Dto } from './dto/update-step3.dto';
import { UpdateStep4Dto } from './dto/update-step4.dto';
import { UpdateStep5Dto } from './dto/update-step5.dto';
import { UpdateStep6Dto } from './dto/update-step6.dto';
import { UpdateStep7Dto } from './dto/update-step7.dto';
import { UpdateStep8Dto } from './dto/update-step8.dto';
import {
  BUSINESS_SIZES, CURRENCIES, PAYMENT_METHODS_LIST, PAKISTAN_PROVINCES,
  PREFERRED_LANGUAGES, RECEIPT_TEMPLATES, STEP_LABELS, TEAM_ROLES,
  TOTAL_STEPS, WORKING_DAYS,
} from './constants/onboarding.constants';
import { PAKISTAN_CITIES, getCityInfo, getMajorCities } from './constants/location-data';
import {
  BUSINESS_TEMPLATES, BUSINESS_TYPE_OPTIONS, getBusinessTemplate,
} from './templates/business-templates';
import { LocationDetectorService } from './services/location-detector.service';
import { SampleDataService } from './services/sample-data.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationDetector: LocationDetectorService,
    private readonly sampleData: SampleDataService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  /** Get all static options for onboarding UI */
  getOptions() {
    return {
      cities: PAKISTAN_CITIES,
      majorCities: getMajorCities(),
      provinces: PAKISTAN_PROVINCES,
      businessTypes: BUSINESS_TYPE_OPTIONS,
      businessTemplates: BUSINESS_TEMPLATES,
      businessSizes: BUSINESS_SIZES,
      languages: PREFERRED_LANGUAGES,
      receiptTemplates: RECEIPT_TEMPLATES,
      paymentMethods: PAYMENT_METHODS_LIST,
      workingDays: WORKING_DAYS,
      currencies: CURRENCIES,
      teamRoles: TEAM_ROLES,
      stepLabels: STEP_LABELS,
      totalSteps: TOTAL_STEPS,
    };
  }

  /** Get or create progress (auto-detects location from IP on first call) */
  async getOrCreate(user: AuthenticatedUser, ipAddress?: string) {
    let progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (!progress) {
      // Auto-detect location from IP on first create
      let detected = {
        city: null as string | null,
        province: null as string | null,
        country: 'Pakistan',
        timezone: 'Asia/Karachi',
      };

      if (ipAddress) {
        detected = await this.locationDetector.detectFromIp(ipAddress) as any;
      }

      progress = await this.prisma.onboardingProgress.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          currentStep: 1,
          detectedCity: detected.city,
          detectedProvince: detected.province,
          detectedCountry: detected.country,
          detectedIp: ipAddress,
          detectedTimezone: detected.timezone,
          // Pre-fill city/province from detection
          city: detected.city,
          province: detected.province,
        },
      });
    }

    return this.enrich(progress);
  }

  async create(tenantId: string, userId: string, ipAddress?: string) {
    const existing = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;

    let detected = { city: null as string | null, province: null as string | null, country: 'Pakistan', timezone: 'Asia/Karachi' };
    if (ipAddress) {
      detected = await this.locationDetector.detectFromIp(ipAddress) as any;
    }

    return this.prisma.onboardingProgress.create({
      data: {
        tenantId, userId, currentStep: 1,
        detectedCity: detected.city, detectedProvince: detected.province,
        detectedCountry: detected.country, detectedIp: ipAddress,
        detectedTimezone: detected.timezone,
        city: detected.city, province: detected.province,
      },
    });
  }

  /** STEP 1 — Business Type + auto-config tenant */
  async updateStep1(user: AuthenticatedUser, dto: UpdateStep1Dto) {
    await this.ensureNotCompleted(user.tenantId);

    const template = getBusinessTemplate(dto.businessType);
    const cityInfo = getCityInfo(dto.city);

    // Auto-configure tenant
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        businessType: dto.businessType,
        businessFeatures: template.features as any,
        defaultUnit: template.defaultUnit,
        currency: template.currency,
      },
    });

    // Sync settings with smart industry-specific defaults
    const settingsData: any = {
      businessType: dto.businessType,
      shopCity: dto.city,
      shopProvince: dto.province || cityInfo?.provinceLabel || null,
      currency: template.currency,
      trackExpiry: template.features.expiry,
      receiptSize: template.receiptSize,
      defaultLowStockAlert: template.minStock,
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
      province: dto.province || cityInfo?.province,
    });
  }

  /** STEP 2 — Owner Profile */
  async updateStep2(user: AuthenticatedUser, dto: UpdateStep2Dto) {
    await this.ensureNotCompleted(user.tenantId);

    const userUpdates: any = {};
    if (dto.avatarUrl !== undefined) userUpdates.avatarUrl = dto.avatarUrl;
    if (dto.whatsappNumber !== undefined) userUpdates.phone = dto.whatsappNumber;
    if (Object.keys(userUpdates).length > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: userUpdates });
    }

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

    return this.updateAndAdvance(user.tenantId, 2, {
      avatarUrl: dto.avatarUrl,
      whatsappNumber: dto.whatsappNumber,
      cnic: dto.cnic,
      preferredLanguage: dto.preferredLanguage,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
    });
  }

  /** STEP 3 — Shop Details */
  async updateStep3(user: AuthenticatedUser, dto: UpdateStep3Dto) {
    await this.ensureNotCompleted(user.tenantId);

    if (dto.shopAddress !== undefined) {
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { address: dto.shopAddress },
      });
    }

    const settingsData: any = {};
    if (dto.shopAddress !== undefined) settingsData.shopAddress = dto.shopAddress;
    if (dto.openTime) settingsData.openTime = dto.openTime;
    if (dto.closeTime) settingsData.closeTime = dto.closeTime;
    if (dto.workingDays?.length) settingsData.workingDays = dto.workingDays;
    if (dto.taxNumber !== undefined) settingsData.taxNumber = dto.taxNumber;

    if (Object.keys(settingsData).length > 0) {
      await this.prisma.tenantSettings.upsert({
        where: { tenantId: user.tenantId },
        create: { tenantId: user.tenantId, ...settingsData },
        update: settingsData,
      });
    }

    // Also update main shop's address
    if (dto.shopAddress) {
      const mainShop = await this.prisma.shop.findFirst({
        where: { tenantId: user.tenantId, isMain: true },
      });
      if (mainShop) {
        await this.prisma.shop.update({
          where: { id: mainShop.id },
          data: { address: dto.shopAddress },
        });
      }
    }

    return this.updateAndAdvance(user.tenantId, 3, dto);
  }

  /** STEP 4 — Preferences (categories, payment, receipt, currency, tax) */
  async updateStep4(user: AuthenticatedUser, dto: UpdateStep4Dto) {
    await this.ensureNotCompleted(user.tenantId);

    const settingsData: any = {};
    if (dto.receiptTemplate) settingsData.receiptSize = dto.receiptTemplate;
    if (dto.lowStockThreshold !== undefined) settingsData.defaultLowStockAlert = dto.lowStockThreshold;
    if (dto.paymentMethods?.length) settingsData.defaultPaymentMethod = dto.paymentMethods[0];
    if (dto.currency) settingsData.currency = dto.currency;
    if (dto.enableTax !== undefined) settingsData.enableTax = dto.enableTax;
    if (dto.taxRate !== undefined) settingsData.taxRate = dto.taxRate;

    if (Object.keys(settingsData).length > 0) {
      await this.prisma.tenantSettings.upsert({
        where: { tenantId: user.tenantId },
        create: { tenantId: user.tenantId, ...settingsData },
        update: settingsData,
      });
    }

    if (dto.currency) {
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { currency: dto.currency },
      });
    }

    // Create categories
    if (dto.enabledCategories?.length) {
      const existing = await this.prisma.category.findMany({
        where: { tenantId: user.tenantId },
        select: { name: true },
      });
      const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
      const toCreate = dto.enabledCategories.filter((n) => !existingNames.has(n.toLowerCase()));

      const palette = ['#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#f59e0b', '#dc2626', '#0891b2', '#ea580c'];
      for (const [i, name] of toCreate.entries()) {
        try {
          await this.prisma.category.create({
            data: { tenantId: user.tenantId, name, color: palette[i % palette.length]! },
          });
        } catch {}
      }
    }

    return this.updateAndAdvance(user.tenantId, 4, dto);
  }

  /** STEP 5 — Feature toggles */
  async updateStep5(user: AuthenticatedUser, dto: UpdateStep5Dto) {
    await this.ensureNotCompleted(user.tenantId);

    if (dto.enabledFeatures) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { businessFeatures: true },
      });
      const current = (tenant?.businessFeatures as any) || {};
      const merged = { ...current, ...dto.enabledFeatures };

      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { businessFeatures: merged },
      });
    }

    return this.updateAndAdvance(user.tenantId, 5, {
      enabledFeatures: dto.enabledFeatures,
    });
  }

  /** STEP 6 — Products (custom OR sample data) */
  async updateStep6(user: AuthenticatedUser, dto: UpdateStep6Dto) {
    await this.ensureNotCompleted(user.tenantId);

    let createdCount = 0;
    let usedSampleData = false;

    // Option A: Use sample data
    if (dto.useSampleData) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { businessType: true },
      });
      if (tenant?.businessType) {
        const result = await this.sampleData.createSamples(user.tenantId, tenant.businessType);
        createdCount = result.productsCreated;
        usedSampleData = true;
      }
    }

    // Option B: User-added custom products
    if (dto.products?.length) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { defaultUnit: true },
      });
      const defaultUnit = tenant?.defaultUnit || 'pcs';

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
              barcode: p.barcode,
              categoryId,
              lowStockAlert: 10,
            },
          });
          createdCount++;
        } catch (e: any) {
          this.logger.warn(`Product create skipped: ${e.message}`);
        }
      }
    }

    return this.updateAndAdvance(user.tenantId, 6, {
      productsAddedCount: createdCount,
      usedSampleData,
    });
  }

  /** STEP 7 — Team Members */
  async updateStep7(user: AuthenticatedUser, dto: UpdateStep7Dto) {
    await this.ensureNotCompleted(user.tenantId);

    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can add team members');
    }

    let teamCount = 0;
    if (dto.teamMembers?.length) {
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
              phone: member.phone,
              passwordHash,
              role: member.role as UserRole,
            },
          });
          teamCount++;
        } catch (e: any) {
          this.logger.warn(`Team member create skipped: ${e.message}`);
        }
      }
    }

    return this.updateAndAdvance(user.tenantId, 7, {
      teamMembersAdded: teamCount,
    });
  }

  /** STEP 8 — Finish & Launch */
  async updateStep8(user: AuthenticatedUser, dto: UpdateStep8Dto) {
    await this.ensureNotCompleted(user.tenantId);

    return this.updateAndAdvance(user.tenantId, 8, {
      wantsTutorial: dto.wantsTutorial ?? true,
      subscribedToTips: dto.subscribedToTips ?? true,
    });
  }

  /** Skip step (only allowed for 5, 6, 7) */
  async skipStep(user: AuthenticatedUser, step: number) {
    await this.ensureNotCompleted(user.tenantId);

    if (![5, 6, 7].includes(step)) {
      throw new BadRequestException('Ye step skip nahi ho sakti');
    }

    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId: user.tenantId },
    });
    if (!progress) throw new NotFoundException('Onboarding not started');

    const completedSteps = Array.from(new Set([...progress.completedSteps, step]));
    const nextStep = Math.min(step + 1, TOTAL_STEPS);

    return this.enrich(
      await this.prisma.onboardingProgress.update({
        where: { tenantId: user.tenantId },
        data: {
          completedSteps,
          currentStep: nextStep,
          skipCount: { increment: 1 },
        },
      }),
    );
  }

  /** Complete onboarding */
  async complete(user: AuthenticatedUser) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId: user.tenantId },
    });
    if (!progress) throw new NotFoundException('Onboarding not started');
    if (progress.isCompleted) return this.enrich(progress);

    const updated = await this.prisma.onboardingProgress.update({
      where: { tenantId: user.tenantId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedSteps: [1, 2, 3, 4, 5, 6, 7, 8],
        currentStep: TOTAL_STEPS,
      },
    });

    this.sendCompletionEmail(user, updated).catch(() => {});
    return this.enrich(updated);
  }

  async reset(user: AuthenticatedUser) {
    if (user.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can reset onboarding');
    }
    return this.enrich(
      await this.prisma.onboardingProgress.update({
        where: { tenantId: user.tenantId },
        data: {
          currentStep: 1, completedSteps: [], isCompleted: false,
          isSkipped: false, completedAt: null, skipCount: 0,
        },
      }),
    );
  }

  /** Business config API (for frontend hook) */
  async getBusinessConfig(user: AuthenticatedUser) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { businessType: true, businessFeatures: true, defaultUnit: true, currency: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const template = getBusinessTemplate(tenant.businessType || 'GENERAL');
    return {
      businessType: tenant.businessType || 'GENERAL',
      defaultUnit: tenant.defaultUnit || template.defaultUnit,
      currency: tenant.currency || template.currency,
      features: (tenant.businessFeatures as any) || template.features,
      template: {
        label: template.label,
        labelUrdu: template.labelUrdu,
        emoji: template.emoji,
        description: template.description,
        color: template.color,
        quickUnits: template.quickUnits,
        suggestedCategories: template.suggestedCategories,
        highlights: template.highlights,
      },
    };
  }

  async updateBusinessFeatures(user: AuthenticatedUser, features: Record<string, boolean>) {
    if (user.role !== 'OWNER') throw new ForbiddenException('Only owner');

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

  async changeBusinessType(user: AuthenticatedUser, newType: string) {
    if (user.role !== 'OWNER') throw new ForbiddenException('Only owner');

    const template = getBusinessTemplate(newType);
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        businessType: newType,
        businessFeatures: template.features as any,
        defaultUnit: template.defaultUnit,
        currency: template.currency,
      },
    });
    return this.getBusinessConfig(user);
  }

  /** Analytics — total time spent */
  async recordTimeSpent(user: AuthenticatedUser, seconds: number) {
    await this.prisma.onboardingProgress.update({
      where: { tenantId: user.tenantId },
      data: { timeSpentSeconds: { increment: seconds } },
    });
  }

  // ═══ Helpers ═══

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
      this.logger.error(`Completion email failed: ${e.message}`);
    }
  }

  private async ensureNotCompleted(tenantId: string) {
    const p = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId }, select: { isCompleted: true },
    });
    if (p?.isCompleted) throw new BadRequestException('Onboarding already completed');
  }

  private async updateAndAdvance(tenantId: string, step: number, data: any) {
    const progress = await this.prisma.onboardingProgress.findUnique({ where: { tenantId } });
    if (!progress) throw new NotFoundException('Onboarding not started');

    const completedSteps = Array.from(new Set([...progress.completedSteps, step]));
    const nextStep = Math.min(step + 1, TOTAL_STEPS);
    const willComplete = step === TOTAL_STEPS;

    const updated = await this.prisma.onboardingProgress.update({
      where: { tenantId },
      data: {
        ...data,
        completedSteps,
        currentStep: willComplete ? TOTAL_STEPS : nextStep,
        isCompleted: willComplete,
        completedAt: willComplete ? new Date() : null,
      },
    });

    if (willComplete) {
      const owner = await this.prisma.user.findFirst({
        where: { tenantId, role: 'OWNER' },
        select: { id: true, tenantId: true, email: true, role: true, shopId: true, permissions: true },
      });
      if (owner) {
        this.sendCompletionEmail(
          {
            id: owner.id, sub: owner.id, tenantId: owner.tenantId,
            email: owner.email, role: owner.role, shopId: owner.shopId,
            permissions: owner.permissions ?? [],
          },
          updated,
        ).catch(() => {});
      }
    }

    return this.enrich(updated);
  }

  private enrich(progress: any) {
    const completedCount = progress.completedSteps.length;
    const percent = Math.round((completedCount / TOTAL_STEPS) * 100);
    const nextStepInfo = STEP_LABELS[progress.currentStep] || null;

    // Estimated time remaining
    const remainingSteps = TOTAL_STEPS - completedCount;
    let estimatedMinutesLeft = 0;
    for (let s = progress.currentStep; s <= TOTAL_STEPS; s++) {
      estimatedMinutesLeft += STEP_LABELS[s]?.estimatedMin || 2;
    }

    return {
      ...progress,
      progressPercent: percent,
      completedCount,
      remainingSteps,
      totalSteps: TOTAL_STEPS,
      nextStepInfo,
      estimatedMinutesLeft,
      stepLabels: STEP_LABELS,
    };
  }
}

import {
  BadRequestException, ForbiddenException, Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get static options (cities, business types, etc.) — for frontend dropdowns */
  getOptions() {
    return {
      cities: PAKISTAN_CITIES,
      provinces: PAKISTAN_PROVINCES,
      businessTypes: BUSINESS_TYPES,
      businessSizes: BUSINESS_SIZES,
      languages: PREFERRED_LANGUAGES,
      receiptTemplates: RECEIPT_TEMPLATES,
      paymentMethods: PAYMENT_METHODS_LIST,
      workingDays: WORKING_DAYS,
      suggestedCategories: SUGGESTED_CATEGORIES,
      totalSteps: TOTAL_STEPS,
    };
  }

  /** Get current progress or create if missing */
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

  /** Force-create (used after registration) */
  async create(tenantId: string, userId: string) {
    const existing = await this.prisma.onboardingProgress.findUnique({
      where: { tenantId },
    });
    if (existing) return existing;

    return this.prisma.onboardingProgress.create({
      data: { tenantId, userId, currentStep: 1 },
    });
  }

  async updateStep1(user: AuthenticatedUser, dto: UpdateStep1Dto) {
    await this.ensureNotCompleted(user.tenantId);
    return this.updateAndAdvance(user.tenantId, 1, dto);
  }

  async updateStep2(user: AuthenticatedUser, dto: UpdateStep2Dto) {
    await this.ensureNotCompleted(user.tenantId);

    // Sync avatar + phone to user record
    const updates: any = {};
    if (dto.avatarUrl !== undefined) updates.avatarUrl = dto.avatarUrl;
    if (dto.whatsappNumber !== undefined) updates.phone = dto.whatsappNumber;
    if (Object.keys(updates).length > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: updates });
    }

    return this.updateAndAdvance(user.tenantId, 2, dto);
  }

  async updateStep3(user: AuthenticatedUser, dto: UpdateStep3Dto) {
    await this.ensureNotCompleted(user.tenantId);

    // Sync address to tenant
    if (dto.shopAddress !== undefined) {
      await this.prisma.tenant.update({
        where: { id: user.tenantId },
        data: { address: dto.shopAddress },
      });
    }

    return this.updateAndAdvance(user.tenantId, 3, dto);
  }

  async updateStep4(user: AuthenticatedUser, dto: UpdateStep4Dto) {
    await this.ensureNotCompleted(user.tenantId);

    // Auto-create selected categories
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

    let createdCount = 0;
    if (dto.products && dto.products.length > 0) {
      for (const p of dto.products) {
        try {
          // Find or create category
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
              unit: p.unit ?? 'pcs',
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

    // Steps 5 (products) and 6 (team) are skippable
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

    return this.enrich(
      await this.prisma.onboardingProgress.update({
        where: { tenantId: user.tenantId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedSteps: [1, 2, 3, 4, 5, 6],
          currentStep: TOTAL_STEPS,
        },
      }),
    );
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

  // ===== Helpers =====
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

    return this.enrich(
      await this.prisma.onboardingProgress.update({
        where: { tenantId },
        data: {
          ...data,
          completedSteps,
          currentStep: willComplete ? TOTAL_STEPS : nextStep,
          isCompleted: willComplete ? true : false,
          completedAt: willComplete ? new Date() : null,
        },
      }),
    );
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

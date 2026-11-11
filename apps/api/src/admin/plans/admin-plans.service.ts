/**
 * Admin plans: prices, limits and the feature keys each plan includes.
 * Saving `features` also keeps the old boolean columns in step, so screens
 * that still read them agree with the entitlements.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteRevalidationService } from '../../admin-marketing/cms/revalidation/site-revalidation.service';
import { FEATURE_KEYS } from '../../modules/billing/entitlements/feature-catalog';
import { saveBillingSettings } from '../../modules/billing/entitlements/billing-settings';
import { UpsertPlanDto } from './dto/upsert-plan.dto';

const REAL_SHOPS = { tenant: { slug: { not: 'nafaa-system' } } };
const TRIAL_SLUG = 'free-trial';

/** Old boolean plan columns and the feature key each one stands for. */
const LEGACY_COLUMNS: Array<[keyof Prisma.PlanUncheckedCreateInput, string]> = [
  ['featurePos', 'pos'],
  ['featureBarcodeScanner', 'barcode'],
  ['featureMultiShop', 'multi_shop'],
  ['featureReports', 'reports'],
  ['featureProfitReport', 'profit_report'],
  ['featureLoyalty', 'loyalty'],
  ['featureDiscounts', 'discount_rules'],
  ['featureKhata', 'khata'],
  ['featureExports', 'exports'],
  ['featureBackup', 'backup'],
  ['featureCashRegister', 'cash_register'],
  ['featureStockTransfer', 'stock_transfer'],
  ['featureReturns', 'returns'],
  ['featureSupport24x7', 'priority_support'],
  ['featureWhatsappReceipt', 'whatsapp_receipt'],
  ['featureCustomBranding', 'branding'],
  ['featureDistribution', 'distribution'],
];

@Injectable()
export class AdminPlansService {
  constructor(
    private readonly prisma: PrismaService,
    // Public site: prices and plan features are read from Plan (CMS revalidation, global module).
    @Optional() private readonly siteRevalidation?: SiteRevalidationService,
  ) {}

  private revalidateSite(): void {
    void this.siteRevalidation?.revalidatePlans();
  }

  /** Plans with live subscriber counts (active, trial, past due) per plan. */
  async list() {
    const [plans, groups] = await Promise.all([
      this.prisma.plan.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { subscriptions: true } } },
      }),
      this.prisma.subscription.groupBy({
        by: ['planId', 'status'],
        where: { ...REAL_SHOPS, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
        _count: { _all: true },
      }),
    ]);
    return plans.map((p) => {
      const of = (status: string) => groups.find((g) => g.planId === p.id && g.status === status)?._count._all ?? 0;
      return { ...p, subscribers: { active: of('ACTIVE'), trial: of('TRIAL'), pastDue: of('PAST_DUE') } };
    });
  }

  /** Turns the DTO into Prisma data: clean feature keys, legacy columns, free plan prices. */
  private toData(dto: UpsertPlanDto): Omit<Prisma.PlanUncheckedCreateInput, 'slug'> {
    const { slug: _slug, features, ...rest } = dto;
    const data: Omit<Prisma.PlanUncheckedCreateInput, 'slug'> = { ...rest };
    if (features) {
      const keys = [...new Set(features.filter((k) => FEATURE_KEYS.has(k)))];
      data.features = keys;
      for (const [column, key] of LEGACY_COLUMNS) (data as Record<string, unknown>)[column] = keys.includes(key);
    }
    if (dto.isFree) {
      data.priceMonthly = 0;
      data.priceQuarterly = 0;
      data.priceYearly = 0;
    }
    return data;
  }

  async create(dto: UpsertPlanDto, userId?: string) {
    const slug = dto.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(slug)) throw new BadRequestException('Slug may use lowercase letters, numbers and dashes only');
    const exists = await this.prisma.plan.findFirst({
      where: { OR: [{ slug }, { name: dto.name }] },
    });
    if (exists) throw new ConflictException('Plan with same slug or name exists');

    const created = await this.prisma.plan.create({ data: { ...this.toData(dto), slug } });
    if (slug === TRIAL_SLUG && userId && dto.trialDays != null) await saveBillingSettings(this.prisma, userId, { trialDays: dto.trialDays });
    this.revalidateSite();
    return created;
  }

  /** The slug never changes after create: add-on availability and signup refer to it. */
  async update(id: string, dto: UpsertPlanDto, userId?: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    const nameTaken = await this.prisma.plan.findFirst({ where: { name: dto.name, NOT: { id } }, select: { id: true } });
    if (nameTaken) throw new ConflictException('Another plan has this name');

    const updated = await this.prisma.plan.update({ where: { id }, data: this.toData(dto) });
    // The trial length lives in the billing settings too; keep both the same.
    if (plan.slug === TRIAL_SLUG && userId && dto.trialDays != null && dto.trialDays !== plan.trialDays) {
      await saveBillingSettings(this.prisma, userId, { trialDays: dto.trialDays });
    }
    this.revalidateSite();
    return updated;
  }

  /** A plan that any shop has ever used is hidden and switched off, never deleted. */
  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { subscriptions: true } } },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    if (plan._count.subscriptions > 0) {
      const hidden = await this.prisma.plan.update({
        where: { id },
        data: { isActive: false, isPublic: false },
      });
      this.revalidateSite();
      return { ...hidden, message: 'Plan has subscribers, so it was switched off and hidden instead of deleted' };
    }

    await this.prisma.plan.delete({ where: { id } });
    this.revalidateSite();
    return { message: 'Plan deleted permanently' };
  }
}

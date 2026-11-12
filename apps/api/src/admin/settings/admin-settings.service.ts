import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Without `paged` this returns every platform setting (old behavior). With
   * it, one searched page, optionally for one category, plus the category list.
   */
  async list(q: { paged?: boolean; page?: number; limit?: number; search?: string; category?: string } = {}) {
    // Appearance, per-user preference and per-store hosting rows are not platform settings.
    const base = { category: { notIn: ['appearance', 'preferences', 'stores_hosting'] } };
    const include = { updatedBy: { select: { id: true, fullName: true } } };
    const orderBy = [{ category: 'asc' as const }, { key: 'asc' as const }];
    if (!q.paged) return this.prisma.systemSetting.findMany({ where: base, orderBy, include });

    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const page = Math.max(1, q.page ?? 1);
    const term = q.search?.trim();
    const where = {
      ...(q.category ? { category: q.category } : base),
      ...(term ? { OR: [{ key: { contains: term, mode: 'insensitive' as const } }, { description: { contains: term, mode: 'insensitive' as const } }, { value: { contains: term, mode: 'insensitive' as const } }] } : {}),
    };
    const [items, total, cats] = await Promise.all([
      this.prisma.systemSetting.findMany({ where, orderBy, include, skip: (page - 1) * limit, take: limit }),
      this.prisma.systemSetting.count({ where }),
      this.prisma.systemSetting.groupBy({ by: ['category'], where: base, _count: { _all: true }, orderBy: { category: 'asc' } }),
    ]);
    return {
      items,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      stats: { total: cats.reduce((n, c) => n + c._count._all, 0), categories: cats.map((c) => ({ category: c.category, count: c._count._all })) },
    };
  }

  byCategory(category: string) {
    return this.prisma.systemSetting.findMany({
      where: { category },
      orderBy: { key: 'asc' },
    });
  }

  async upsert(adminUserId: string, dto: UpsertSettingDto) {
    return this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        value: dto.value,
        category: dto.category ?? 'general',
        description: dto.description,
        isPublic: dto.isPublic ?? false,
        updatedById: adminUserId,
      },
      update: {
        value: dto.value,
        category: dto.category,
        description: dto.description,
        isPublic: dto.isPublic,
        updatedById: adminUserId,
      },
    });
  }

  async bulkUpsert(adminUserId: string, settings: UpsertSettingDto[]) {
    const results = [];
    for (const s of settings) {
      results.push(await this.upsert(adminUserId, s));
    }
    return { count: results.length };
  }

  async seedDefaults() {
    const existing = await this.prisma.systemSetting.count();
    if (existing > 0) return { skipped: true };

    const defaults = [
      // Bank Info
      { key: 'BANK_NAME', value: 'Meezan Bank', category: 'bank', description: 'Default bank name shown to tenants', isPublic: true },
      { key: 'BANK_ACCOUNT_TITLE', value: 'Nafaa Pakistan', category: 'bank', isPublic: true },
      { key: 'BANK_ACCOUNT_NUMBER', value: '01230112345678', category: 'bank', isPublic: true },
      { key: 'BANK_IBAN', value: 'PK36MEZN0001230112345678', category: 'bank', isPublic: true },
      { key: 'JAZZCASH_NUMBER', value: '03001234567', category: 'mobile_payments', isPublic: true },
      { key: 'EASYPAISA_NUMBER', value: '03001234567', category: 'mobile_payments', isPublic: true },

      // Branding
      { key: 'COMPANY_NAME', value: 'Nafaa', category: 'branding', isPublic: true },
      { key: 'SUPPORT_EMAIL', value: 'support@nafaa.pk', category: 'branding', isPublic: true },
      { key: 'SUPPORT_PHONE', value: '+923001234567', category: 'branding', isPublic: true },

      // Referrals
      { key: 'REFERRAL_REWARD_AMOUNT', value: '500', category: 'referrals', description: 'PKR fixed reward' },
      { key: 'REFERRAL_REWARD_PERCENTAGE', value: '10', category: 'referrals', description: 'Percentage reward' },

      // System
      { key: 'TRIAL_DAYS', value: '7', category: 'system', description: 'Default free trial days' },
      { key: 'MAINTENANCE_MODE', value: 'false', category: 'system' },
    ];

    await this.prisma.systemSetting.createMany({ data: defaults });
    return { seeded: defaults.length };
  }
}

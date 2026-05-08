import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
      include: {
        updatedBy: { select: { id: true, fullName: true } },
      },
    });
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

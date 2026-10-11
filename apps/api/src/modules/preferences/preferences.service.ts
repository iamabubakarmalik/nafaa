/**
 * Stores per-user preferences in SystemSetting as `prefs:<key>:user:<userId>`.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isPreferenceKey, PREFERENCE_VALIDATORS } from './preferences.schema';

const settingKey = (key: string, userId: string) => `prefs:${key}:user:${userId}`;

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertKey(key: string) {
    if (!isPreferenceKey(key)) throw new BadRequestException('Unknown preference');
  }

  async get(userId: string, key: string) {
    this.assertKey(key);
    const row = await this.prisma.systemSetting.findUnique({ where: { key: settingKey(key, userId) } });
    if (!row) return null;
    try {
      return PREFERENCE_VALIDATORS[key](JSON.parse(row.value));
    } catch {
      return null;
    }
  }

  async save(userId: string, key: string, value: unknown) {
    this.assertKey(key);
    const clean = PREFERENCE_VALIDATORS[key](value);
    const id = settingKey(key, userId);
    await this.prisma.systemSetting.upsert({
      where: { key: id },
      create: { key: id, value: JSON.stringify(clean), category: 'preferences', updatedById: userId },
      update: { value: JSON.stringify(clean), updatedById: userId },
    });
    return clean;
  }
}

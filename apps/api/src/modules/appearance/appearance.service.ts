/**
 * Stores appearance layers in SystemSetting (key/value JSON, no migration):
 *
 *   appearance:platform           platform defaults, edited by Nafaa staff
 *   appearance:tenant:<tenantId>  business defaults, edited by the owner
 *   appearance:user:<userId>      each user's personal preferences
 */

import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { hasPermission, PERMISSIONS } from '../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { sanitizeLayer, type AppearanceLayer } from './appearance.schema';

const PLATFORM_KEY = 'appearance:platform';
const tenantKey = (tenantId: string) => `appearance:tenant:${tenantId}`;
const userKey = (userId: string) => `appearance:user:${userId}`;

@Injectable()
export class AppearanceService {
  constructor(private readonly prisma: PrismaService) {}

  private async read(key: string): Promise<AppearanceLayer | null> {
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!row) return null;
    try {
      return sanitizeLayer(JSON.parse(row.value));
    } catch {
      return null;
    }
  }

  private async write(key: string, layer: AppearanceLayer, updatedById: string | null, isPublic = false) {
    const value = JSON.stringify(layer);
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, category: 'appearance', isPublic, updatedById },
      update: { value, updatedById },
    });
    return layer;
  }

  /** Everything the web client needs to resolve the signed-in user's appearance. */
  async forUser(user: AuthenticatedUser) {
    const [platform, business, personal] = await Promise.all([
      this.read(PLATFORM_KEY),
      this.read(tenantKey(user.tenantId)),
      this.read(userKey(user.id)),
    ]);
    return { platform, business, personal, canEditBusiness: this.canEditBusiness(user) };
  }

  platform() {
    return this.read(PLATFORM_KEY);
  }

  savePersonal(user: AuthenticatedUser, layer: unknown) {
    return this.write(userKey(user.id), sanitizeLayer(layer), user.id);
  }

  saveBusiness(user: AuthenticatedUser, layer: unknown) {
    if (!this.canEditBusiness(user)) throw new ForbiddenException('Only the owner or a manager with settings access can change the business look');
    return this.write(tenantKey(user.tenantId), sanitizeLayer(layer), user.id);
  }

  savePlatform(adminUserId: string, layer: unknown) {
    return this.write(PLATFORM_KEY, sanitizeLayer(layer), adminUserId, true);
  }

  private canEditBusiness(user: AuthenticatedUser) {
    return hasPermission(user.role, user.permissions, PERMISSIONS.SETTINGS_EDIT);
  }
}

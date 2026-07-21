import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { UpsertIntegrationDto } from '../dto/integration.dto';

/**
 * Integrations are stored in TenantSettings.integrations JSON field.
 * Each integration = { type, isEnabled, displayName, credentials, config, webhookUrl, notes, updatedAt }.
 *
 * When a new one (FBR, Daraz, FoodPanda etc.) is fully implemented, add a matching
 * `testConnection` case below. Until then, testConnection returns "not-implemented".
 */
@Injectable()
export class SettingsIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { integrations: true },
    });
    const raw = (settings?.integrations as any) || {};
    // Never expose credentials in list
    return Object.entries(raw).map(([type, v]: [string, any]) => ({
      type,
      isEnabled: !!v?.isEnabled,
      displayName: v?.displayName || type,
      hasCredentials: !!v?.credentials && Object.keys(v.credentials).length > 0,
      config: v?.config || {},
      webhookUrl: v?.webhookUrl,
      notes: v?.notes,
      updatedAt: v?.updatedAt,
      lastTestedAt: v?.lastTestedAt,
      lastTestResult: v?.lastTestResult,
    }));
  }

  async getOne(user: AuthenticatedUser, type: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      select: { integrations: true },
    });
    const raw = ((settings?.integrations as any) || {})[type];
    if (!raw) return null;
    // Expose everything EXCEPT raw credentials (return masked)
    return {
      type,
      ...raw,
      credentials: raw.credentials
        ? Object.fromEntries(Object.keys(raw.credentials).map((k) => [k, '••••••••']))
        : {},
    };
  }

  async upsert(user: AuthenticatedUser, dto: UpsertIntegrationDto) {
    const settings = await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId },
      update: {},
    });

    const current = (settings.integrations as any) || {};
    const existing = current[dto.type] || {};

    current[dto.type] = {
      ...existing,
      ...dto,
      // Merge credentials (do not wipe on partial update)
      credentials: dto.credentials
        ? { ...(existing.credentials || {}), ...dto.credentials }
        : existing.credentials || {},
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: { integrations: current },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'INTEGRATION_UPDATED',
        entityType: 'Integration',
        entityId: dto.type,
        description: `Integration "${dto.type}" ${dto.isEnabled ? 'enabled' : 'configured'}`,
      },
    });

    return this.getOne(user, dto.type);
  }

  async disable(user: AuthenticatedUser, type: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    const current = (settings?.integrations as any) || {};
    if (!current[type]) throw new NotFoundException('Integration not configured');

    current[type].isEnabled = false;
    current[type].updatedAt = new Date().toISOString();

    await this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: { integrations: current },
    });

    return { success: true };
  }

  async remove(user: AuthenticatedUser, type: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    const current = (settings?.integrations as any) || {};
    delete current[type];

    await this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: { integrations: current },
    });

    return { success: true };
  }

  /**
   * Test connection stub. Real implementations plug in here.
   * Returns { success, message, details? }.
   */
  async testConnection(user: AuthenticatedUser, type: string) {
    const one = await this.getOneRaw(user, type);
    if (!one) throw new NotFoundException('Integration not configured');

    let result: { success: boolean; message: string; details?: any };

    try {
      switch (type) {
        case 'FBR_POS':
        case 'FBR_SANDBOX':
          result = await this.testFbr(one);
          break;
        case 'DARAZ':
          result = await this.testDaraz(one);
          break;
        case 'FOODPANDA':
          result = await this.testFoodpanda(one);
          break;
        case 'WHATSAPP_BUSINESS':
          result = await this.testWhatsApp(one);
          break;
        default:
          result = { success: false, message: `Test for "${type}" not implemented yet` };
      }
    } catch (e: any) {
      result = { success: false, message: e?.message || 'Connection failed' };
    }

    // Persist last test result
    await this.recordTestResult(user, type, result);
    return result;
  }

  private async getOneRaw(user: AuthenticatedUser, type: string) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    return ((settings?.integrations as any) || {})[type];
  }

  private async recordTestResult(user: AuthenticatedUser, type: string, result: any) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    const current = (settings?.integrations as any) || {};
    if (current[type]) {
      current[type].lastTestedAt = new Date().toISOString();
      current[type].lastTestResult = result;
      await this.prisma.tenantSettings.update({
        where: { tenantId: user.tenantId },
        data: { integrations: current },
      });
    }
  }

  // ─── Stubs — plug real API calls here when implementing ───
  private async testFbr(cfg: any) {
    if (!cfg?.credentials?.posId || !cfg?.credentials?.token) {
      return { success: false, message: 'FBR POS ID aur Token required hain' };
    }
    // TODO: call FBR PRAL sandbox
    return { success: true, message: 'FBR credentials save hain (live test pending)', details: { posId: cfg.credentials.posId } };
  }
  private async testDaraz(cfg: any) {
    if (!cfg?.credentials?.appKey || !cfg?.credentials?.appSecret) {
      return { success: false, message: 'Daraz App Key aur Secret required hain' };
    }
    return { success: true, message: 'Daraz credentials save hain (live test pending)' };
  }
  private async testFoodpanda(cfg: any) {
    if (!cfg?.credentials?.vendorId) {
      return { success: false, message: 'FoodPanda Vendor ID required hai' };
    }
    return { success: true, message: 'FoodPanda credentials save hain (live test pending)' };
  }
  private async testWhatsApp(cfg: any) {
    if (!cfg?.credentials?.phoneNumberId || !cfg?.credentials?.accessToken) {
      return { success: false, message: 'WhatsApp Business Phone Number ID aur Access Token required hain' };
    }
    return { success: true, message: 'WhatsApp Business credentials save hain (live test pending)' };
  }
}

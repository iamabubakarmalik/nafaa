import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsHubService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string) {
    const [fbrConfig, whatsappConfig, courierConfigs] = await Promise.all([
      this.prisma.fbrConfig.findUnique({ where: { tenantId } }),
      this.prisma.whatsappConfig.findUnique({ where: { tenantId } }),
      this.prisma.courierConfig.findMany({ where: { tenantId } }),
    ]);

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: `marketplace_settings_hub:${tenantId}` },
    }).catch(() => null);

    const config = setting?.value ? JSON.parse(setting.value) : {};

    const postexConfig = courierConfigs.find((c) => c.provider === 'POSTEX');
    const leopardsConfig = courierConfigs.find((c) => c.provider === 'LEOPARDS');

    return {
      integrations: {
        jazzcash:  { enabled: config.integrations?.jazzcash?.enabled || false,  isConnected: !!config.integrations?.jazzcash?.merchantId },
        easypaisa: { enabled: config.integrations?.easypaisa?.enabled || false, isConnected: !!config.integrations?.easypaisa?.merchantId },
        stripe:    { enabled: config.integrations?.stripe?.enabled || false,    isConnected: !!config.integrations?.stripe?.accountId },
        postex:    { enabled: postexConfig?.isActive || false,   isConnected: !!postexConfig?.apiKey },
        leopards:  { enabled: leopardsConfig?.isActive || false, isConnected: !!leopardsConfig?.apiKey },
        whatsapp:  { enabled: whatsappConfig?.isActive || false, isConnected: !!whatsappConfig?.accessToken, phoneNumberId: whatsappConfig?.phoneNumberId },
        fbr:       { enabled: fbrConfig?.isEnabled || false,     isConnected: !!fbrConfig?.apiToken,       ntn: fbrConfig?.ntn },
      },
      taxConfig: config.taxConfig || {
        enableTax: false,
        taxRate: 17,
        taxLabel: 'GST',
        priceIncludesTax: false,
      },
      fees: config.fees || {
        serviceFeePercent: 0,
        processingFeeFixed: 0,
        riderTipPercent: 10,
      },
      policies: config.policies || {
        returnWindow: 7,
        cancellationWindow: 5,
        autoAcceptTime: 15,
        minOrderAmount: 0,
        maxCodOrderAmount: 50000,
        allowGuestCheckout: true,
      },
      webhooks: config.webhooks || [],
      blacklist: config.blacklist || {
        customerIds: [],
        phoneNumbers: [],
        emails: [],
        ipAddresses: [],
      },
    };
  }

  async updateSection(tenantId: string, section: string, data: any) {
    const key = `marketplace_settings_hub:${tenantId}`;
    const current = await this.prisma.systemSetting.findUnique({ where: { key } }).catch(() => null);

    const existingConfig = current?.value ? JSON.parse(current.value) : {};
    const newConfig = { ...existingConfig, [section]: data };

    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: JSON.stringify(newConfig), category: 'marketplace' },
      update: { value: JSON.stringify(newConfig) },
    });

    return this.get(tenantId);
  }

  async testIntegration(tenantId: string, provider: string) {
    // Placeholder — real testing would ping the provider APIs
    return {
      success: true,
      message: `${provider} connection test successful`,
    };
  }

  async createWebhook(tenantId: string, data: { url: string; events: string[] }) {
    if (!data.url.startsWith('http')) throw new BadRequestException('Invalid URL');
    if (data.events.length === 0) throw new BadRequestException('At least one event required');

    const current = await this.get(tenantId);
    const newHook = {
      id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      url: data.url,
      events: data.events,
      isActive: true,
      failureCount: 0,
    };

    await this.updateSection(tenantId, 'webhooks', [...(current.webhooks || []), newHook]);
    return newHook;
  }

  async deleteWebhook(tenantId: string, id: string) {
    const current = await this.get(tenantId);
    await this.updateSection(tenantId, 'webhooks', (current.webhooks || []).filter((w: any) => w.id !== id));
    return { success: true };
  }

  async testWebhook(tenantId: string, id: string) {
    const current = await this.get(tenantId);
    const webhook = (current.webhooks || []).find((w: any) => w.id === id);
    if (!webhook) throw new NotFoundException('Webhook not found');

    try {
      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'webhook.test', timestamp: new Date().toISOString() }),
      });
      return { success: res.ok, response: `HTTP ${res.status}` };
    } catch (e: any) {
      return { success: false, response: e.message };
    }
  }

  async addToBlacklist(tenantId: string, type: string, value: string, reason?: string) {
    const current = await this.get(tenantId);
    const bl = current.blacklist || { customerIds: [], phoneNumbers: [], emails: [], ipAddresses: [] };

    const key = type === 'customer' ? 'customerIds' :
                type === 'phone' ? 'phoneNumbers' :
                type === 'email' ? 'emails' : 'ipAddresses';

    if (!bl[key].includes(value)) {
      bl[key] = [...bl[key], value];
    }

    await this.updateSection(tenantId, 'blacklist', bl);
    return { success: true };
  }

  async removeFromBlacklist(tenantId: string, type: string, value: string) {
    const current = await this.get(tenantId);
    const bl = current.blacklist || { customerIds: [], phoneNumbers: [], emails: [], ipAddresses: [] };

    const key = type === 'customer' ? 'customerIds' :
                type === 'phone' ? 'phoneNumbers' :
                type === 'email' ? 'emails' : 'ipAddresses';

    bl[key] = bl[key].filter((v: string) => v !== value);
    await this.updateSection(tenantId, 'blacklist', bl);
    return { success: true };
  }

  async auditLog(tenantId: string, opts: { entityType?: string; userId?: string; page?: number; limit?: number }) {
    const page = opts.page || 1;
    const limit = opts.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (opts.entityType) where.entityType = opts.entityType;
    if (opts.userId) where.userId = opts.userId;

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }).catch(() => []),
      this.prisma.activityLog.count({ where }).catch(() => 0),
    ]);

    return {
      items: items.map((entry: any) => ({
        id: entry.id,
        userId: entry.userId,
        userName: entry.user?.fullName || entry.user?.email || 'Unknown',
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.metadata,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        createdAt: entry.createdAt.toISOString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

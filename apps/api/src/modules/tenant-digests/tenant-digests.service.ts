import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class TenantDigestsService {
  private readonly logger = new Logger('TenantDigests');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private get appUrl() {
    return this.config.get<string>('APP_URL') || 'http://localhost:5173';
  }

  // ═══════════════════════════════════════════════════════════
  // LOW STOCK DAILY DIGEST
  // ═══════════════════════════════════════════════════════════

  /**
   * Send low stock digest emails to all eligible tenants
   * Runs daily at 9:00 AM Pakistan time
   */
  async runLowStockDigest() {
    this.logger.log('🔄 Running low stock digest job...');

    // Find tenants with email notifications + low stock notify enabled
    const settings = await this.prisma.tenantSettings.findMany({
      where: {
        emailNotifications: true,
        notifyLowStock: true,
      },
      select: {
        tenantId: true,
        defaultLowStockAlert: true,
        tenant: {
          select: {
            id: true,
            name: true,
            status: true,
            users: {
              where: { role: 'OWNER', isActive: true },
              take: 1,
              select: { email: true, fullName: true, emailVerified: true },
            },
          },
        },
      },
    });

    const activeTenants = settings.filter(
      (s) =>
        s.tenant.status === 'ACTIVE' &&
        s.tenant.users.length > 0 &&
        s.tenant.users[0].emailVerified,
    );

    this.logger.log(`Checking ${activeTenants.length} tenants for low stock`);

    let sent = 0;
    let skipped = 0;

    for (const setting of activeTenants) {
      try {
        const owner = setting.tenant.users[0];

        // Find low stock products for this tenant
        const lowStockProducts = await this.prisma.product.findMany({
          where: {
            tenantId: setting.tenantId,
            isActive: true,
            OR: [
              { stock: { lte: setting.defaultLowStockAlert } },
              {
                stock: { lte: 0 },
              },
            ],
          },
          orderBy: { stock: 'asc' },
          take: 15,
          select: {
            name: true,
            sku: true,
            stock: true,
            lowStockAlert: true,
            unit: true,
            price: true,
          },
        });

        if (lowStockProducts.length === 0) {
          skipped++;
          continue;
        }

        const productsList = lowStockProducts
          .map((p) => {
            const isOut = p.stock <= 0;
            const color = isOut ? '#dc2626' : '#d97706';
            const label = isOut ? 'OUT' : 'LOW';
            return `
<div style="padding:10px 14px;background:#fff;border-radius:8px;margin-bottom:8px;border-left:4px solid ${color};">
  <div style="font-weight:700;color:#1e293b;font-size:14px;">${p.name}</div>
  <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:12px;color:#64748b;">
    <span>SKU: ${p.sku || '—'}</span>
    <span style="font-weight:700;color:${color};">${p.stock} ${p.unit} • ${label}</span>
  </div>
</div>`;
          })
          .join('');

        await this.email.send({
          tenantId: setting.tenantId,
          templateSlug: 'low-stock-digest',
          toEmail: owner.email,
          toName: owner.fullName,
          variables: {
            name: owner.fullName,
            shopName: setting.tenant.name,
            count: lowStockProducts.length,
            productsList,
            appUrl: this.appUrl,
          },
        });

        sent++;
        await new Promise((r) => setTimeout(r, 500));
      } catch (e: any) {
        this.logger.error(`Low stock digest failed for ${setting.tenantId}: ${e.message}`);
      }
    }

    this.logger.log(`✅ Low stock digest done — sent: ${sent}, skipped: ${skipped}`);
    return { sent, skipped, total: activeTenants.length };
  }

  // ═══════════════════════════════════════════════════════════
  // ADMIN BROADCAST
  // ═══════════════════════════════════════════════════════════

  /**
   * Send broadcast email to selected tenant segment
   * Called from admin broadcast controller
   */
  async sendBroadcast(params: {
    title: string;
    subject: string;
    message: string;
    ctaText?: string;
    ctaUrl?: string;
    targetType: 'ALL' | 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SPECIFIC';
    targetTenantIds?: string[];
  }) {
    this.logger.log(`📢 Running broadcast: ${params.targetType}`);

    // Build where clause based on target type
    let whereClause: any = { status: 'ACTIVE' };

    if (params.targetType === 'ACTIVE') {
      whereClause = {
        status: 'ACTIVE',
        subscriptions: {
          some: { status: 'ACTIVE' },
        },
      };
    } else if (params.targetType === 'TRIAL') {
      whereClause = {
        status: 'ACTIVE',
        subscriptions: {
          some: { status: 'TRIAL' },
        },
      };
    } else if (params.targetType === 'EXPIRED') {
      whereClause = {
        subscriptions: {
          some: { status: { in: ['EXPIRED', 'PAST_DUE'] } },
        },
      };
    } else if (params.targetType === 'SPECIFIC') {
      whereClause = {
        id: { in: params.targetTenantIds ?? [] },
      };
    }

    const tenants = await this.prisma.tenant.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        users: {
          where: { role: 'OWNER', isActive: true },
          take: 1,
          select: { email: true, fullName: true, emailVerified: true },
        },
      },
    });

    const eligible = tenants.filter(
      (t) => t.users.length > 0 && t.users[0].emailVerified,
    );

    this.logger.log(`Broadcasting to ${eligible.length} tenants`);

    let sent = 0;
    let failed = 0;

    for (const tenant of eligible) {
      try {
        const owner = tenant.users[0];

        await this.email.send({
          tenantId: tenant.id,
          templateSlug: 'admin-broadcast',
          toEmail: owner.email,
          toName: owner.fullName,
          subject: params.subject,
          variables: {
            name: owner.fullName,
            title: params.title,
            subject: params.subject,
            message: params.message,
            ctaText: params.ctaText || '',
            ctaUrl: params.ctaUrl || '',
            appUrl: this.appUrl,
          },
        });

        sent++;
        await new Promise((r) => setTimeout(r, 300));
      } catch (e: any) {
        failed++;
        this.logger.error(`Broadcast failed for ${tenant.id}: ${e.message}`);
      }
    }

    this.logger.log(`✅ Broadcast done — sent: ${sent}, failed: ${failed}`);
    return { sent, failed, total: eligible.length };
  }
}

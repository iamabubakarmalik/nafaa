import { Injectable } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { apiMessage, notificationText } from '../../common/i18n/api-message';

@Injectable()
export class AdminBulkService {
  constructor(private readonly prisma: PrismaService) {}

  async updateStatus(tenantIds: string[], status: TenantStatus, reason?: string) {
    const result = await this.prisma.tenant.updateMany({
      where: { id: { in: tenantIds } },
      data: { status },
    });

    const text = notificationText(
      apiMessage('Account {{status}}', { status }),
      reason || apiMessage('Account {{status}} kar diya gaya hai (bulk action).', { status }),
    );
    await this.prisma.notification.createMany({
      data: tenantIds.map((id) => ({
        tenantId: id,
        type: status === 'SUSPENDED' ? 'WARNING' as const : 'INFO' as const,
        ...text,
      })),
    });

    return { updatedCount: result.count };
  }

  async broadcastToTenants(tenantIds: string[], title: string, message: string) {
    await this.prisma.notification.createMany({
      data: tenantIds.map((id) => ({
        tenantId: id,
        type: 'INFO' as const,
        title,
        message,
      })),
    });

    return { sentCount: tenantIds.length };
  }
}

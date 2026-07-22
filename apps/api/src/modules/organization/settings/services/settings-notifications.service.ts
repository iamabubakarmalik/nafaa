import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SettingsNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthenticatedUser) {
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { tenantId: user.tenantId },
    });
    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: { tenantId: user.tenantId },
      });
    }
    return pref;
  }

  async update(user: AuthenticatedUser, dto: any) {
    return this.prisma.notificationPreference.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, ...dto },
      update: dto,
    });
  }

  /** Send a test notification via chosen channel */
  async sendTest(user: AuthenticatedUser, channel: 'email' | 'sms' | 'push') {
    // Real dispatch handled by NotificationService — here we just enqueue
    await this.prisma.notification.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        type: 'INFO',
        title: '🔔 Test Notification',
        message: `Ye test ${channel.toUpperCase()} notification hai — agar aap ko mila to setup theek hai.`,
      },
    });
    return { success: true, message: `Test ${channel} bhej diya` };
  }
}

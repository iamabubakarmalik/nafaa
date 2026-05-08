import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class NotificationPrefsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: AuthenticatedUser) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { tenantId: user.tenantId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { tenantId: user.tenantId },
      });
    }

    return prefs;
  }

  async update(user: AuthenticatedUser, data: any) {
    return this.prisma.notificationPreference.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, ...data },
      update: data,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

interface CreateNotificationParams {
  tenantId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateNotificationParams) {
    return this.prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        metadata: params.metadata,
      },
    });
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(user: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
        isRead: false,
      },
    });
    return { count };
  }

  async markAsRead(user: AuthenticatedUser, id: string) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        tenantId: user.tenantId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ userId: user.id }, { userId: null }],
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return { message: 'All notifications marked as read' };
  }

  async delete(user: AuthenticatedUser, id: string) {
    await this.prisma.notification.deleteMany({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });
    return { message: 'Notification deleted' };
  }

  async checkLowStock(tenantId: string) {
    const lowStock = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
      },
    });

    const filtered = lowStock.filter((p) => p.stock <= p.lowStockAlert);

    for (const product of filtered.slice(0, 5)) {
      const exists = await this.prisma.notification.findFirst({
        where: {
          tenantId,
          type: 'LOW_STOCK',
          metadata: { path: ['productId'], equals: product.id },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!exists) {
        await this.create({
          tenantId,
          type: 'LOW_STOCK',
          title: 'Low Stock Alert',
          message: `${product.name} ka stock kam ho gaya hai (${product.stock} ${product.unit} bacha)`,
          link: '/low-stock',
          metadata: { productId: product.id, stock: product.stock },
        });
      }
    }
  }
}

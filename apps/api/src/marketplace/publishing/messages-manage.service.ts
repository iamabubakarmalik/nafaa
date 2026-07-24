import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MessagesManageService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveShopId(tenantId: string, shopId?: string | null): Promise<string> {
    if (shopId) return shopId;
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('No shop found');
    return shop.id;
  }

  async list(tenantId: string, shopId: string | null | undefined, opts: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { tenantId, shopId: resolvedShopId };
    if (opts.status) where.status = opts.status;

    const [items, total, openCount, closedCount, unreadCount] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
      this.prisma.conversation.count({ where: { tenantId, shopId: resolvedShopId, status: 'OPEN' } }),
      this.prisma.conversation.count({ where: { tenantId, shopId: resolvedShopId, status: 'CLOSED' } }),
      this.prisma.conversation.aggregate({
        where: { tenantId, shopId: resolvedShopId },
        _sum: { unreadCount: true },
      }),
    ]);

    // Enrich with customer details manually
    const customerIds = items.map(i => i.customerId).filter(Boolean) as string[];
    const customers = customerIds.length > 0
      ? await this.prisma.marketplaceCustomer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, fullName: true, phone: true, avatarUrl: true },
        })
      : [];
    const custMap = new Map(customers.map(c => [c.id, c]));

    return {
      items: items.map(i => ({
        ...i,
        customer: i.customerId ? custMap.get(i.customerId) || null : null,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      counts: {
        open: openCount,
        closed: closedCount,
        unread: unreadCount._sum.unreadCount || 0,
      },
    };
  }

  async get(tenantId: string, shopId: string | null | undefined, conversationId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId, shopId: resolvedShopId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const messages = await this.prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    let customer = null;
    if (conversation.customerId) {
      customer = await this.prisma.marketplaceCustomer.findUnique({
        where: { id: conversation.customerId },
        select: { id: true, fullName: true, phone: true, avatarUrl: true },
      });
    }

    return {
      conversation: { ...conversation, customer },
      messages,
    };
  }

  async send(tenantId: string, shopId: string | null | undefined, conversationId: string, senderId: string, body: string, attachments: string[] = []) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId, shopId: resolvedShopId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const message = await this.prisma.conversationMessage.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        senderType: 'BUSINESS',
        senderId,
        body,
        attachments,
        channel: conversation.channel,
        isRead: false,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: body.slice(0, 200),
      },
    });

    return message;
  }

  async markRead(tenantId: string, shopId: string | null | undefined, conversationId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId, shopId: resolvedShopId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    await this.prisma.conversationMessage.updateMany({
      where: { conversationId, direction: 'INBOUND', isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { success: true };
  }

  async close(tenantId: string, shopId: string | null | undefined, conversationId: string) {
    const resolvedShopId = await this.resolveShopId(tenantId, shopId);

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId, shopId: resolvedShopId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED' },
    });
  }
}

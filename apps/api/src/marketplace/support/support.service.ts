import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupportTicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { RateTicketDto } from './dto/rate-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';

function generateTicketNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SUP${y}${m}${d}${rand}`;
}

@Injectable()
export class MarketplaceSupportService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // CREATE TICKET
  // ═══════════════════════════════════════════════════════════

  async createTicket(customerId: string, dto: CreateTicketDto) {
    // Validate order/shop belong to customer if provided
    if (dto.orderId) {
      const order = await this.prisma.marketplaceOrder.findFirst({
        where: { id: dto.orderId, customerId },
      });
      if (!order) throw new NotFoundException('Order not found');
    }
    if (dto.shopId) {
      const shop = await this.prisma.shopMarketplaceProfile.findUnique({
        where: { shopId: dto.shopId },
      });
      if (!shop) throw new NotFoundException('Shop not found');
    }

    // Anti-spam: rate-limit to max 5 open tickets per customer
    const openCount = await this.prisma.supportTicket.count({
      where: {
        customerId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] },
      },
    });
    if (openCount >= 5) {
      throw new BadRequestException(
        'Aap ke pass 5 open tickets pehle se hain. Purane close karain.',
      );
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber: generateTicketNumber(),
        customerId,
        orderId: dto.orderId,
        shopId: dto.shopId,
        subject: dto.subject,
        category: dto.category,
        priority: dto.priority ?? 'MEDIUM',
        status: 'OPEN',
        messages: {
          create: {
            senderType: 'CUSTOMER',
            senderId: customerId,
            customerId,
            message: dto.message,
            attachments: dto.attachments ?? [],
          },
        },
      },
      include: { messages: true },
    });

    // System welcome message
    await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'SYSTEM',
        message: 'Aap ki ticket receive ho gayi hai. Humari team jald jawab de gi.',
      },
    });

    return ticket;
  }

  // ═══════════════════════════════════════════════════════════
  // LIST TICKETS
  // ═══════════════════════════════════════════════════════════

  async listTickets(customerId: string, dto: ListTicketsDto) {
    const where: Prisma.SupportTicketWhereInput = { customerId };
    if (dto.status?.length) where.status = { in: dto.status };
    if (dto.priority) where.priority = dto.priority;

    const [items, total, counts] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: dto.limit ?? 20,
        skip: dto.offset ?? 0,
        include: {
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
      this.prisma.supportTicket.groupBy({
        by: ['status'],
        where: { customerId },
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    counts.forEach((c) => (statusCounts[c.status] = c._count.status));

    return {
      items,
      total,
      counts: {
        all: total,
        open: (statusCounts.OPEN ?? 0) + (statusCounts.IN_PROGRESS ?? 0) + (statusCounts.WAITING_CUSTOMER ?? 0),
        resolved: statusCounts.RESOLVED ?? 0,
        closed: statusCounts.CLOSED ?? 0,
      },
      limit: dto.limit ?? 20,
      offset: dto.offset ?? 0,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // TICKET DETAIL (with messages)
  // ═══════════════════════════════════════════════════════════

  async getTicket(customerId: string, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, customerId },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return {
      ...ticket,
      canReply: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'].includes(ticket.status),
      canClose: !['CLOSED'].includes(ticket.status),
      canRate: ticket.status === 'RESOLVED' && !ticket.rating,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SEND MESSAGE (reply to ticket)
  // ═══════════════════════════════════════════════════════════

  async sendMessage(customerId: string, ticketId: string, dto: SendMessageDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, customerId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('Ticket band ho gayi hai — nayi ticket create karain');
    }

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.supportMessage.create({
        data: {
          ticketId,
          senderType: 'CUSTOMER',
          senderId: customerId,
          customerId,
          message: dto.message,
          attachments: dto.attachments ?? [],
        },
      });

      // Move ticket back to IN_PROGRESS if it was WAITING_CUSTOMER
      if (ticket.status === 'WAITING_CUSTOMER') {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: 'IN_PROGRESS' },
        });
      }
      return msg;
    });

    return message;
  }

  // ═══════════════════════════════════════════════════════════
  // CLOSE TICKET (customer)
  // ═══════════════════════════════════════════════════════════

  async closeTicket(customerId: string, ticketId: string, reason?: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, customerId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') return { success: true, alreadyClosed: true };

    await this.prisma.$transaction([
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: SupportTicketStatus.CLOSED,
          closedAt: new Date(),
        },
      }),
      this.prisma.supportMessage.create({
        data: {
          ticketId,
          senderType: 'SYSTEM',
          message: reason
            ? `Customer ne ticket close ki: ${reason}`
            : 'Customer ne ticket close ki',
        },
      }),
    ]);

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // RATE RESOLUTION
  // ═══════════════════════════════════════════════════════════

  async rateTicket(customerId: string, ticketId: string, dto: RateTicketDto) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, customerId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'RESOLVED') {
      throw new BadRequestException('Sirf RESOLVED tickets rate ho sakti hain');
    }
    if (ticket.rating) {
      throw new BadRequestException('Ticket pehle se rated hai');
    }

    await this.prisma.$transaction([
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          rating: dto.rating,
          status: SupportTicketStatus.CLOSED,
          closedAt: new Date(),
        },
      }),
      this.prisma.supportMessage.create({
        data: {
          ticketId,
          senderType: 'CUSTOMER',
          senderId: customerId,
          customerId,
          message: dto.feedback
            ? `Rating: ${dto.rating}/5. ${dto.feedback}`
            : `Rating: ${dto.rating}/5`,
        },
      }),
    ]);

    return { success: true, message: 'Shukriya feedback ka!' };
  }

  // ═══════════════════════════════════════════════════════════
  // REOPEN TICKET (if resolved but customer disagrees)
  // ═══════════════════════════════════════════════════════════

  async reopenTicket(customerId: string, ticketId: string, reason: string) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, customerId },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new BadRequestException('Sirf resolved/closed tickets reopen ho sakti hain');
    }

    // Only within 7 days
    const daysSinceResolved =
      (Date.now() - (ticket.resolvedAt ?? ticket.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceResolved > 7) {
      throw new BadRequestException(
        'Ticket resolve hue 7+ din ho gaye. Nayi ticket create karain.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: SupportTicketStatus.IN_PROGRESS,
          resolvedAt: null,
          closedAt: null,
          rating: null,
        },
      }),
      this.prisma.supportMessage.create({
        data: {
          ticketId,
          senderType: 'CUSTOMER',
          senderId: customerId,
          customerId,
          message: `Reopened by customer: ${reason}`,
        },
      }),
    ]);

    return { success: true, message: 'Ticket reopen ho gayi' };
  }

  // ═══════════════════════════════════════════════════════════
  // FAQ / SUGGESTED HELP (for support home screen)
  // ═══════════════════════════════════════════════════════════

  async getSupportHome(customerId: string) {
    const [openTickets, recentOrders] = await Promise.all([
      this.prisma.supportTicket.count({
        where: {
          customerId,
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER'] },
        },
      }),
      this.prisma.marketplaceOrder.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true, orderNumber: true, status: true, total: true, createdAt: true,
          shop: {
            select: {
              marketplaceProfile: { select: { publicName: true, logoUrl: true } },
            },
          },
        },
      }),
    ]);

    const faqCategories = [
      { key: 'ORDER',    title: 'Order & Delivery', icon: '📦' },
      { key: 'PAYMENT',  title: 'Payment & Refund', icon: '💳' },
      { key: 'DELIVERY', title: 'Delivery Issue',   icon: '🚚' },
      { key: 'PRODUCT',  title: 'Product Issue',    icon: '📱' },
      { key: 'ACCOUNT',  title: 'Account & Security', icon: '👤' },
      { key: 'OTHER',    title: 'Kuch aur',         icon: '💬' },
    ];

    return {
      openTicketsCount: openTickets,
      recentOrders,
      faqCategories,
      contactMethods: [
        { type: 'chat',     label: 'Live Chat',    available: true },
        { type: 'whatsapp', label: 'WhatsApp',     available: true, value: '+92-XXX-XXXXXXX' },
        { type: 'phone',    label: 'Call Support', available: true, value: '111-NAFAA' },
        { type: 'email',    label: 'Email',        available: true, value: 'support@nafaa.pk' },
      ],
    };
  }
}

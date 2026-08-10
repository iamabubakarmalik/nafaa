import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination, paginated } from '../_shared/helpers/pagination.helper';
import { ListConversationsDto } from './dto/list-conversations.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { TakeoverDto } from './dto/takeover.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async log(userId: string, action: string, entityId: string, metadata?: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId: 'system', userId, action, description: action,
          entityType: 'ChatbotConversation', entityId, metadata,
        },
      });
    } catch { /* silent */ }
  }

  async listConversations(dto: ListConversationsDto) {
    const { page, limit, skip } = parsePagination(dto);
    const where: Prisma.ChatbotConversationWhereInput = {};
    if (dto.status) where.status = dto.status as any;
    if (dto.assignedTo) where.currentAgentId = dto.assignedTo;
    if (dto.search) {
      where.OR = [
        { visitorName: { contains: dto.search, mode: 'insensitive' } },
        { visitorEmail: { contains: dto.search, mode: 'insensitive' } },
        { visitorPhone: { contains: dto.search } },
        { conversationNumber: { contains: dto.search, mode: 'insensitive' } },
      ];
    }
    if (dto.from || dto.to) {
      where.startedAt = {};
      if (dto.from) (where.startedAt as any).gte = new Date(dto.from);
      if (dto.to) (where.startedAt as any).lte = new Date(dto.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.chatbotConversation.findMany({
        where, skip, take: limit,
        orderBy: [{ lastActivityAt: 'desc' }],
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.chatbotConversation.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  async getStats() {
    const [total, bot, waiting, active, resolved, abandoned, avg] = await Promise.all([
      this.prisma.chatbotConversation.count(),
      this.prisma.chatbotConversation.count({ where: { status: 'BOT_HANDLING' } }),
      this.prisma.chatbotConversation.count({ where: { status: 'WAITING_HUMAN' } }),
      this.prisma.chatbotConversation.count({ where: { status: 'HUMAN_HANDLING' } }),
      this.prisma.chatbotConversation.count({ where: { status: 'RESOLVED' } }),
      this.prisma.chatbotConversation.count({ where: { status: 'ABANDONED' } }),
      this.prisma.chatbotConversation.aggregate({
        where: { resolvedAt: { not: null } },
        _avg: { messageCount: true },
      }),
    ]);

    const takenOver = await this.prisma.chatbotConversation.findMany({
      where: { firstAgentResponseAt: { not: null } },
      select: { startedAt: true, firstAgentResponseAt: true },
      take: 300,
    });
    let avgFirstResponseSec = 0;
    if (takenOver.length > 0) {
      const sum = takenOver.reduce(
        (a, c) => a + (c.firstAgentResponseAt!.getTime() - c.startedAt.getTime()),
        0,
      );
      avgFirstResponseSec = Math.round(sum / takenOver.length / 1000);
    }

    return {
      total, bot, waiting, active, resolved, abandoned,
      avgMessagesPerConversation: Math.round(avg._avg.messageCount ?? 0),
      avgFirstResponseSec,
      resolvedRate: total > 0 ? `${((resolved / total) * 100).toFixed(1)}%` : '0%',
      abandonRate: total > 0 ? `${((abandoned / total) * 100).toFixed(1)}%` : '0%',
    };
  }

  async getConversation(id: string) {
    const conv = await this.prisma.chatbotConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    return conv;
  }

  async takeOver(id: string, dto: TakeoverDto, adminId: string) {
    const conv = await this.getConversation(id);
    if (conv.status === 'RESOLVED' || conv.status === 'ABANDONED') {
      throw new BadRequestException(`Cannot take over ${conv.status} chat`);
    }

    const updated = await this.prisma.chatbotConversation.update({
      where: { id },
      data: {
        status: 'HUMAN_HANDLING',
        currentAgentId: adminId,
        isBot: false,
        firstAgentResponseAt: conv.firstAgentResponseAt ?? new Date(),
      },
    });

    if (dto.greeting) {
      await this.prisma.chatbotMessage.create({
        data: {
          conversationId: id,
          senderType: 'AGENT',
          senderName: 'Support Agent',
          content: dto.greeting,
        },
      });
      await this.prisma.chatbotConversation.update({
        where: { id },
        data: { lastActivityAt: new Date(), messageCount: { increment: 1 }, agentMessageCount: { increment: 1 } },
      });
    }

    await this.log(adminId, 'CHAT_TAKEN_OVER', id);
    return updated;
  }

  async sendMessage(id: string, dto: SendMessageDto, adminId: string) {
    const conv = await this.getConversation(id);
    if (conv.status === 'RESOLVED' || conv.status === 'ABANDONED') {
      throw new BadRequestException(`Cannot send to ${conv.status} chat`);
    }

    const msg = await this.prisma.chatbotMessage.create({
      data: {
        conversationId: id,
        senderType: dto.internal ? 'SYSTEM' : 'AGENT',
        senderName: 'Support Agent',
        content: dto.message,
        metadata: dto.internal ? ({ internal: true } as any) : undefined,
      },
    });

    if (!dto.internal) {
      await this.prisma.chatbotConversation.update({
        where: { id },
        data: {
          lastActivityAt: new Date(),
          messageCount: { increment: 1 },
          agentMessageCount: { increment: 1 },
          status: conv.status === 'BOT_HANDLING' ? 'HUMAN_HANDLING' : conv.status,
        },
      });
    }

    return msg;
  }

  async resolve(id: string, adminId: string, summary?: string) {
    const conv = await this.getConversation(id);
    const updated = await this.prisma.chatbotConversation.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        wasResolved: true,
        feedback: summary,
        durationSec: Math.round((Date.now() - conv.startedAt.getTime()) / 1000),
      },
    });

    if (conv.visitorEmail) {
      const existing = await this.prisma.marketingLead.findFirst({ where: { email: conv.visitorEmail } });
      if (existing) {
        await this.prisma.marketingLead.update({
          where: { id: existing.id },
          data: { lastContactAt: new Date() },
        });
      } else {
        await this.prisma.marketingLead.create({
          data: {
            leadNumber: `LEAD-${Date.now()}`,
            fullName: conv.visitorName ?? 'Chat Visitor',
            email: conv.visitorEmail,
            phone: conv.visitorPhone,
            source: 'CHATBOT',
            status: 'CONTACTED',
            temperature: 'WARM',
            score: 45,
          },
        });
      }
    }

    await this.log(adminId, 'CHAT_RESOLVED', id, { summary });
    return updated;
  }
}

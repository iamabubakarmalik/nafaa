import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parsePagination, paginated } from '../_shared/helpers/pagination.helper';
import {
  calculateLeadScore,
  scoreToTemperature,
} from '../_shared/helpers/lead-scoring.helper';
import { ListLeadsDto } from './dto/list-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LogActivityDto } from './dto/log-activity.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private async log(userId: string, action: string, entityId: string, metadata?: any) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId: 'system', userId, action, description: action,
          entityType: 'MarketingLead', entityId, metadata,
        },
      });
    } catch { /* logging kabhi flow nahi todega */ }
  }

  async list(dto: ListLeadsDto) {
    const { page, limit, skip } = parsePagination(dto);
    const where: Prisma.MarketingLeadWhereInput = {};
    if (dto.status) where.status = dto.status as any;
    if (dto.temperature) where.temperature = dto.temperature as any;
    if (dto.source) where.source = dto.source as any;
    if (dto.assignedTo) where.assignedTo = dto.assignedTo;
    if (dto.minScore !== undefined || dto.maxScore !== undefined) {
      where.score = {};
      if (dto.minScore !== undefined) (where.score as any).gte = dto.minScore;
      if (dto.maxScore !== undefined) (where.score as any).lte = dto.maxScore;
    }
    if (dto.search) {
      where.OR = [
        { fullName: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search } },
        { companyName: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.marketingLead.findMany({
        where, skip, take: limit,
        orderBy: [{ score: 'desc' }, { lastContactAt: 'desc' }],
        include: { _count: { select: { activities: true } } },
      }),
      this.prisma.marketingLead.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  }

  async getStats() {
    const [total, newLeads, qualified, converted, lost, fire, hot, warm, cold, byStatus, bySource, avgScore] =
      await Promise.all([
        this.prisma.marketingLead.count(),
        this.prisma.marketingLead.count({ where: { status: 'NEW' } }),
        this.prisma.marketingLead.count({ where: { status: 'QUALIFIED' } }),
        this.prisma.marketingLead.count({ where: { status: 'CONVERTED' } }),
        this.prisma.marketingLead.count({ where: { status: 'LOST' } }),
        this.prisma.marketingLead.count({ where: { temperature: 'FIRE' } }),
        this.prisma.marketingLead.count({ where: { temperature: 'HOT' } }),
        this.prisma.marketingLead.count({ where: { temperature: 'WARM' } }),
        this.prisma.marketingLead.count({ where: { temperature: 'COLD' } }),
        this.prisma.marketingLead.groupBy({ by: ['status'], _count: true }),
        this.prisma.marketingLead.groupBy({ by: ['source'], _count: true }),
        this.prisma.marketingLead.aggregate({ _avg: { score: true } }),
      ]);

    return {
      total, newLeads, qualified, converted, lost,
      temperature: { fire, hot, warm, cold },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      bySource: bySource.map((s) => ({ source: s.source ?? 'unknown', count: s._count })),
      averageScore: Math.round(avgScore._avg.score ?? 0),
      conversionRate: total > 0 ? `${((converted / total) * 100).toFixed(1)}%` : '0%',
    };
  }

  async getOne(id: string) {
    const lead = await this.prisma.marketingLead.findUnique({
      where: { id },
      include: { activities: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  private scoreOf(l: any): number {
    return calculateLeadScore({
      source: l.source ?? undefined,
      hasCompany: !!l.companyName,
      hasPhone: !!l.phone,
      hasEmail: !!l.email,
      companySize: l.companySize ?? undefined,
      emailsOpened: l.emailsOpened,
      emailsSent: l.emailsSent,
      meetingsHeld: l.meetingsHeld,
      demosAttended: l.demosAttended,
      budget: l.budget ?? undefined,
      timeline: l.timeline ?? undefined,
      decisionMaker: l.decisionMaker ?? undefined,
    });
  }

  async update(id: string, dto: UpdateLeadDto, adminId: string) {
    const lead = await this.getOne(id);

    const nextData: Prisma.MarketingLeadUpdateInput = {
      ...(dto.status && { status: dto.status as any }),
      ...(dto.temperature && { temperature: dto.temperature as any }),
      ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
      ...(dto.company !== undefined && { companyName: dto.company }),
      ...(dto.companySize !== undefined && { companySize: dto.companySize }),
      ...(dto.budget !== undefined && { budget: dto.budget }),
      ...(dto.timeline !== undefined && { timeline: dto.timeline }),
      ...(dto.decisionMaker !== undefined && { decisionMaker: dto.decisionMaker }),
      ...(dto.notes !== undefined && { internalNotes: dto.notes }),
      ...(dto.lostReason !== undefined && { lostReason: dto.lostReason }),
      lastContactAt: new Date(),
    };

    const merged = { ...lead, ...dto, companyName: dto.company ?? lead.companyName };
    const newScore = this.scoreOf(merged);
    nextData.score = newScore;
    if (!dto.temperature) nextData.temperature = scoreToTemperature(newScore) as any;

    const updated = await this.prisma.marketingLead.update({ where: { id }, data: nextData });
    await this.log(adminId, 'LEAD_UPDATED', id, { ...dto, newScore });
    return updated;
  }

  async assign(id: string, assigneeId: string, adminId: string) {
    await this.getOne(id);
    const updated = await this.prisma.marketingLead.update({
      where: { id },
      data: { assignedTo: assigneeId, assignedAt: new Date() },
    });
    await this.log(adminId, 'LEAD_ASSIGNED', id, { assigneeId });
    return updated;
  }

  async logActivity(id: string, dto: LogActivityDto, adminId: string) {
    await this.getOne(id);

    const activity = await this.prisma.leadActivity.create({
          data: {
            leadId: id,
            performedBy: adminId,
            activityType: dto.type as any,
            title: dto.summary,
            description: dto.details,
            outcome: dto.outcome,
          },
        });

    const counterUpdates: Prisma.MarketingLeadUpdateInput = { lastContactAt: new Date() };
    if (dto.type === 'EMAIL') counterUpdates.emailsSent = { increment: 1 };
    if (dto.type === 'MEETING') counterUpdates.meetingsHeld = { increment: 1 };
    if (dto.type === 'DEMO') counterUpdates.demosAttended = { increment: 1 };
    if (dto.type === 'CALL') counterUpdates.callsMade = { increment: 1 };
    await this.prisma.marketingLead.update({ where: { id }, data: counterUpdates });

    const refreshed = await this.prisma.marketingLead.findUnique({ where: { id } });
    if (refreshed) {
      const newScore = this.scoreOf(refreshed);
      await this.prisma.marketingLead.update({
        where: { id },
        data: { score: newScore, temperature: scoreToTemperature(newScore) as any },
      });
    }
    return activity;
  }

  async exportCsv(filters: ListLeadsDto) {
    const where: Prisma.MarketingLeadWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    if (filters.temperature) where.temperature = filters.temperature as any;
    if (filters.source) where.source = filters.source as any;

    const leads = await this.prisma.marketingLead.findMany({
      where, orderBy: { score: 'desc' }, take: 50000,
    });

    const header = 'name,email,phone,company,source,status,temperature,score,assigned_to,created_at,last_contact_at';
    const rows = leads.map((l) =>
      [
        `"${(l.fullName ?? '').replace(/"/g, '""')}"`,
        l.email ?? '', l.phone ?? '',
        `"${(l.companyName ?? '').replace(/"/g, '""')}"`,
        l.source ?? '', l.status, l.temperature, String(l.score),
        l.assignedTo ?? '',
        l.createdAt.toISOString(),
        l.lastContactAt?.toISOString() ?? '',
      ].join(','),
    );
    return { csv: [header, ...rows].join('\n'), count: leads.length };
  }
}

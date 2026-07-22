import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.bakeryProductionPlan.count({ where: { tenantId: user.tenantId } });
    const planNumber = 'PROD-' + new Date().getFullYear() + '-' + String(count + 1).padStart(4, '0');

    if (!dto.items?.length) throw new BadRequestException('At least one production item required');

    const totalItems = dto.items.reduce((s: number, it: any) => s + (Number(it.plannedQty) || 0), 0);

    return this.prisma.bakeryProductionPlan.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        planNumber,
        planDate: dto.planDate ? new Date(dto.planDate) : new Date(),
        shift: dto.shift,
        headBakerId: dto.headBakerId,
        notes: dto.notes,
        totalItems,
        createdById: user.id,
        items: {
          create: dto.items.map((it: any, idx: number) => ({
            productId: it.productId,
            productName: it.productName,
            category: it.category,
            cakeOrderId: it.cakeOrderId,
            plannedQty: Number(it.plannedQty) || 0,
            bakerId: it.bakerId,
            bakerName: it.bakerName,
            batchNumber: it.batchNumber,
            ovenNumber: it.ovenNumber,
            notes: it.notes,
            displayOrder: idx,
          })),
        },
      },
      include: { items: true },
    });
  }

  async listPlans(user: AuthenticatedUser, params: { status?: string; from?: string; to?: string }) {
    return this.prisma.bakeryProductionPlan.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.from || params.to ? {
          planDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      include: { items: true },
      orderBy: { planDate: 'desc' },
      take: 100,
    });
  }

  async getPlan(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.bakeryProductionPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async updatePlan(user: AuthenticatedUser, id: string, dto: any) {
    const plan = await this.prisma.bakeryProductionPlan.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    return this.prisma.bakeryProductionPlan.update({
      where: { id },
      data: {
        ...dto,
        planDate: dto.planDate ? new Date(dto.planDate) : undefined,
      },
      include: { items: true },
    });
  }

  async startPlan(user: AuthenticatedUser, id: string) {
    return this.prisma.bakeryProductionPlan.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
      include: { items: true },
    });
  }

  async completePlan(user: AuthenticatedUser, id: string) {
    const plan = await this.prisma.bakeryProductionPlan.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    const completedItems = plan.items.filter((it) => it.status === 'COMPLETED').length;
    const failedItems = plan.items.reduce((s, it) => s + it.failedQty, 0);

    return this.prisma.bakeryProductionPlan.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedItems,
        failedItems,
      },
      include: { items: true },
    });
  }

  async updateItem(user: AuthenticatedUser, itemId: string, dto: any) {
    const item = await this.prisma.bakeryProductionItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    return this.prisma.bakeryProductionItem.update({
      where: { id: itemId },
      data: {
        ...dto,
        bakingStartTime: dto.bakingStartTime ? new Date(dto.bakingStartTime) : undefined,
        bakingEndTime: dto.bakingEndTime ? new Date(dto.bakingEndTime) : undefined,
      },
    });
  }

  async startItemBaking(user: AuthenticatedUser, itemId: string, bakingTempC?: number, ovenNumber?: string) {
    return this.prisma.bakeryProductionItem.update({
      where: { id: itemId },
      data: {
        status: 'BAKING',
        bakingStartTime: new Date(),
        bakingTempC,
        ovenNumber,
      },
    });
  }

  async completeItem(user: AuthenticatedUser, itemId: string, dto: { producedQty: number; failedQty?: number; qualityGrade?: string; qualityCheckBy?: string; qualityNotes?: string }) {
    const item = await this.prisma.bakeryProductionItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const bakingEndTime = new Date();
    const bakingDurationMin = item.bakingStartTime ? Math.round((bakingEndTime.getTime() - item.bakingStartTime.getTime()) / 60000) : null;

    return this.prisma.bakeryProductionItem.update({
      where: { id: itemId },
      data: {
        producedQty: dto.producedQty,
        failedQty: dto.failedQty ?? 0,
        status: 'COMPLETED',
        bakingEndTime,
        bakingDurationMin,
        qualityGrade: dto.qualityGrade,
        qualityCheckBy: dto.qualityCheckBy,
        qualityNotes: dto.qualityNotes,
      },
    });
  }

  async today(user: AuthenticatedUser) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.prisma.bakeryProductionPlan.findMany({
      where: {
        tenantId: user.tenantId,
        planDate: { gte: start, lte: end },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

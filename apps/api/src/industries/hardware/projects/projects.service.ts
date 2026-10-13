import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertProjectDto, UpdateProjectStatusDto } from './dto/upsert-project.dto';
import { createWithDocNumber, LATEST_NUMBERS } from '../common/doc-number';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The form sends "" for an unpicked customer or branch; store those as empty links. */
  private async clean(user: AuthenticatedUser, dto: UpsertProjectDto) {
    const customerId = dto.customerId?.trim() || null;
    if (customerId) {
      const found = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
      if (!found) throw new NotFoundException('Customer nahi mila');
    }
    return { ...dto, customerId, shopId: dto.shopId?.trim() || null };
  }

  async create(user: AuthenticatedUser, input: UpsertProjectDto) {
    const dto = await this.clean(user, input);
    const prefix = `PRJ-${new Date().getFullYear()}-`;
    return createWithDocNumber({
      prefix,
      width: 4,
      existing: async () => (await this.prisma.hardwareProject.findMany({
        where: { tenantId: user.tenantId, projectNumber: { startsWith: prefix } },
        select: { projectNumber: true }, orderBy: { createdAt: 'desc' }, take: LATEST_NUMBERS,
      })).map((p) => p.projectNumber),
      create: (projectNumber) => this.prisma.hardwareProject.create({
        data: {
          tenantId: user.tenantId,
          projectNumber,
          ...dto,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : null,
          createdById: user.id,
        },
      }),
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; customerId?: string; city?: string; search?: string; active?: boolean }) {
    const rows = await this.prisma.hardwareProject.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.city && { city: { contains: params.city, mode: 'insensitive' } }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { projectNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    const totals = await this.financials(user.tenantId, rows);
    return rows.map((p) => ({ ...p, ...totals.get(p.id) }));
  }

  /**
   * Live project money, so the cards never show stale zeros.
   *  - quoted: accepted or billed quotations
   *  - ordered: POS bills tagged with the project (net of returns) plus the
   *    goods on delivery slips that are not tied to a bill
   *  - delivered: goods value that reached the site per delivery slips
   * POS lines carry `[Project: <number>]` in their internal note (set by the hardware POS).
   */
  private async financials(tenantId: string, projects: { id: string; projectNumber: string }[]) {
    const out = new Map<string, { totalQuoted: number; totalOrdered: number; totalDelivered: number; totalPending: number }>();
    if (!projects.length) return out;
    const ids = projects.map((p) => p.id);
    const r2 = (n: number) => Math.round(n * 100) / 100;

    const [quoted, deliveries, lines] = await Promise.all([
      this.prisma.hardwareQuotation.groupBy({
        by: ['projectId'],
        where: { tenantId, projectId: { in: ids }, status: { in: ['ACCEPTED', 'CONVERTED'] } },
        _sum: { total: true },
      }),
      this.prisma.hardwareDelivery.findMany({
        where: { tenantId, projectId: { in: ids }, status: { not: 'CANCELLED' } },
        select: { projectId: true, saleId: true, items: { select: { orderedQty: true, deliveredQty: true, unitPrice: true } } },
      }),
      this.prisma.saleItem.findMany({
        where: {
          sale: { tenantId, status: { not: 'VOIDED' } },
          OR: projects.map((p) => ({ internalNote: { contains: `[Project: ${p.projectNumber}]` } })),
        },
        select: { internalNote: true, quantity: true, returnedQty: true, total: true },
      }),
    ]);

    for (const p of projects) {
      const tag = `[Project: ${p.projectNumber}]`;
      const billed = lines
        .filter((l) => l.internalNote?.includes(tag))
        .reduce((s, l) => s + (l.quantity > 0 ? (l.total * (l.quantity - l.returnedQty)) / l.quantity : 0), 0);
      const own = deliveries.filter((d) => d.projectId === p.id);
      const slipOnly = own.filter((d) => !d.saleId).flatMap((d) => d.items)
        .reduce((s, it) => s + it.orderedQty * it.unitPrice, 0);
      const delivered = own.flatMap((d) => d.items)
        .reduce((s, it) => s + Math.min(it.deliveredQty, it.orderedQty) * it.unitPrice, 0);
      const ordered = billed + slipOnly;
      out.set(p.id, {
        totalQuoted: r2(quoted.find((q) => q.projectId === p.id)?._sum.total ?? 0),
        totalOrdered: r2(ordered),
        totalDelivered: r2(delivered),
        totalPending: r2(Math.max(ordered - delivered, 0)),
      });
    }
    return out;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Project not found');

    const [quotations, deliveries] = await Promise.all([
      this.prisma.hardwareQuotation.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      this.prisma.hardwareDelivery.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    const totals = await this.financials(user.tenantId, [p]);
    return { ...p, ...totals.get(p.id), quotations, deliveries };
  }

  async update(user: AuthenticatedUser, id: string, input: UpsertProjectDto) {
    const p = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Project not found');
    const dto = await this.clean(user, input);
    return this.prisma.hardwareProject.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        expectedEndDate: dto.expectedEndDate ? new Date(dto.expectedEndDate) : undefined,
      },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateProjectStatusDto) {
    const p = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Project not found');

    const patch: any = { status: dto.status };
    if (dto.status === 'COMPLETED') patch.actualEndDate = new Date();
    if (dto.notes) patch.notes = ((p.notes || '') + '\n' + dto.notes).trim();

    return this.prisma.hardwareProject.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Project not found');
    return this.prisma.hardwareProject.update({ where: { id }, data: { isActive: false } });
  }

  async recalculateFinancials(user: AuthenticatedUser, id: string) {
    const project = await this.prisma.hardwareProject.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!project) throw new NotFoundException('Project not found');
    const totals = (await this.financials(user.tenantId, [project])).get(id)!;
    return this.prisma.hardwareProject.update({ where: { id }, data: totals });
  }
}

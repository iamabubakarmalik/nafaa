import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateExchangeDto, UpdateExchangeStatusDto } from './dto/create-exchange.dto';

@Injectable()
export class ShoeExchangesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateExchangeDto) {
    const count = await this.prisma.shoeExchange.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const exchangeNumber = `EX-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.shoeExchange.create({
      data: {
        tenantId: user.tenantId,
        exchangeNumber,
        ...dto,
        colorChanged: dto.colorChanged ?? false,
        priceDifference: dto.priceDifference ?? 0,
        refundIssued: dto.refundIssued ?? 0,
        additionalCharged: dto.additionalCharged ?? 0,
        photoUrls: dto.photoUrls ?? [],
        handledById: user.id,
        status: 'REQUESTED',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    status?: string;
    reasonCategory?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return this.prisma.shoeExchange.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.reasonCategory && { reasonCategory: params.reasonCategory }),
        ...(params.from || params.to
          ? {
              requestedAt: {
                ...(params.from && { gte: new Date(params.from) }),
                ...(params.to && { lte: new Date(params.to) }),
              },
            }
          : {}),
        ...(params.search && {
          OR: [
            { exchangeNumber: { contains: params.search, mode: 'insensitive' } },
            { customerName: { contains: params.search, mode: 'insensitive' } },
            { customerPhone: { contains: params.search } },
            { productName: { contains: params.search, mode: 'insensitive' } },
            { originalInvoice: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const e = await this.prisma.shoeExchange.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Exchange not found');
    return e;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateExchangeStatusDto) {
    const e = await this.prisma.shoeExchange.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Exchange not found');
    const patch: any = { status: dto.status };
    if (dto.status === 'COMPLETED' && !e.processedAt) patch.processedAt = new Date();
    if (dto.notes) patch.notes = ((e.notes || '') + '\n' + dto.notes).trim();
    return this.prisma.shoeExchange.update({ where: { id }, data: patch });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const e = await this.prisma.shoeExchange.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Exchange not found');
    return this.prisma.shoeExchange.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const [requested, approved, completed, rejected] = await Promise.all([
      this.prisma.shoeExchange.count({ where: { tenantId: user.tenantId, status: 'REQUESTED' } }),
      this.prisma.shoeExchange.count({ where: { tenantId: user.tenantId, status: 'APPROVED' } }),
      this.prisma.shoeExchange.count({ where: { tenantId: user.tenantId, status: 'COMPLETED' } }),
      this.prisma.shoeExchange.count({ where: { tenantId: user.tenantId, status: 'REJECTED' } }),
    ]);
    return { requested, approved, completed, rejected };
  }

  async byReasonCategory(user: AuthenticatedUser) {
    const grouped = await this.prisma.shoeExchange.groupBy({
      by: ['reasonCategory'],
      where: { tenantId: user.tenantId, reasonCategory: { not: null } },
      _count: { _all: true },
    });
    return grouped;
  }
}

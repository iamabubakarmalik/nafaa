import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { startOfDayTz, endOfDayTz } from '../../../common/helpers/business-time.helper';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { applyStockDelta } from '../../../common/shop-scope';
import { postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { ensureSizeVariant, sizeLabel } from '../common/size-stock.helper';
import { CreateExchangeDto, UpdateExchangeStatusDto } from './dto/create-exchange.dto';

const STATUSES = ['REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED'];
const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

@Injectable()
export class ShoeExchangesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateExchangeDto) {
    const prefix = `EX-${new Date().getFullYear()}-`;
    const last = await this.prisma.shoeExchange.findFirst({
      where: { tenantId: user.tenantId, exchangeNumber: { startsWith: prefix } },
      orderBy: { exchangeNumber: 'desc' },
      select: { exchangeNumber: true },
    });
    const n = last ? parseInt(last.exchangeNumber.slice(prefix.length), 10) || 0 : 0;
    const exchangeNumber = `${prefix}${String(n + 1).padStart(4, '0')}`;
    if (dto.productId) {
      const p = await this.prisma.product.findFirst({ where: { id: dto.productId, tenantId: user.tenantId }, select: { id: true } });
      if (!p) throw new NotFoundException('Product nahi mila');
    }

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
                ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
                ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
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

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateExchangeStatusDto, activeShopId?: string | null) {
    const e = await this.prisma.shoeExchange.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Exchange not found');
    if (!STATUSES.includes(dto.status)) throw new BadRequestException('Status sahi nahi');
    if (e.status === 'COMPLETED' && dto.status !== 'COMPLETED') {
      throw new BadRequestException('Mukammal exchange wapas nahi badla ja sakta');
    }
    if (e.status === dto.status) return e;
    const patch: any = { status: dto.status };
    if (dto.status === 'COMPLETED' && !e.processedAt) patch.processedAt = new Date();
    if (dto.notes) patch.notes = ((e.notes || '') + '\n' + dto.notes).trim();
    if (dto.status !== 'COMPLETED') return this.prisma.shoeExchange.update({ where: { id }, data: patch });

    // Completing the exchange moves the stock: the returned pair goes back
    // on the shelf, the new pair leaves it. Extra money taken is a sale.
    const extra = r2(e.additionalCharged || Math.max(e.priceDifference, 0));
    if (e.refundIssued > 0 || e.priceDifference < -0.009) {
      throw new BadRequestException('Paise wapas dene hon to purane bill ki Wapsi (Returns) karein aur naya bill banayein');
    }
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, activeShopId);
      if (e.productId) {
        const sizes = await tx.shoeSizeVariant.findMany({ where: { tenantId: user.tenantId, productId: e.productId } });
        const pick = (value: string) => {
          const v = value.trim().toLowerCase();
          return sizes.find((s) => sizeLabel(s).toLowerCase() === v) ?? sizes.find((s) => s.size.trim().toLowerCase() === v);
        };
        const from = pick(e.originalSize);
        const to = pick(e.newSize);
        if (!from || !to) throw new BadRequestException(`Is product me size ${!from ? e.originalSize : e.newSize} nahi mila`);
        const note = `Exchange ${e.exchangeNumber}: ${sizeLabel(from)} wapas, ${sizeLabel(to)} diya`;
        for (const [sz, delta] of [[from, 1], [to, -1]] as const) {
          const variantId = await ensureSizeVariant(tx, { tenantId: user.tenantId, userId: user.id, shopId, size: sz });
          if (variantId) {
            await applyStockDelta({
              tx, tenantId: user.tenantId, shopId, productId: e.productId, variantId, delta,
              movementType: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT', reference: e.exchangeNumber, note,
              preventNegative: delta < 0, label: `Size ${sizeLabel(sz)}`, userId: user.id,
            });
          } else {
            if (delta < 0 && sz.stock < 1) throw new BadRequestException(`Size ${sizeLabel(sz)} stock me nahi`);
            await tx.shoeSizeVariant.update({ where: { id: sz.id }, data: { stock: { increment: delta } } });
          }
        }
      }
      if (extra > 0) {
        await postIndustrySale(tx, user, {
          saleNumber: e.exchangeNumber,
          sourceRef: e.exchangeNumber,
          shopId,
          customerId: e.customerId,
          lines: [{ label: `Exchange ${e.exchangeNumber}: ${e.productName} size ${e.originalSize} → ${e.newSize} (farq)`, amount: extra }],
          paidAmount: extra,
          paymentMethod: 'CASH',
        });
        patch.additionalCharged = extra;
      }
      return tx.shoeExchange.update({ where: { id }, data: patch });
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const e = await this.prisma.shoeExchange.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Exchange not found');
    if (e.status === 'COMPLETED') throw new BadRequestException('Mukammal exchange ka stock badal chuka hai — ise mitaya nahi ja sakta');
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

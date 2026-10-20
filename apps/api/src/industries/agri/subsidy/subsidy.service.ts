/**
 * Government subsidy claims (Kissan card, fertilizer and seed schemes).
 * The farmer pays the reduced price at the counter; the dealer claims the
 * subsidy part from the scheme. A claim moves PENDING → APPROVED →
 * DISBURSED, or is REJECTED; nothing here moves money or stock.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { shopYear } from '../agri-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const STATUSES = ['PENDING', 'APPROVED', 'DISBURSED', 'REJECTED'];

@Injectable()
export class SubsidyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: Record<string, unknown>) {
    const farmerId = str(dto?.farmerId, 60);
    if (!farmerId) throw new BadRequestException('Farmer chunein');
    const farmer = await this.prisma.agriFarmer.findFirst({ where: { id: farmerId, tenantId: user.tenantId }, select: { cnic: true, landAreaAcres: true } });
    if (!farmer) throw new NotFoundException('Farmer nahi mila');
    const schemeName = str(dto.schemeName, 120);
    if (!schemeName) throw new BadRequestException('Scheme ka naam likhein');
    const productType = str(dto.productType, 120);
    if (!productType) throw new BadRequestException('Kaunsa maal (DAP, beej…) likhein');
    const quantity = Number(dto.quantity);
    const originalPrice = r2(Number(dto.originalPrice));
    const subsidyAmount = r2(Number(dto.subsidyAmount));
    if (!(quantity > 0)) throw new BadRequestException('Quantity 0 se zyada likhein');
    if (!(originalPrice > 0)) throw new BadRequestException('Asal price likhein');
    if (!(subsidyAmount > 0)) throw new BadRequestException('Subsidy amount likhein');
    if (subsidyAmount > originalPrice) throw new BadRequestException('Subsidy asal price se zyada nahi ho sakti');

    const year = shopYear();
    const count = await this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId, claimNumber: { startsWith: `SUB-${year}-` } } });
    const docs = Array.isArray(dto.documentsSubmitted) ? dto.documentsSubmitted.map((d) => String(d).trim()).filter(Boolean).slice(0, 20) : [];

    return this.prisma.agriSubsidyClaim.create({
      data: {
        tenantId: user.tenantId,
        farmerId,
        claimNumber: `SUB-${year}-${String(count + 1).padStart(5, '0')}`,
        schemeName,
        govtScheme: str(dto.govtScheme, 120),
        productType,
        quantity,
        originalPrice,
        subsidyAmount,
        finalPrice: r2(originalPrice - subsidyAmount),
        farmerCnic: str(dto.farmerCnic, 20) ?? farmer.cnic,
        cropTarget: str(dto.cropTarget, 80),
        landAreaAcres: Number(dto.landAreaAcres) > 0 ? Number(dto.landAreaAcres) : farmer.landAreaAcres,
        documentsSubmitted: docs,
        notes: str(dto.notes, 2000),
      },
    });
  }

  private async where(user: AuthenticatedUser, params: { status?: string; farmerId?: string; schemeName?: string; search?: string }): Promise<Prisma.AgriSubsidyClaimWhereInput> {
    const q = params.search?.trim();
    const farmerIds = q
      ? (await this.prisma.agriFarmer.findMany({
        where: { tenantId: user.tenantId, OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] },
        select: { id: true }, take: 200,
      })).map((f) => f.id)
      : [];
    return {
      tenantId: user.tenantId,
      ...(params.status && STATUSES.includes(params.status) && { status: params.status }),
      ...(params.farmerId && { farmerId: params.farmerId }),
      ...(params.schemeName && { schemeName: { contains: params.schemeName, mode: 'insensitive' } }),
      ...(q && {
        OR: [
          { claimNumber: { contains: q, mode: 'insensitive' } },
          { farmerCnic: { contains: q } },
          { schemeName: { contains: q, mode: 'insensitive' } },
          { productType: { contains: q, mode: 'insensitive' } },
          ...(farmerIds.length ? [{ farmerId: { in: farmerIds } }] : []),
        ],
      }),
    };
  }

  /** Attaches the farmer's name, phone and village to each claim. */
  private async withFarmers<T extends { farmerId: string }>(tenantId: string, rows: T[]) {
    const farmers = rows.length
      ? await this.prisma.agriFarmer.findMany({
        where: { tenantId, id: { in: [...new Set(rows.map((r) => r.farmerId))] } },
        select: { id: true, fullName: true, phone: true, village: true },
      })
      : [];
    const by = new Map(farmers.map((f) => [f.id, f]));
    return rows.map((r) => ({ ...r, farmer: by.get(r.farmerId) ?? null }));
  }

  async list(user: AuthenticatedUser, params: { status?: string; farmerId?: string; schemeName?: string; search?: string }) {
    const rows = await this.prisma.agriSubsidyClaim.findMany({ where: await this.where(user, params), orderBy: { createdAt: 'desc' }, take: 500 });
    return this.withFarmers(user.tenantId, rows);
  }

  /** One page of claims with counts and amounts per status and per scheme. */
  async page(user: AuthenticatedUser, params: { status?: string; farmerId?: string; search?: string; page?: number; limit?: number }) {
    const limit = Math.min(Math.max(Number(params.limit) || 25, 1), 100);
    const page = Math.max(Number(params.page) || 1, 1);
    const base = await this.where(user, { ...params, status: undefined });
    const where = { ...base, ...(params.status && STATUSES.includes(params.status) && { status: params.status }) };
    const [rows, total, byStatus, schemes] = await Promise.all([
      this.prisma.agriSubsidyClaim.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.agriSubsidyClaim.count({ where }),
      this.prisma.agriSubsidyClaim.groupBy({ by: ['status'], where: base, _count: { _all: true }, _sum: { subsidyAmount: true } }),
      this.prisma.agriSubsidyClaim.groupBy({
        by: ['schemeName'], where: { ...base, status: { not: 'REJECTED' } }, _count: { _all: true }, _sum: { subsidyAmount: true },
        orderBy: { _sum: { subsidyAmount: 'desc' } }, take: 8,
      }),
    ]);
    const counts: Record<string, number> = {};
    const amounts: Record<string, number> = {};
    for (const g of byStatus) { counts[g.status] = g._count._all; amounts[g.status] = r2(g._sum.subsidyAmount ?? 0); }
    return {
      items: await this.withFarmers(user.tenantId, rows),
      total, page, limit, counts, amounts,
      analytics: { schemes: schemes.map((g) => ({ scheme: g.schemeName, claims: g._count._all, amount: r2(g._sum.subsidyAmount ?? 0) })) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.agriSubsidyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim nahi mila');
    return c;
  }

  private async move(user: AuthenticatedUser, id: string, from: string[], data: Record<string, unknown>, wrong: string) {
    const c = await this.getOne(user, id);
    if (!from.includes(c.status)) throw new BadRequestException(wrong);
    const done = await this.prisma.agriSubsidyClaim.updateMany({ where: { id, tenantId: user.tenantId, status: c.status }, data });
    if (!done.count) throw new BadRequestException('Claim abhi badla gaya — dobara khol kar dekhein');
    return this.getOne(user, id);
  }

  approve(user: AuthenticatedUser, id: string, approvedBy?: string) {
    return this.move(user, id, ['PENDING'], { status: 'APPROVED', approvedBy: str(approvedBy, 120), approvalDate: new Date() }, 'Sirf baqi (pending) claim manzoor hota hai');
  }

  reject(user: AuthenticatedUser, id: string, reason: string) {
    const why = str(reason, 300);
    if (!why) throw new BadRequestException('Wajah likhein');
    return this.move(user, id, ['PENDING', 'APPROVED'], { status: 'REJECTED', rejectionReason: why }, 'Mil chuka claim radd nahi hota');
  }

  markDisbursed(user: AuthenticatedUser, id: string) {
    return this.move(user, id, ['APPROVED'], { status: 'DISBURSED', disbursementDate: new Date() }, 'Pehle claim manzoor karein');
  }

  async summary(user: AuthenticatedUser) {
    const groups = await this.prisma.agriSubsidyClaim.groupBy({
      by: ['status'], where: { tenantId: user.tenantId }, _count: { _all: true }, _sum: { subsidyAmount: true },
    });
    const g = (s: string) => groups.find((x) => x.status === s);
    const count = (s: string) => g(s)?._count._all ?? 0;
    const amount = (s: string) => r2(g(s)?._sum.subsidyAmount ?? 0);
    return {
      total: groups.reduce((a, x) => a + x._count._all, 0),
      pending: count('PENDING'), approved: count('APPROVED'), disbursed: count('DISBURSED'), rejected: count('REJECTED'),
      totalSubsidyAmount: r2(amount('APPROVED') + amount('DISBURSED')),
      pendingAmount: amount('PENDING'), approvedAmount: amount('APPROVED'), disbursedAmount: amount('DISBURSED'),
    };
  }
}

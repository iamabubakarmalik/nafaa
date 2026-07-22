import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class SubsidyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId } });
    const claimNumber = 'SUB-' + new Date().getFullYear() + '-' + String(count + 1).padStart(5, '0');

    return this.prisma.agriSubsidyClaim.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        claimNumber,
        quantity: Number(dto.quantity) || 0,
        originalPrice: Number(dto.originalPrice) || 0,
        subsidyAmount: Number(dto.subsidyAmount) || 0,
        finalPrice: Number(dto.finalPrice) || 0,
        landAreaAcres: dto.landAreaAcres ? Number(dto.landAreaAcres) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; farmerId?: string; schemeName?: string; search?: string }) {
    return this.prisma.agriSubsidyClaim.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.farmerId && { farmerId: params.farmerId }),
        ...(params.schemeName && { schemeName: { contains: params.schemeName, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { claimNumber: { contains: params.search, mode: 'insensitive' } },
            { farmerCnic: { contains: params.search } },
            { schemeName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.agriSubsidyClaim.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Claim not found');
    return c;
  }

  async approve(user: AuthenticatedUser, id: string, approvedBy?: string) {
    return this.prisma.agriSubsidyClaim.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy, approvalDate: new Date() },
    });
  }

  async reject(user: AuthenticatedUser, id: string, reason: string) {
    return this.prisma.agriSubsidyClaim.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason },
    });
  }

  async markDisbursed(user: AuthenticatedUser, id: string) {
    return this.prisma.agriSubsidyClaim.update({
      where: { id },
      data: { status: 'DISBURSED', disbursementDate: new Date() },
    });
  }

  async summary(user: AuthenticatedUser) {
    const [total, pending, approved, disbursed, rejected, totalAmount] = await Promise.all([
      this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId } }),
      this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId, status: 'PENDING' } }),
      this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId, status: 'APPROVED' } }),
      this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId, status: 'DISBURSED' } }),
      this.prisma.agriSubsidyClaim.count({ where: { tenantId: user.tenantId, status: 'REJECTED' } }),
      this.prisma.agriSubsidyClaim.aggregate({
        where: { tenantId: user.tenantId, status: { in: ['APPROVED', 'DISBURSED'] } },
        _sum: { subsidyAmount: true },
      }),
    ]);
    return { total, pending, approved, disbursed, rejected, totalSubsidyAmount: totalAmount._sum.subsidyAmount ?? 0 };
  }
}

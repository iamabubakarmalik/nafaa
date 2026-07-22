import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async createPackage(user: AuthenticatedUser, dto: any) {
    const dup = await this.prisma.salonPackage.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Package "${dto.name}" exists`);
    return this.prisma.salonPackage.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async listPackages(user: AuthenticatedUser, params: { active?: boolean; featured?: boolean }) {
    return this.prisma.salonPackage.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updatePackage(user: AuthenticatedUser, id: string, dto: any) {
    const p = await this.prisma.salonPackage.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Package not found');
    return this.prisma.salonPackage.update({ where: { id }, data: dto });
  }

  async removePackage(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.salonPackage.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Package not found');
    return this.prisma.salonPackage.update({ where: { id }, data: { isActive: false } });
  }

  // Purchase
  async purchase(user: AuthenticatedUser, dto: { packageId: string; customerId: string; amountPaid: number; notes?: string }) {
    const pkg = await this.prisma.salonPackage.findFirst({ where: { id: dto.packageId, tenantId: user.tenantId } });
    if (!pkg) throw new NotFoundException('Package not found');

    const count = await this.prisma.salonPackagePurchase.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const purchaseNumber = `PKG-${year}-${String(count + 1).padStart(4, '0')}`;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + pkg.validityDays);

    const purchase = await this.prisma.salonPackagePurchase.create({
      data: {
        tenantId: user.tenantId,
        packageId: dto.packageId,
        customerId: dto.customerId,
        purchaseNumber,
        expiryDate,
        amountPaid: dto.amountPaid,
        sessionsRemaining: pkg.totalSessions,
        notes: dto.notes,
      },
    });

    await this.prisma.salonPackage.update({
      where: { id: dto.packageId },
      data: { totalSold: { increment: 1 } },
    });

    return purchase;
  }

  async listPurchases(user: AuthenticatedUser, params: { status?: string; customerId?: string }) {
    return this.prisma.salonPackagePurchase.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.customerId && { customerId: params.customerId }),
      },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async useSession(user: AuthenticatedUser, purchaseId: string, appointmentId: string) {
    const p = await this.prisma.salonPackagePurchase.findFirst({ where: { id: purchaseId, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Purchase not found');
    if (p.status !== 'ACTIVE') throw new BadRequestException('Package is not active');
    if (p.sessionsRemaining <= 0) throw new BadRequestException('No sessions remaining');

    const newUsed = p.sessionsUsed + 1;
    const newRemaining = p.sessionsRemaining - 1;
    const isFullyUsed = newRemaining <= 0;

    const log = (p.usageLog as any[]) || [];
    log.push({ appointmentId, usedAt: new Date().toISOString() });

    return this.prisma.salonPackagePurchase.update({
      where: { id: purchaseId },
      data: {
        sessionsUsed: newUsed,
        sessionsRemaining: newRemaining,
        status: isFullyUsed ? 'USED' : 'ACTIVE',
        usageLog: log,
      },
    });
  }
}

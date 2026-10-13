import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale } from '../../_shared/industry-sale.helper';

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
  async purchase(user: AuthenticatedUser, dto: { packageId: string; customerId: string; amountPaid: number; notes?: string; paymentMethod?: string; shopId?: string }) {
    const pkg = await this.prisma.salonPackage.findFirst({ where: { id: dto.packageId, tenantId: user.tenantId } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (!pkg.isActive) throw new BadRequestException('Ye package band hai');
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const amountPaid = Math.max(Number(dto.amountPaid) || 0, 0);
    if (amountPaid > pkg.price + 0.01) throw new BadRequestException(`Package ki qeemat sirf Rs ${pkg.price} hai`);

    const year = new Date().getFullYear();
    const prefix = `PKG-${year}-`;
    const last = await this.prisma.salonPackagePurchase.findFirst({
      where: { tenantId: user.tenantId, purchaseNumber: { startsWith: prefix } },
      orderBy: { purchaseNumber: 'desc' },
      select: { purchaseNumber: true },
    });
    const purchaseNumber = `${prefix}${String((last ? Number(last.purchaseNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(4, '0')}`;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + pkg.validityDays);

    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.salonPackagePurchase.create({
        data: {
          tenantId: user.tenantId,
          packageId: dto.packageId,
          customerId: dto.customerId,
          purchaseNumber,
          expiryDate,
          amountPaid,
          sessionsRemaining: pkg.totalSessions,
          notes: dto.notes,
        },
      });

      await tx.salonPackage.update({
        where: { id: dto.packageId },
        data: { totalSold: { increment: 1 } },
      });

      // Prepaid package is sold today; any unpaid part goes on khata.
      if (pkg.price > 0) {
        await postIndustrySale(tx, user, {
          saleNumber: `SLN-${purchaseNumber}`,
          sourceRef: purchaseNumber,
          shopId: dto.shopId,
          customerId: dto.customerId,
          lines: [{ label: `Package: ${pkg.name} (${pkg.totalSessions} sessions)`, amount: pkg.price }],
          paidAmount: amountPaid,
          paymentMethod: dto.paymentMethod,
        });
      }

      return purchase;
    });
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

  /**
   * Uses one prepaid session on an open appointment. The package was billed
   * when it was sold, so the matching service line on the appointment is
   * zeroed here; otherwise the customer would pay for it twice.
   */
  async useSession(user: AuthenticatedUser, purchaseId: string, appointmentId: string) {
    if (!appointmentId) throw new BadRequestException('Appointment chunein');
    const p = await this.prisma.salonPackagePurchase.findFirst({ where: { id: purchaseId, tenantId: user.tenantId }, include: { package: true } });
    if (!p) throw new NotFoundException('Purchase not found');
    if (p.status !== 'ACTIVE') throw new BadRequestException('Ye package active nahi hai');
    if (p.sessionsRemaining <= 0) throw new BadRequestException('Package ke sessions khatam ho gaye');
    if (p.expiryDate && p.expiryDate < new Date()) throw new BadRequestException('Package ki period khatam ho chuki hai');

    const apt = await this.prisma.salonAppointment.findFirst({
      where: { id: appointmentId, tenantId: user.tenantId },
      include: { services: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (apt.saleId) throw new BadRequestException('Is appointment ka bill ban chuka hai');
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') throw new BadRequestException('Cancel appointment par package nahi lagta');
    if (apt.customerId !== p.customerId) throw new BadRequestException('Ye package is customer ka nahi hai');

    const covered = new Set(
      (Array.isArray(p.package.services) ? (p.package.services as any[]) : [])
        .map((s) => (typeof s === 'string' ? s : s?.serviceId))
        .filter(Boolean),
    );
    const line = apt.services.find((s) => s.total > 0 && (covered.size === 0 || covered.has(s.serviceId)));
    if (!line) throw new BadRequestException('Is appointment me package wali koi service baqi nahi');

    const subtotal = Math.max(apt.subtotal - line.total, 0);
    const total = Math.max(subtotal + apt.serviceCharge + apt.taxAmount - apt.discount, 0);
    const newRemaining = p.sessionsRemaining - 1;
    const log = Array.isArray(p.usageLog) ? [...(p.usageLog as any[])] : [];
    log.push({ appointmentId, appointmentNumber: apt.appointmentNumber, serviceId: line.serviceId, usedAt: new Date().toISOString() });

    return this.prisma.$transaction(async (tx) => {
      await tx.salonAppointmentService.update({
        where: { id: line.id },
        data: { discount: line.price, total: 0, notes: `Package ${p.purchaseNumber}${line.notes ? ` · ${line.notes}` : ''}` },
      });
      await tx.salonAppointment.update({
        where: { id: apt.id },
        data: {
          subtotal,
          total,
          paymentStatus: apt.paidAmount >= total - 0.01 ? 'PAID' : apt.paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
        },
      });
      return tx.salonPackagePurchase.update({
        where: { id: purchaseId },
        data: {
          sessionsUsed: p.sessionsUsed + 1,
          sessionsRemaining: newRemaining,
          status: newRemaining <= 0 ? 'USED' : 'ACTIVE',
          usageLog: log,
        },
        include: { package: true },
      });
    });
  }
}

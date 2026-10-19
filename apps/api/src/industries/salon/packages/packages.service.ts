/**
 * Prepaid packages (e.g. 5 facials, a bridal package with trials): sold
 * once (income that day, any unpaid part or the rest after an advance goes
 * on khata), then used one session at a time on counter bills. A voided
 * package bill cancels the package (SalonBillVoidService).
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale } from '../../_shared/industry-sale.helper';
import { DAY_MS, r2, withNextNumber } from '../common/salon-common';
import { SalonBillsService, packageServiceIds } from '../bills/salon-bills.service';
import { CreatePackageDto, PurchaseDto, UpdatePackageDto } from './dto/package.dto';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bills: SalonBillsService,
  ) {}

  private async check(tenantId: string, dto: UpdatePackageDto, exceptId?: string) {
    if (dto.name) {
      const dup = await this.prisma.salonPackage.findFirst({
        where: { tenantId, name: { equals: dto.name.trim(), mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) }, select: { id: true },
      });
      if (dup) throw new BadRequestException(`"${dto.name.trim()}" naam ka package pehle se hai`);
    }
    if (dto.services?.length) {
      const ids = [...new Set(dto.services)];
      const n = await this.prisma.salonService.count({ where: { tenantId, id: { in: ids } } });
      if (n !== ids.length) throw new NotFoundException('Koi service nahi mili');
    }
  }

  async createPackage(user: AuthenticatedUser, dto: CreatePackageDto) {
    await this.check(user.tenantId, dto);
    return this.prisma.salonPackage.create({ data: { ...dto, name: dto.name.trim(), services: [...new Set(dto.services)], tenantId: user.tenantId } });
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

  async updatePackage(user: AuthenticatedUser, id: string, dto: UpdatePackageDto) {
    const p = await this.prisma.salonPackage.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Package nahi mila');
    await this.check(user.tenantId, { ...dto, name: dto.name && dto.name.trim().toLowerCase() !== p.name.toLowerCase() ? dto.name : undefined }, id);
    return this.prisma.salonPackage.update({
      where: { id },
      data: { ...dto, ...(dto.name && { name: dto.name.trim() }), ...(dto.services && { services: [...new Set(dto.services)] }) },
    });
  }

  async removePackage(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.salonPackage.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Package nahi mila');
    return this.prisma.salonPackage.update({ where: { id }, data: { isActive: false } });
  }

  async purchase(user: AuthenticatedUser, dto: PurchaseDto) {
    const pkg = await this.prisma.salonPackage.findFirst({ where: { id: dto.packageId, tenantId: user.tenantId } });
    if (!pkg) throw new NotFoundException('Package nahi mila');
    if (!pkg.isActive) throw new BadRequestException('Ye package band hai');
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const amountPaid = r2(dto.amountPaid);
    if (amountPaid > pkg.price + 0.01) throw new BadRequestException(`Package ki qeemat sirf Rs ${pkg.price} hai`);

    const expiryDate = new Date(Date.now() + pkg.validityDays * DAY_MS);
    return withNextNumber(
      (prefix) => this.prisma.salonPackagePurchase.findFirst({ where: { tenantId: user.tenantId, purchaseNumber: { startsWith: prefix } }, orderBy: { purchaseNumber: 'desc' }, select: { purchaseNumber: true } }).then((r) => r?.purchaseNumber),
      `PKG-${new Date().getUTCFullYear()}-`,
      (purchaseNumber) => this.prisma.$transaction(async (tx) => {
        const purchase = await tx.salonPackagePurchase.create({
          data: {
            tenantId: user.tenantId, packageId: dto.packageId, customerId: dto.customerId, purchaseNumber, expiryDate, amountPaid,
            sessionsRemaining: pkg.totalSessions, notes: dto.notes?.trim() || null,
          },
        });
        await tx.salonPackage.update({ where: { id: dto.packageId }, data: { totalSold: { increment: 1 } } });
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
      }),
    );
  }

  async cancelPurchase(user: AuthenticatedUser, id: string, reason?: string) {
    const p = await this.prisma.salonPackagePurchase.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Package nahi mila');
    if (p.status === 'CANCELLED') throw new BadRequestException('Ye package pehle hi cancel hai');
    return this.prisma.salonPackagePurchase.update({
      where: { id },
      data: { status: 'CANCELLED', notes: [p.notes, `Cancel: ${reason?.trim() || 'wajah nahi likhi'}`].filter(Boolean).join('\n') },
    });
  }

  async listPurchases(user: AuthenticatedUser, params: { status?: string; customerId?: string; search?: string }) {
    await this.prisma.salonPackagePurchase.updateMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', expiryDate: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    const term = params.search?.trim();
    const customerIds = term
      ? (await this.prisma.customer.findMany({
          where: { tenantId: user.tenantId, OR: [{ name: { contains: term, mode: 'insensitive' } }, { phone: { contains: term } }] },
          select: { id: true }, take: 200,
        })).map((c) => c.id)
      : undefined;
    const rows = await this.prisma.salonPackagePurchase.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as never }),
        ...(params.customerId && { customerId: params.customerId }),
        ...(term && { OR: [{ purchaseNumber: { contains: term, mode: 'insensitive' as const } }, { customerId: { in: customerIds } }] }),
      },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const [customers, sales] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.customerId))] } }, select: { id: true, name: true, phone: true, balance: true } }),
      this.prisma.sale.findMany({ where: { tenantId: user.tenantId, saleNumber: { in: rows.map((r) => `SLN-${r.purchaseNumber}`) } }, select: { saleNumber: true, status: true, total: true, creditAmount: true } }),
    ]);
    const byId = new Map(customers.map((c) => [c.id, c]));
    const saleOf = new Map(sales.map((s) => [s.saleNumber, s]));
    return rows.map((r) => ({ ...r, customer: byId.get(r.customerId) ?? null, sale: saleOf.get(`SLN-${r.purchaseNumber}`) ?? null }));
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
    await this.bills.assertSaleAlive(user.tenantId, `SLN-${p.purchaseNumber}`, p.purchaseNumber);

    const apt = await this.prisma.salonAppointment.findFirst({
      where: { id: appointmentId, tenantId: user.tenantId },
      include: { services: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!apt) throw new NotFoundException('Appointment nahi mili');
    if (apt.saleId) throw new BadRequestException('Is appointment ka bill ban chuka hai');
    if (apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') throw new BadRequestException('Cancel appointment par package nahi lagta');
    if (apt.customerId !== p.customerId) throw new BadRequestException('Ye package is customer ka nahi hai');

    const covered = packageServiceIds(p.package.services);
    const line = apt.services.find((s) => s.total > 0 && (covered.size === 0 || covered.has(s.serviceId)));
    if (!line) throw new BadRequestException('Is appointment me package wali koi service baqi nahi');

    const subtotal = Math.max(apt.subtotal - line.total, 0);
    const total = Math.max(subtotal + apt.serviceCharge + apt.taxAmount - apt.discount, 0);
    const newRemaining = p.sessionsRemaining - 1;
    const log = Array.isArray(p.usageLog) ? [...(p.usageLog as Prisma.JsonArray)] : [];
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

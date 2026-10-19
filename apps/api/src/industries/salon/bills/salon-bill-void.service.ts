/**
 * A salon bill voided at the counter. The shared void has already put the
 * money, khata and retail stock back; this settles the salon's own records:
 *
 * - Appointment bill: the appointment goes back to "work done, bill due"
 *   (its bill link is cleared and the void is noted on it), package
 *   sessions it used are given back, and the membership, staff, service and
 *   customer totals are taken back out. It can then be billed again.
 * - Membership or package sale: that membership or package is cancelled.
 *
 * A membership or package bill that comes back in full (a return) cancels
 * it the same way. Nothing is deleted; package usage entries are marked as voided.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReturnsService } from '../../../modules/sales/returns/returns.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { paidOnKhata } from '../../_shared/industry-sale.helper';
import { r2 } from '../common/salon-common';
import { SalonBillsService } from './salon-bills.service';

@Injectable()
export class SalonBillVoidService implements OnModuleInit {
  private readonly log = new Logger(SalonBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
    private readonly bills: SalonBillsService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handleSale(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided salon bill ${saleId} not settled: ${(e as Error).message}`);
    }));
    this.returns.onReturn((tenantId, saleId) => this.handleReturn(tenantId, saleId).catch((e) => {
      this.log.warn(`Returned salon bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  /** A membership or package bill returned in full cancels what it sold. */
  async handleReturn(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true, status: true } });
    if (!sale || sale.status !== 'FULLY_RETURNED') return null;
    return this.cancelSold(tenantId, sale.saleNumber, `Bill ${sale.saleNumber} wapas`);
  }

  /** Cancels the membership or package a SLN-MEM-/SLN-PKG- bill sold; null for other bills. */
  private cancelSold(tenantId: string, saleNumber: string, note: string) {
    if (saleNumber.startsWith('SLN-MEM-')) {
      return this.prisma.salonMembership.updateMany({
        where: { tenantId, membershipNumber: saleNumber.slice(4), status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: note },
      });
    }
    if (saleNumber.startsWith('SLN-PKG-')) {
      return this.prisma.salonPackagePurchase.updateMany({
        where: { tenantId, purchaseNumber: saleNumber.slice(4), status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED', notes: note },
      });
    }
    return null;
  }

  async handleSale(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { id: true, saleNumber: true, status: true, total: true } });
    if (!sale || sale.status !== 'VOIDED') return null;
    const note = `Bill ${sale.saleNumber} void`;

    const sold = this.cancelSold(tenantId, sale.saleNumber, note);
    if (sold) return sold;

    const apt = await this.prisma.salonAppointment.findFirst({ where: { tenantId, saleId: sale.id }, include: { services: true } });
    if (!apt) return null;
    const advance = await paidOnKhata(this.prisma as unknown as Prisma.TransactionClient, tenantId, apt.appointmentNumber);

    return this.prisma.$transaction(async (tx) => {
      // Only the first run finds the bill still linked.
      const freed = await tx.salonAppointment.updateMany({
        where: { id: apt.id, saleId: sale.id },
        data: {
          saleId: null,
          status: 'IN_PROGRESS',
          paidAmount: advance,
          paymentStatus: advance > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
          internalNotes: `${apt.internalNotes ? `${apt.internalNotes}\n` : ''}${note} — dobara bill banayein`,
        },
      });
      if (!freed.count) return null;

      const purchases = apt.customerId
        ? await tx.salonPackagePurchase.findMany({ where: { tenantId, customerId: apt.customerId } })
        : [];
      for (const p of purchases) {
        const log = Array.isArray(p.usageLog) ? (p.usageLog as Prisma.JsonObject[]) : [];
        let back = 0;
        const next = log.map((e) => {
          if (e?.saleId !== sale.id || e?.voided) return e;
          back += 1;
          return { ...e, voided: true };
        });
        if (!back) continue;
        const left = p.sessionsRemaining + back;
        await tx.salonPackagePurchase.update({
          where: { id: p.id },
          data: {
            sessionsUsed: Math.max(p.sessionsUsed - back, 0),
            sessionsRemaining: left,
            status: p.status === 'USED' && left > 0 ? 'ACTIVE' : p.status,
            usageLog: next as Prisma.InputJsonValue,
          },
        });
      }

      if (apt.membershipId) {
        const m = await tx.salonMembership.findFirst({ where: { id: apt.membershipId, tenantId }, include: { plan: true } });
        const lines = apt.services.filter((s) => !(s.notes ?? '').includes('Package '));
        if (m && lines.length) {
          const saved = r2(lines.reduce((s, l) => s + (l.price * m.plan.discountPct) / 100, 0));
          await tx.salonMembership.update({
            where: { id: m.id },
            data: { usedServices: Math.max(m.usedServices - lines.length, 0), totalSaved: Math.max(r2(m.totalSaved - saved), 0) },
          });
        }
      }

      await this.bills.bumpTotals(tx, tenantId, apt.services, -1);
      if (apt.customerId) await this.bills.bumpProfile(tx, tenantId, apt.customerId, r2(sale.total), -1);
      return { appointmentId: apt.id };
    });
  }
}

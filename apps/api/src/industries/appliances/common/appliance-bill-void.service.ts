/**
 * Keeps appliance records in step with bills voided or returned at the
 * counter. The shared void has already put back money, khata and stock;
 * this settles the appliance side:
 *
 * - Installation or service bill voided: the job reopens as "work going on",
 *   its paid amount becomes what is on khata for it, and the technician's
 *   totals (and AMC visit counts) are taken back. It can be completed and
 *   billed again (the next bill gets a `-2` suffix).
 * - AMC bill voided: the contract is cancelled.
 * - Delivery bill voided: the trip goes back to "arrived".
 * - Sale bill of an old unit taken in trade voided: the unit is back in the shop.
 * - Goods bill voided: its serial units go back in stock, its trade-ins are
 *   free for another bill, and installations
 *   or deliveries booked for it that have not happened are cancelled.
 * - Goods returned: serial units beyond what is still kept go back in stock.
 *
 * Nothing is deleted; each change leaves a dated note.
 */
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReturnsService } from '../../../modules/sales/returns/returns.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { paidOnKhata } from '../../_shared/industry-sale.helper';
import { jobNumberOfBill } from './books';
import { r2, stamp } from './appliance-common';

type Db = Prisma.TransactionClient;

/** Fields cleared when a sold unit goes back on the shelf. */
export const UNSOLD = {
  status: 'IN_STOCK', saleId: null, invoiceNumber: null, soldAt: null, soldPrice: null,
  soldToCustomerId: null, customerName: null, customerPhone: null, deliveryAddress: null,
  warrantyStartDate: null, warrantyEndDate: null, compressorWarrantyEndDate: null, motorWarrantyEndDate: null,
} satisfies Prisma.ApplianceSerialTrackingUpdateManyMutationInput;

@Injectable()
export class ApplianceBillVoidService implements OnModuleInit {
  private readonly log = new Logger(ApplianceBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handleVoid(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided appliance bill ${saleId} not settled: ${(e as Error).message}`);
    }));
    this.returns.onReturn((tenantId, saleId) => this.handleReturn(tenantId, saleId).catch((e) => {
      this.log.warn(`Returned appliance bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  async handleVoid(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { id: true, saleNumber: true, status: true, total: true } });
    if (!sale || sale.status !== 'VOIDED') return null;
    const note = `Bill ${sale.saleNumber} void`;
    const job = jobNumberOfBill(sale.saleNumber);

    return this.prisma.$transaction(async (tx) => {
      if (job?.startsWith('INST-')) return this.reopenInstallation(tx, tenantId, job, note);
      if (job?.startsWith('SR-')) return this.reopenService(tx, tenantId, job, note);
      if (job?.startsWith('AMC-')) {
        const c = await tx.applianceAmcContract.findFirst({ where: { tenantId, contractNumber: job, status: { not: 'CANCELLED' } } });
        if (!c) return null;
        return tx.applianceAmcContract.update({
          where: { id: c.id },
          data: { status: 'CANCELLED', paidAmount: await paidOnKhata(tx, tenantId, job), notes: stamp(c.notes, `${note} — contract cancel`) },
        });
      }
      if (job?.startsWith('WC-')) {
        // Money from the brand taken back: the claim waits for payment again.
        const c = await tx.applianceWarrantyClaim.findFirst({ where: { tenantId, claimNumber: job } });
        if (!c) return null;
        const received = Math.max(r2(Number(c.receivedAmount) - Number(sale.total)), 0);
        return tx.applianceWarrantyClaim.update({
          where: { id: c.id },
          data: { receivedAmount: received, ...(received <= 0 && { status: 'APPROVED', settledAt: null }), notes: stamp(c.notes, `${note} — brand ka wusool wapas`) },
        });
      }
      if (job?.startsWith('ATI-')) {
        // An old unit's sale bill voided: the unit is back in the shop.
        return tx.applianceTradeIn.updateMany({ where: { tenantId, code: job, status: 'SOLD' }, data: { status: 'HELD' } });
      }
      if (job?.startsWith('APDL-')) {
        const d = await tx.applianceDelivery.findFirst({ where: { tenantId, deliveryNumber: job, status: 'DELIVERED' } });
        if (!d) return null;
        return tx.applianceDelivery.update({ where: { id: d.id }, data: { status: 'ARRIVED', deliveredAt: null, notes: stamp(d.notes, `${note} — dobara confirm karein`) } });
      }

      // A goods bill: units back on the shelf, old units taken in trade free for
      // another bill, visits that have not happened called off.
      await tx.applianceSerialTracking.updateMany({ where: { tenantId, saleId: sale.id, status: 'SOLD' }, data: UNSOLD });
      await tx.applianceTradeIn.updateMany({ where: { tenantId, saleId: sale.id }, data: { saleId: null } });
      const installs = await tx.applianceInstallation.findMany({
        where: { tenantId, saleId: sale.id, status: { in: ['PENDING', 'SCHEDULED', 'ASSIGNED', 'RESCHEDULED'] } },
        select: { id: true, internalNotes: true },
      });
      for (const i of installs) {
        await tx.applianceInstallation.update({
          where: { id: i.id },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: note, internalNotes: stamp(i.internalNotes, `${note} — installation cancel`) },
        });
      }
      const trips = await tx.applianceDelivery.findMany({
        where: { tenantId, saleId: sale.id, status: { in: ['PENDING', 'SCHEDULED'] } },
        select: { id: true, notes: true },
      });
      for (const d of trips) {
        await tx.applianceDelivery.update({ where: { id: d.id }, data: { status: 'CANCELLED', notes: stamp(d.notes, `${note} — delivery cancel`) } });
      }
      return { installs: installs.length, trips: trips.length };
    });
  }

  /** Units of a part-returned bill beyond what the customer still keeps go back in stock. */
  async handleReturn(tenantId: string, saleId: string) {
    const units = await this.prisma.applianceSerialTracking.findMany({
      where: { tenantId, saleId, status: 'SOLD' },
      orderBy: { soldAt: 'desc' },
      select: { id: true, productId: true, notes: true },
    });
    if (!units.length) return null;
    const lines = await this.prisma.saleItem.findMany({ where: { saleId, productId: { in: [...new Set(units.map((u) => u.productId))] } }, select: { productId: true, quantity: true, returnedQty: true } });
    const kept = new Map<string, number>();
    for (const l of lines) kept.set(l.productId!, (kept.get(l.productId!) ?? 0) + Math.max(Number(l.quantity) - Number(l.returnedQty), 0));
    const back: string[] = [];
    const seen = new Map<string, number>();
    // Newest units go back first; the earliest units stay with the customer.
    for (const u of [...units].reverse()) {
      const n = (seen.get(u.productId) ?? 0) + 1;
      seen.set(u.productId, n);
      if (n > Math.floor(kept.get(u.productId) ?? 0)) back.push(u.id);
    }
    if (!back.length) return null;
    return this.prisma.applianceSerialTracking.updateMany({ where: { tenantId, id: { in: back }, status: 'SOLD' }, data: UNSOLD });
  }

  private async techBack(tx: Db, tenantId: string, technicianId: string | null, total: number) {
    if (!technicianId) return;
    const t = await tx.applianceTechnician.findFirst({ where: { id: technicianId, tenantId }, select: { id: true, commissionPct: true, totalJobs: true, completedJobs: true, totalRevenue: true, totalCommission: true } });
    if (!t) return;
    const commission = total * ((Number(t.commissionPct) || 0) / 100);
    await tx.applianceTechnician.update({
      where: { id: t.id },
      data: {
        totalJobs: Math.max(t.totalJobs - 1, 0),
        completedJobs: Math.max(t.completedJobs - 1, 0),
        totalRevenue: Math.max(r2(Number(t.totalRevenue) - total), 0),
        totalCommission: Math.max(r2(Number(t.totalCommission) - commission), 0),
      },
    });
  }

  private async reopenInstallation(tx: Db, tenantId: string, number: string, note: string) {
    const i = await tx.applianceInstallation.findFirst({ where: { tenantId, installationNumber: number, status: 'COMPLETED' } });
    if (!i) return null;
    await this.techBack(tx, tenantId, i.technicianId, Number(i.totalCharge));
    if (i.serialTrackingId) {
      await tx.applianceSerialTracking.updateMany({ where: { id: i.serialTrackingId, tenantId }, data: { installationStatus: 'IN_PROGRESS', installedAt: null } });
    }
    return tx.applianceInstallation.update({
      where: { id: i.id },
      data: {
        status: 'IN_PROGRESS', completedAt: null, paidByCustomer: await paidOnKhata(tx, tenantId, number),
        internalNotes: stamp(i.internalNotes, `${note} — kaam dobara khula, theek kar ke dobara mukammal karein`),
      },
    });
  }

  private async reopenService(tx: Db, tenantId: string, number: string, note: string) {
    const r = await tx.applianceServiceRequest.findFirst({ where: { tenantId, requestNumber: number, status: 'COMPLETED' } });
    if (!r) return null;
    await this.techBack(tx, tenantId, r.technicianId, Number(r.totalCharge));
    if (r.amcContractNumber && r.coveredUnderAmc) {
      const amc = await tx.applianceAmcContract.findFirst({ where: { tenantId, contractNumber: r.amcContractNumber } });
      if (amc) {
        await tx.applianceAmcContract.update({
          where: { id: amc.id },
          data: {
            freeVisitsUsed: Math.max(amc.freeVisitsUsed - 1, 0),
            totalVisitsUsed: Math.max(amc.totalVisitsUsed - 1, 0),
            totalPartsClaimed: Math.max(r2(Number(amc.totalPartsClaimed) - Number(r.partsCharge)), 0),
            totalLaborSaved: Math.max(r2(Number(amc.totalLaborSaved) - Number(r.laborCharge) - Number(r.visitCharge)), 0),
          },
        });
      }
    }
    return tx.applianceServiceRequest.update({
      where: { id: r.id },
      data: {
        status: 'IN_PROGRESS', completedAt: null, paidAmount: await paidOnKhata(tx, tenantId, number),
        internalNotes: stamp(r.internalNotes, `${note} — kaam dobara khula, theek kar ke dobara mukammal karein`),
      },
    });
  }
}

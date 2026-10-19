/**
 * A delivery bill voided from Sales history: the shared void has already put
 * the khata and the milk stock back; this cancels the delivery so the sheet,
 * the customer's totals and the monthly bill agree. Entries the delivery
 * screen is undoing itself have already left DELIVERED and are left alone.
 */
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { r2 } from '../dairy-common';
import { deliveryBillBase, deliveryIdPrefix } from './deliveries.service';

@Injectable()
export class DairyDeliveryVoidService implements OnModuleInit {
  private readonly log = new Logger(DairyDeliveryVoidService.name);

  constructor(private readonly prisma: PrismaService, private readonly sales: SalesService) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handle(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided delivery bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  async handle(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId, status: 'VOIDED' }, select: { saleNumber: true } });
    const prefix = sale && deliveryIdPrefix(sale.saleNumber);
    if (!prefix) return null;
    const d = await this.prisma.dairyDelivery.findFirst({ where: { tenantId, id: { startsWith: prefix }, status: 'DELIVERED' } });
    if (!d || deliveryBillBase(d.id) !== sale!.saleNumber.replace(/-\d+$/, '')) return null;
    // A newer bill for the same delivery (a corrected quantity) keeps it delivered.
    const live = await this.prisma.sale.count({ where: { tenantId, saleNumber: { startsWith: deliveryBillBase(d.id) }, status: { not: 'VOIDED' } } });
    if (live > 0) return null;

    return this.prisma.$transaction(async (tx) => {
      const ok = await tx.dairyDelivery.updateMany({
        where: { id: d.id, status: 'DELIVERED' },
        data: { status: 'CANCELLED', skipReason: `Bill ${sale!.saleNumber} void`, deliveredQty: 0, paidAmount: 0, isPaid: false },
      });
      if (!ok.count) return null;
      await tx.dairyCustomer.update({
        where: { id: d.dairyCustomerId },
        data: {
          currentBalance: { decrement: r2(d.totalAmount - d.paidAmount) },
          totalPurchases: { decrement: d.totalAmount },
          totalDeliveries: { decrement: 1 },
        },
      });
      return d.id;
    });
  }
}

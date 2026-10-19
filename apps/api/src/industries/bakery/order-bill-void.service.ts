/**
 * A cake or bulk order whose delivery bill is voided goes back to "ready".
 *
 * The bill's lines carry the note "Order <number>". Voiding the bill takes
 * its sale and payments out of the books, so the order keeps as received only
 * the advance still held on the customer's khata, and can be billed again.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesService } from '../../modules/sales/sales/sales.service';
import { orderMoney } from './bakery-common';
import { findOrderBill } from './cake-orders/cake-orders.service';

const NOTE = 'Order ';

@Injectable()
export class OrderBillVoidService implements OnModuleInit {
  private readonly log = new Logger(OrderBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.reopen(tenantId, saleId).catch((e) => this.log.warn(`Order of voided bill ${saleId} not reopened: ${(e as Error).message}`)));
  }

  async reopen(tenantId: string, saleId: string) {
    const line = await this.prisma.saleItem.findFirst({
      where: { saleId, note: { startsWith: NOTE }, sale: { tenantId, status: 'VOIDED' } },
      select: { note: true },
    });
    const orderNumber = line?.note?.slice(NOTE.length).trim();
    if (!orderNumber) return;
    // Another live bill for the same order keeps it delivered.
    if (await findOrderBill(this.prisma, tenantId, orderNumber)) return;

    const cake = await this.prisma.bakeryCakeOrder.findFirst({ where: { tenantId, orderNumber, status: 'DELIVERED' } });
    if (cake) {
      const { khataPaid } = await orderMoney(this.prisma, tenantId, orderNumber, cake.paidAmount);
      await this.prisma.bakeryCakeOrder.updateMany({
        where: { id: cake.id, status: 'DELIVERED' },
        data: { status: 'READY', deliveredAt: null, paidAmount: khataPaid, paymentStatus: khataPaid > 0 ? (khataPaid >= cake.total - 0.005 ? 'PAID' : 'DEPOSIT_PAID') : 'UNPAID' },
      });
      return;
    }
    const bulk = await this.prisma.bakeryBulkOrder.findFirst({ where: { tenantId, orderNumber, status: 'DELIVERED' } });
    if (bulk) {
      const { khataPaid } = await orderMoney(this.prisma, tenantId, orderNumber, bulk.paidAmount);
      const total = bulk.finalPrice ?? bulk.quotedPrice;
      await this.prisma.bakeryBulkOrder.updateMany({
        where: { id: bulk.id, status: 'DELIVERED' },
        data: { status: 'READY', paidAmount: khataPaid, paymentStatus: khataPaid <= 0 ? 'QUOTED' : khataPaid >= total - 0.005 ? 'PAID' : 'PARTIALLY_PAID' },
      });
    }
  }
}

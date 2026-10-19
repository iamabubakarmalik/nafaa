/**
 * A meat order whose bill is voided goes back to "ready". Voiding takes the
 * bill and its payments out of the books, so the order keeps as received only
 * the advance still held on the customer's khata, and can be billed again.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { SUB_PREFIX } from './weight-orders.service';
import { findOrderBill, orderNote, r2, recordMoney } from '../meat-money';

const PREFIX = orderNote('MW-');

@Injectable()
export class MeatOrderBillVoidService implements OnModuleInit {
  private readonly log = new Logger(MeatOrderBillVoidService.name);

  constructor(private readonly prisma: PrismaService, private readonly sales: SalesService) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.reopen(tenantId, saleId).catch((e) => this.log.warn(`Meat order of voided bill ${saleId} not reopened: ${(e as Error).message}`)));
  }

  async reopen(tenantId: string, saleId: string) {
    const line = await this.prisma.saleItem.findFirst({
      where: { saleId, note: { startsWith: PREFIX }, sale: { tenantId, status: 'VOIDED' } },
      select: { note: true, sale: { select: { total: true } } },
    });
    const orderNumber = line?.note?.slice(orderNote('').length).trim();
    if (!orderNumber) return;
    if (await findOrderBill(this.prisma, tenantId, orderNumber)) return;
    const o = await this.prisma.meatWeightOrder.findFirst({ where: { tenantId, orderNumber, status: 'DELIVERED' } });
    if (!o) return;
    const { khataPaid } = await recordMoney(this.prisma, tenantId, orderNumber, o.paidAmount);
    const done = await this.prisma.meatWeightOrder.updateMany({
      where: { id: o.id, status: 'DELIVERED' },
      data: { status: 'READY', deliveredAt: null, paidAmount: khataPaid, paymentStatus: khataPaid <= 0.005 ? 'UNPAID' : khataPaid >= o.total - 0.005 ? 'PAID' : 'PARTIALLY_PAID' },
    });
    if (done.count && o.occasion?.startsWith(SUB_PREFIX)) {
      await this.prisma.meatSubscription.updateMany({
        where: { tenantId, subscriptionNumber: o.occasion.slice(SUB_PREFIX.length).trim(), totalDeliveries: { gt: 0 } },
        data: { totalDeliveries: { decrement: 1 }, totalRevenue: { decrement: r2(line?.sale.total) } },
      });
    }
  }
}

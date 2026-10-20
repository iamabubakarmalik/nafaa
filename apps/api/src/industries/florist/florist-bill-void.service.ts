/**
 * A florist bill voided or fully returned at the counter. The shared void
 * and return have already put money, khata and stock back; this settles
 * the florist's own records:
 *
 * - Counter bill with a delivery order: the order is cancelled.
 * - Wedding bill (FLW-…) voided: the contract goes back to confirmed so it
 *   can be completed again; the family's payments stay on their khata.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReturnsService } from '../../modules/sales/returns/returns.service';
import { SalesService } from '../../modules/sales/sales/sales.service';
import { FloristOrdersService } from './orders/orders.service';
import { WeddingContractsService } from './wedding-contracts/wedding-contracts.service';

@Injectable()
export class FloristBillVoidService implements OnModuleInit {
  private readonly log = new Logger(FloristBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
    private readonly orders: FloristOrdersService,
    private readonly weddings: WeddingContractsService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.settle(tenantId, saleId, 'VOIDED').catch((e) => {
      this.log.warn(`Voided florist bill ${saleId} not settled: ${(e as Error).message}`);
    }));
    this.returns.onReturn((tenantId, saleId) => this.settle(tenantId, saleId, 'FULLY_RETURNED').catch((e) => {
      this.log.warn(`Returned florist bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  async settle(tenantId: string, saleId: string, expected: 'VOIDED' | 'FULLY_RETURNED') {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true, status: true, sourceRef: true } });
    if (!sale || sale.status !== expected) return null;
    const why = expected === 'VOIDED' ? `Bill ${sale.saleNumber} void` : `Bill ${sale.saleNumber} poora wapas`;
    if (sale.saleNumber.startsWith('FLW-') && sale.sourceRef && expected === 'VOIDED') {
      return this.weddings.reopenAfterVoid(tenantId, sale.sourceRef, sale.saleNumber);
    }
    return this.orders.cancelForBill(tenantId, sale.saleNumber, why);
  }
}

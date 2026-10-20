/**
 * Optical bills undone at the counter. The shared void or return has already
 * settled money, khata and stock; this settles the optical records:
 *
 * - A glasses / repair hand-over bill voided (or returned in full) closes
 *   its order as cancelled, with the bill noted on it.
 * - An eye test fee bill voided (or returned in full) takes that amount back
 *   off the test, so the fee shows as due again.
 *
 * Nothing is deleted.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReturnsService } from '../../../modules/sales/returns/returns.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { EyeTestsService } from '../eye-tests/eye-tests.service';
import { LensOrdersService } from '../lens-orders/lens-orders.service';

@Injectable()
export class OpticalBillVoidService implements OnModuleInit {
  private readonly log = new Logger(OpticalBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
    private readonly orders: LensOrdersService,
    private readonly tests: EyeTestsService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.settle(tenantId, saleId, 'void hua').catch((e) => {
      this.log.warn(`Voided optical bill ${saleId} not settled: ${(e as Error).message}`);
    }));
    this.returns.onReturn(async (tenantId, saleId) => {
      const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { status: true } });
      if (sale?.status !== 'FULLY_RETURNED') return;
      await this.settle(tenantId, saleId, 'wapas hua').catch((e) => {
        this.log.warn(`Returned optical bill ${saleId} not settled: ${(e as Error).message}`);
      });
    });
  }

  private async settle(tenantId: string, saleId: string, why: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { businessType: true } });
    if (!/OPTIC|EYEWEAR|OPTOMETRY/i.test(tenant?.businessType ?? '')) return;
    await this.orders.onBillUndone(tenantId, saleId, why);
    await this.tests.onFeeBillUndone(tenantId, saleId, why);
  }
}

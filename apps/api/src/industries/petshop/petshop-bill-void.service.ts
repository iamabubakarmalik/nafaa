/**
 * A pet shop bill voided or returned at the counter. The shared void and
 * return have already put money, khata and stock back; this settles the
 * pet shop's own records:
 *
 * - Animals on the bill (voided, or their line fully returned) are on sale again.
 * - Grooming pickup bill (PGR-…) voided: the visit is ready for pickup again
 *   and can be billed again; payments stay on the customer's khata.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReturnsService } from '../../modules/sales/returns/returns.service';
import { SalesService } from '../../modules/sales/sales/sales.service';
import { GroomingService } from './grooming/grooming.service';
import { LiveAnimalsService } from './live-animals/live-animals.service';

@Injectable()
export class PetshopBillVoidService implements OnModuleInit {
  private readonly log = new Logger(PetshopBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
    private readonly returns: ReturnsService,
    private readonly animals: LiveAnimalsService,
    private readonly grooming: GroomingService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.onVoid(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided pet shop bill ${saleId} not settled: ${(e as Error).message}`);
    }));
    this.returns.onReturn((tenantId, saleId) => this.animals.backOnSale(tenantId, saleId, 'return').catch((e) => {
      this.log.warn(`Returned pet shop bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  async onVoid(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true, status: true, sourceRef: true } });
    if (!sale || sale.status !== 'VOIDED') return null;
    if (sale.saleNumber.startsWith('PGR-') && sale.sourceRef) return this.grooming.reopenAfterVoid(tenantId, sale.sourceRef, sale.saleNumber);
    return this.animals.backOnSale(tenantId, saleId, 'void');
  }
}

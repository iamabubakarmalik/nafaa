/**
 * Furniture bills voided from Sales. The shared void has reversed the money
 * and the khata; this settles the furniture records:
 *
 * - Order bill (FUR-…): the order is cancelled; advances stay on the
 *   customer's khata as their money, to return or adjust from there.
 * - Delivery charges (FDV-…): a note on the delivery; it can be billed again
 *   only by a new delivery.
 *
 * Nothing is deleted.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';

@Injectable()
export class FurnitureBillVoidService implements OnModuleInit {
  private readonly log = new Logger(FurnitureBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handle(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided furniture bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  async handle(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true, sourceRef: true } });
    if (!sale?.sourceRef) return;
    const note = `Bill ${sale.saleNumber} cancel hua`;

    if (sale.saleNumber.startsWith('FUR-')) {
      const o = await this.prisma.furnitureCustomOrder.findFirst({ where: { tenantId, orderNumber: sale.sourceRef } });
      if (!o || o.status === 'CANCELLED') return;
      await this.prisma.furnitureCustomOrder.update({
        where: { id: o.id },
        data: {
          status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: note,
          internalNotes: [o.internalNotes, `${note} — advance customer ke khate me hai`].filter(Boolean).join('\n').slice(-2000),
        },
      });
      if (o.carpenterId) {
        await this.prisma.furnitureCarpenter.updateMany({
          where: { id: o.carpenterId, tenantId, completedProjects: { gt: 0 } },
          data: { completedProjects: { decrement: 1 }, totalRevenue: { decrement: o.finalPrice ?? o.quotedPrice } },
        });
      }
      return;
    }
    if (sale.saleNumber.startsWith('FDV-')) {
      const d = await this.prisma.furnitureDelivery.findFirst({ where: { tenantId, deliveryNumber: sale.sourceRef }, select: { id: true, notes: true } });
      if (!d || (d.notes ?? '').includes(note)) return;
      await this.prisma.furnitureDelivery.update({ where: { id: d.id }, data: { notes: [d.notes, note].filter(Boolean).join('\n').slice(-2000) } });
    }
  }
}

/**
 * A team-order or repair delivery bill voided at the counter. The shared
 * void has already put the money, khata and stock back (advances stay on
 * the khata); this puts the record back so it can be delivered again:
 *
 * - Team order (TO-…): back to READY; advance = what is still on the khata.
 * - Repair (RS-…): back to COMPLETED (work done, not delivered).
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { paidOnKhata } from '../../_shared/industry-sale.helper';
import { r2, refundedOnKhata } from '../common/sports-common';

@Injectable()
export class SportsBillVoidService implements OnModuleInit {
  private readonly log = new Logger(SportsBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handle(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided sports bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  private get db() {
    return this.prisma as unknown as Prisma.TransactionClient;
  }

  /** Money still held on the khata for a record: paid in, less refunded. */
  private async held(tenantId: string, ref: string) {
    return r2((await paidOnKhata(this.db, tenantId, ref)) - (await refundedOnKhata(this.prisma, tenantId, ref)));
  }

  async handle(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true, sourceRef: true, status: true } });
    if (!sale || sale.status !== 'VOIDED') return null;
    const ref = sale.sourceRef ?? sale.saleNumber;
    const note = `Bill ${sale.saleNumber} void — dobara deliver karein`;

    if (ref.startsWith('TO-')) {
      const o = await this.prisma.sportsTeamOrder.findFirst({ where: { tenantId, orderNumber: ref, status: 'DELIVERED' } });
      if (!o) return null;
      const advance = await this.held(tenantId, ref);
      return this.prisma.sportsTeamOrder.updateMany({
        where: { id: o.id, status: 'DELIVERED' },
        data: {
          status: 'READY', deliveredAt: null, invoiceUrl: null,
          advancePaid: advance, balanceAmount: r2(Math.max(o.totalAmount - advance, 0)),
          internalNotes: [o.internalNotes, note].filter(Boolean).join('\n'),
        },
      });
    }
    if (ref.startsWith('RS-')) {
      const r = await this.prisma.sportsRepairService.findFirst({ where: { tenantId, serviceNumber: ref, status: 'DELIVERED' } });
      if (!r) return null;
      return this.prisma.sportsRepairService.updateMany({
        where: { id: r.id, status: 'DELIVERED' },
        data: { status: 'COMPLETED', deliveredAt: null, advancePaid: await this.held(tenantId, ref), notes: [r.notes, note].filter(Boolean).join('\n') },
      });
    }
    return null;
  }
}

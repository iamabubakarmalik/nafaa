/**
 * Gaming bills voided or returned at the counter. The shared void has put
 * the money and khata back; this settles the gaming records:
 *
 * - Rent bill (GMR-…): the rental is cancelled.
 * - Tournament entry (GTN-…): the seat opens again.
 * - Cards on the bill: marked so the shop checks whether the code was used
 *   (a code already shown cannot be taken back automatically).
 * - Station time: the session keeps its times; a note shows the bill was voided.
 *
 * Nothing is deleted.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { BILL_PREFIX } from '../common/gaming-catalog';

@Injectable()
export class GamingBillVoidService implements OnModuleInit {
  private readonly log = new Logger(GamingBillVoidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.handle(tenantId, saleId).catch((e) => {
      this.log.warn(`Voided gaming bill ${saleId} not settled: ${(e as Error).message}`);
    }));
  }

  async handle(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId }, select: { saleNumber: true, sourceRef: true } });
    if (!sale) return;
    const note = `Bill ${sale.saleNumber} cancel hua`;
    const n = sale.saleNumber;

    if (n.startsWith(BILL_PREFIX.rental) && !n.endsWith('-R') && sale.sourceRef) {
      await this.prisma.gamingRental.updateMany({
        where: { tenantId, rentalNumber: sale.sourceRef, status: { in: ['RESERVED', 'ACTIVE', 'OVERDUE'] } },
        data: { status: 'CANCELLED', notes: note },
      });
    }
    if (n.startsWith(BILL_PREFIX.tournament) && sale.sourceRef) {
      await this.prisma.gamingTournament.updateMany({
        where: { tenantId, tournamentNumber: sale.sourceRef, currentParticipants: { gt: 0 } },
        data: { currentParticipants: { decrement: 1 } },
      });
    }
    await this.prisma.gamingDigitalTopup.updateMany({
      where: { tenantId, deliveryReference: n },
      data: { notes: `${note} — check karein code istemal hua ya nahi` },
    });
    const sessions = await this.prisma.gamingCafeSession.findMany({
      where: { tenantId, OR: [{ notes: { contains: n } }, ...(n.startsWith(BILL_PREFIX.session) && sale.sourceRef ? [{ sessionNumber: sale.sourceRef }] : [])] },
      select: { id: true, notes: true },
    });
    for (const s of sessions) {
      if ((s.notes ?? '').includes(note)) continue;
      await this.prisma.gamingCafeSession.update({ where: { id: s.id }, data: { notes: [s.notes, note].filter(Boolean).join('\n').slice(0, 1000) } });
    }
  }
}

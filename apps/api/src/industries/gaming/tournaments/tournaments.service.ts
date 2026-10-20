/**
 * Tournaments: an event with an entry fee and prizes. Each player's entry
 * is its own bill (GTN-<tournament>-<n>), so fees reach the day book, cash
 * register and khata; the player list is read from those bills. Prizes are
 * paid from the drawer as expenses. A tournament is cancelled, never
 * deleted; entry fees are returned by voiding or returning their bills.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId, toPaymentMethod } from '../../_shared/industry-sale.helper';
import { BILL_PREFIX, r2 } from '../common/gaming-catalog';
import { CompleteTournamentDto, PayPrizeDto, RegisterPlayerDto, UpsertTournamentDto } from './dto/tournament.dto';

const PRIZE_CATEGORY = { name: 'Tournament prize', icon: '🏆', color: '#7c3aed' };
const PLACES: Record<number, string> = { 1: 'Pehla inaam', 2: 'Doosra inaam', 3: 'Teesra inaam', 0: 'Inaam' };
/** Prize expenses carry the tournament number in the title. */
const prizeTag = (n: string) => `(${n})`;

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
  ) {}

  private fields(dto: UpsertTournamentDto) {
    const date = new Date(dto.scheduledDate);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Tournament ki date likhein');
    const end = dto.scheduledEndDate ? new Date(dto.scheduledEndDate) : null;
    if (end && end < date) throw new BadRequestException('Khatam hone ki date shuru se pehle nahi ho sakti');
    const prizes = r2((dto.firstPrize ?? 0) + (dto.secondPrize ?? 0) + (dto.thirdPrize ?? 0));
    return {
      name: dto.name.trim(), gameName: dto.gameName.trim(), platform: dto.platform,
      description: dto.description?.trim() || null, format: dto.format?.trim() || null,
      maxParticipants: dto.maxParticipants, entryFee: r2(dto.entryFee ?? 0),
      prizePool: r2(dto.prizePool ?? prizes), firstPrize: r2(dto.firstPrize ?? 0), secondPrize: r2(dto.secondPrize ?? 0), thirdPrize: r2(dto.thirdPrize ?? 0),
      scheduledDate: date, scheduledEndDate: end, rules: dto.rules?.trim() || null, notes: dto.notes?.trim() || null,
    };
  }

  async create(user: AuthenticatedUser, dto: UpsertTournamentDto) {
    const data = this.fields(dto);
    const prefix = `TRN-${new Date().getFullYear()}-`;
    const last = await this.prisma.gamingTournament.findFirst({
      where: { tenantId: user.tenantId, tournamentNumber: { startsWith: prefix } },
      orderBy: { tournamentNumber: 'desc' },
      select: { tournamentNumber: true },
    });
    const tournamentNumber = prefix + String((last ? Number(last.tournamentNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(4, '0');
    return this.prisma.gamingTournament.create({ data: { tenantId: user.tenantId, tournamentNumber, ...data, status: 'UPCOMING' } });
  }

  async list(user: AuthenticatedUser, params: { status?: string; platform?: string; upcoming?: boolean; search?: string }) {
    return this.prisma.gamingTournament.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.platform && { platform: params.platform as any }),
        ...(params.upcoming && { scheduledDate: { gte: new Date() }, status: 'UPCOMING' }),
        ...(params.search && {
          OR: [
            { tournamentNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { gameName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { scheduledDate: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingTournament.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Tournament nahi mila');
    return t;
  }

  /** Players from the entry bills (voided bills drop out), and prizes paid. */
  async players(user: AuthenticatedUser, id: string) {
    const t = await this.getOne(user, id);
    const [bills, prizes] = await Promise.all([
      this.prisma.sale.findMany({
        where: { tenantId: user.tenantId, sourceRef: t.tournamentNumber, saleNumber: { startsWith: BILL_PREFIX.tournament } },
        select: { id: true, saleNumber: true, status: true, total: true, paidAmount: true, creditAmount: true, createdAt: true, customer: { select: { id: true, name: true, phone: true } }, items: { select: { note: true }, take: 1 } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.expense.findMany({
        where: { tenantId: user.tenantId, title: { contains: prizeTag(t.tournamentNumber) }, status: { not: 'CANCELLED' } },
        select: { id: true, expenseNumber: true, title: true, amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      players: bills.map((b) => ({
        saleId: b.id, saleNumber: b.saleNumber, voided: b.status === 'VOIDED', fee: Number(b.total), paid: Math.min(Number(b.paidAmount), Number(b.total)), due: Number(b.creditAmount),
        at: b.createdAt, name: b.customer?.name ?? b.items[0]?.note ?? '—', phone: b.customer?.phone ?? null, line: b.items[0]?.note ?? null,
      })),
      prizes: prizes.map((p) => ({ ...p, amount: Number(p.amount) })),
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertTournamentDto) {
    const t = await this.getOne(user, id);
    if (t.status === 'COMPLETED' || t.status === 'CANCELLED') throw new BadRequestException('Ye tournament band ho chuka');
    const data = this.fields(dto);
    if (data.maxParticipants < t.currentParticipants) throw new BadRequestException(`${t.currentParticipants} player pehle se hain — had is se kam nahi ho sakti`);
    return this.prisma.gamingTournament.update({ where: { id }, data });
  }

  /** One player's entry: the fee is a bill; unpaid fee goes on the player's khata. */
  async registerParticipant(user: AuthenticatedUser, id: string, dto: RegisterPlayerDto) {
    const name = dto?.name?.trim();
    if (!name) throw new BadRequestException('Player ka naam likhein');
    return this.prisma.$transaction(async (tx) => {
      const t = await tx.gamingTournament.findFirst({ where: { id, tenantId: user.tenantId } });
      if (!t) throw new NotFoundException('Tournament nahi mila');
      if (t.status !== 'UPCOMING' && t.status !== 'ONGOING') throw new BadRequestException('Is tournament me ab entry nahi hoti');
      const bumped = await tx.gamingTournament.updateMany({
        where: { id, currentParticipants: { lt: t.maxParticipants } },
        data: { currentParticipants: { increment: 1 } },
      });
      if (!bumped.count) throw new BadRequestException('Tournament bhar chuka hai');
      const fee = r2(t.entryFee);
      let sale: { id: string; saleNumber: string } | null = null;
      if (fee > 0) {
        const paid = r2(Math.min(Math.max(dto.paidAmount ?? fee, 0), fee));
        const shopId = await resolveIndustryShopId(tx, user, null);
        const customerId = dto.customerId || paid < fee - 0.009
          ? await ensureCustomer(tx, user, { customerId: dto.customerId, name, phone: dto.phone, shopId })
          : null;
        const count = await tx.sale.count({ where: { tenantId: user.tenantId, sourceRef: t.tournamentNumber, saleNumber: { startsWith: BILL_PREFIX.tournament } } });
        sale = await postIndustrySale(tx, user, {
          saleNumber: `${BILL_PREFIX.tournament}${t.tournamentNumber}-${String(count + 1).padStart(3, '0')}`,
          sourceRef: t.tournamentNumber,
          shopId,
          customerId,
          lines: [{ label: `${name}${dto.gamerTag?.trim() ? ` (${dto.gamerTag.trim()})` : ''} — ${t.name} entry`, amount: fee }],
          paidAmount: paid,
          paymentMethod: dto.paymentMethod,
        });
      }
      const updated = await tx.gamingTournament.findUnique({ where: { id } });
      return { tournament: updated, sale: sale ? { id: sale.id, saleNumber: sale.saleNumber } : null };
    });
  }

  /** A prize handed over from the drawer, recorded as an expense. */
  async payPrize(user: AuthenticatedUser, scope: ShopScope, id: string, dto: PayPrizeDto) {
    const t = await this.getOne(user, id);
    if (t.status === 'CANCELLED') throw new BadRequestException('Cancel tournament ka inaam nahi diya ja sakta');
    const amount = r2(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Inaam ki amount likhein');
    const expense = await this.expenses.create(user, scope, {
      title: `Tournament prize ${prizeTag(t.tournamentNumber)}: ${PLACES[dto.place] ?? 'Inaam'} — ${dto.name.trim()}`.slice(0, 120),
      description: t.name.slice(0, 500),
      amount,
      paymentMethod: toPaymentMethod(dto.paymentMethod),
      status: 'PAID',
      categoryId: await this.prizeCategory(user.tenantId),
    } as Parameters<ExpensesService['create']>[2]);
    return { expense: { id: expense.id, expenseNumber: expense.expenseNumber, amount: expense.amount } };
  }

  private async prizeCategory(tenantId: string) {
    const made = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: PRIZE_CATEGORY.name } },
      update: {},
      create: { tenantId, ...PRIZE_CATEGORY },
      select: { id: true },
    });
    return made.id;
  }

  async start(user: AuthenticatedUser, id: string) {
    const t = await this.getOne(user, id);
    if (t.status !== 'UPCOMING') throw new BadRequestException('Sirf aane wala tournament shuru hota hai');
    return this.prisma.gamingTournament.update({ where: { id }, data: { status: 'ONGOING' } });
  }

  async completeTournament(user: AuthenticatedUser, id: string, dto: CompleteTournamentDto) {
    const t = await this.getOne(user, id);
    if (t.status === 'CANCELLED') throw new BadRequestException('Ye tournament cancel ho chuka');
    if (!dto?.winnerName?.trim()) throw new BadRequestException('Jeetne wale ka naam likhein');
    return this.prisma.gamingTournament.update({
      where: { id },
      data: { status: 'COMPLETED', winnerName: dto.winnerName.trim(), runnerUpName: dto.runnerUpName?.trim() || null, scheduledEndDate: t.scheduledEndDate ?? new Date() },
    });
  }

  /** Cancelled, not deleted: entry bills stay until they are voided or returned. */
  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const t = await this.getOne(user, id);
    if (t.status === 'COMPLETED') throw new BadRequestException('Mukammal tournament cancel nahi hota');
    if (t.status === 'CANCELLED') return t;
    const why = reason?.trim();
    if (!why) throw new BadRequestException('Cancel ki wajah likhein');
    return this.prisma.gamingTournament.update({
      where: { id },
      data: { status: 'CANCELLED', notes: [t.notes, `Cancel: ${why}`].filter(Boolean).join('\n').slice(0, 1000) },
    });
  }
}

/**
 * Station sessions: the clock starts when a player sits down, can pause,
 * and is billed either here ("Khatam + bill": time, extras, discount, paid
 * now or on the player's khata) or at the shared counter, where the running
 * session is a "Station time" line next to snacks and cards and the whole
 * bill can be paid in parts. Either way the bill is a normal sale.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { endOfDayTz, startOfDayTz } from '../../../common/helpers/business-time.helper';
import { CloseSaleDto, EndSessionDto, StartSessionDto } from './dto/start-session.dto';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';
import { BILL_PREFIX, TIME_SKU, ensureTimeProduct, r2 } from '../common/gaming-catalog';

type Session = Prisma.GamingCafeSessionGetPayload<{ include: { station: true } }>;

/** Minutes played and the bill so far for a running session. */
function liveBill(s: Session, now = Date.now()) {
  const actualMinutes = Math.max(Math.floor((now - s.startedAt.getTime()) / 60000), 0);
  const openPause = s.status === 'PAUSED' && s.pausedAt ? Math.floor((now - s.pausedAt.getTime()) / 60000) : 0;
  const billableMinutes = Math.max(actualMinutes - s.totalPauseMinutes - openPause, s.station?.minimumMinutes ?? 0, 0);
  return { actualMinutes, billableMinutes, pauseMinutes: s.totalPauseMinutes + openPause, currentAmount: r2((billableMinutes / 60) * s.ratePerHour) };
}

@Injectable()
export class CafeSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(user: AuthenticatedUser, dto: StartSessionDto) {
    const station = await this.prisma.gamingStation.findFirst({ where: { id: dto.stationId, tenantId: user.tenantId } });
    if (!station) throw new NotFoundException('Station nahi mila');
    if (!station.isActive) throw new BadRequestException('Ye station band hai — Stations page se chalu karein');
    if (station.isUnderMaintenance) throw new BadRequestException('Station theek ho raha hai (maintenance)');
    if (dto.ratePerHour != null && !(dto.ratePerHour >= 0)) throw new BadRequestException('Rate manfi nahi ho sakta');

    const existing = await this.prisma.gamingCafeSession.findFirst({
      where: { tenantId: user.tenantId, stationId: dto.stationId, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    if (existing) throw new BadRequestException(`${station.name} par pehle se khel chal raha hai`);

    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { name: true, phone: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      dto.customerName = dto.customerName || c.name;
      dto.customerPhone = dto.customerPhone || c.phone || undefined;
    }
    const prefix = `SES-${new Date().getFullYear()}-`;
    const last = await this.prisma.gamingCafeSession.findFirst({
      where: { tenantId: user.tenantId, sessionNumber: { startsWith: prefix } },
      orderBy: { sessionNumber: 'desc' },
      select: { sessionNumber: true },
    });
    const sessionNumber = prefix + String((last ? Number(last.sessionNumber.slice(prefix.length)) || 0 : 0) + 1).padStart(5, '0');

    return this.prisma.gamingCafeSession.create({
      data: {
        tenantId: user.tenantId,
        stationId: dto.stationId,
        sessionNumber,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        playerCount: Math.max(dto.playerCount ?? 1, 1),
        gameSelected: dto.gameSelected?.trim() || undefined,
        ratePerHour: dto.ratePerHour ?? station.pricePerHour,
        status: 'ACTIVE',
        handledById: user.id,
        notes: dto.notes?.trim() || undefined,
      },
    });
  }

  async pause(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session nahi mila');
    if (s.status !== 'ACTIVE') throw new BadRequestException('Sirf chalta hua session rukta hai');
    return this.prisma.gamingCafeSession.update({
      where: { id },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });
  }

  async resume(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session nahi mila');
    if (s.status !== 'PAUSED' || !s.pausedAt) throw new BadRequestException('Session ruka hua nahi hai');

    const pauseMinutes = Math.floor((Date.now() - s.pausedAt.getTime()) / 60000);
    return this.prisma.gamingCafeSession.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        resumedAt: new Date(),
        totalPauseMinutes: s.totalPauseMinutes + pauseMinutes,
        pausedAt: null,
      },
    });
  }

  /**
   * Ends the session and posts its bill as a sale (station time plus any
   * food or extra charges), so the money shows in the day book, cash
   * register and reports. Unpaid money goes on the player's khata.
   */
  async end(user: AuthenticatedUser, id: string, dto: EndSessionDto) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session nahi mila');
    if (s.status === 'ENDED' || s.status === 'CANCELLED') throw new BadRequestException('Ye session pehle hi khatam ho chuka');

    const station = await this.prisma.gamingStation.findFirst({ where: { id: s.stationId, tenantId: user.tenantId } });
    const endedAt = new Date();
    // A paused session that is ended counts its running pause too.
    const openPause = s.status === 'PAUSED' && s.pausedAt ? Math.floor((endedAt.getTime() - s.pausedAt.getTime()) / 60000) : 0;
    const totalPause = s.totalPauseMinutes + openPause;
    const actualMinutes = Math.floor((endedAt.getTime() - s.startedAt.getTime()) / 60000);
    const billableMinutes = Math.max(actualMinutes - totalPause, station?.minimumMinutes ?? 0);

    const baseAmount = r2((billableMinutes / 60) * s.ratePerHour);
    const foodCharges = r2(Math.max(dto.foodCharges ?? 0, 0));
    const additionalCharges = r2(Math.max(dto.additionalCharges ?? 0, 0));
    let discount = r2(Math.max(dto.discount ?? 0, 0));
    const gross = r2(baseAmount + foodCharges + additionalCharges);
    if (discount > gross) throw new BadRequestException('Discount bill se zyada hai');
    let totalAmount = r2(gross - discount);
    const paid = r2(Math.max(dto.paidAmount ?? totalAmount, 0));
    // The counter screen shows the bill a moment before the server ends the
    // clock; a shortfall of up to two minutes of play is rounded off.
    const roundOff = r2(Math.max(totalAmount - paid, 0));
    if (roundOff > 0 && roundOff <= r2((s.ratePerHour / 60) * 2)) {
      discount = r2(discount + roundOff);
      totalAmount = r2(gross - discount);
    }
    const kept = r2(Math.min(paid, totalAmount));

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, dto.shopId);
      let customerId = s.customerId;
      if (!customerId && kept < totalAmount - 0.01) {
        if (!s.customerName?.trim()) {
          throw new BadRequestException(`Rs ${r2(totalAmount - kept)} baqi hai — poori amount lein, ya udhaar ke liye player ka naam likhein`);
        }
        customerId = await ensureCustomer(tx, user, { name: s.customerName, phone: s.customerPhone, shopId });
      }

      let saleId: string | null = null;
      if (gross > 0) {
        const sale = await postIndustrySale(tx, user, {
          saleNumber: `${BILL_PREFIX.session}${s.sessionNumber}`,
          sourceRef: s.sessionNumber,
          shopId,
          customerId,
          lines: [
            { label: `${station?.name ?? 'Station'} — ${billableMinutes} min @ ${s.ratePerHour}/ghanta`, amount: baseAmount },
            { label: 'Food / drinks', amount: foodCharges },
            { label: 'Extra charges', amount: additionalCharges },
          ],
          discount,
          paidAmount: paid,
          paymentMethod: dto.paymentMethod,
        });
        saleId = sale.id;
      }

      const updated = await tx.gamingCafeSession.update({
        where: { id },
        data: {
          status: 'ENDED',
          endedAt,
          actualMinutes,
          billableMinutes,
          totalPauseMinutes: totalPause,
          pausedAt: null,
          customerId,
          baseAmount,
          foodCharges,
          additionalCharges,
          discount,
          totalAmount,
          paidAmount: kept,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
        },
      });

      await tx.gamingStation.updateMany({
        where: { id: s.stationId, tenantId: user.tenantId },
        data: {
          totalHoursUsed: { increment: billableMinutes / 60 },
          totalRevenue: { increment: totalAmount },
        },
      });

      return { ...updated, saleId, change: r2(paid - kept) };
    });
  }

  /** A session started by mistake (nobody played); a session with a bill is closed through its bill. */
  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session nahi mila');
    if (s.status === 'ENDED') throw new BadRequestException('Bill ban chuka hai — session cancel nahi hota');
    if (s.status === 'CANCELLED') return s;
    const why = reason?.trim();
    if (!why) throw new BadRequestException('Cancel ki wajah likhein');
    return this.prisma.gamingCafeSession.update({
      where: { id },
      data: { status: 'CANCELLED', endedAt: new Date(), pausedAt: null, notes: [s.notes, `Cancel: ${why}`].filter(Boolean).join('\n').slice(0, 1000) },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; stationId?: string; from?: string; to?: string; search?: string; page?: number; limit?: number }) {
    const where: Prisma.GamingCafeSessionWhereInput = {
      tenantId: user.tenantId,
      ...(params.status && { status: params.status as any }),
      ...(params.stationId && { stationId: params.stationId }),
      ...(params.from || params.to ? {
        startedAt: {
          ...(params.from && { gte: startOfDayTz(new Date(params.from)) }),
          ...(params.to && { lte: endOfDayTz(new Date(params.to)) }),
        },
      } : {}),
      ...(params.search && {
        OR: [
          { sessionNumber: { contains: params.search, mode: 'insensitive' } },
          { customerName: { contains: params.search, mode: 'insensitive' } },
          { customerPhone: { contains: params.search } },
          { gameSelected: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };
    if (!params.page) {
      return this.prisma.gamingCafeSession.findMany({ where, include: { station: true }, orderBy: { startedAt: 'desc' }, take: 200 });
    }
    const limit = Math.min(Math.max(Number(params.limit) || 50, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    const [items, total, sums] = await Promise.all([
      this.prisma.gamingCafeSession.findMany({ where, include: { station: true }, orderBy: { startedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.gamingCafeSession.count({ where }),
      this.prisma.gamingCafeSession.aggregate({ where: { ...where, status: 'ENDED' }, _sum: { totalAmount: true, billableMinutes: true }, _count: { _all: true } }),
    ]);
    return {
      items, total, page, limit,
      totals: { ended: sums._count._all, amount: r2(Number(sums._sum.totalAmount ?? 0)), minutes: Number(sums._sum.billableMinutes ?? 0) },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { station: true },
    });
    if (!s) throw new NotFoundException('Session nahi mila');
    if (s.status === 'ACTIVE' || s.status === 'PAUSED') return { ...s, liveBilling: liveBill(s) };
    return s;
  }

  async activeStations(user: AuthenticatedUser) {
    const rows = await this.prisma.gamingCafeSession.findMany({
      where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: { station: true },
      orderBy: { startedAt: 'asc' },
    });
    const now = Date.now();
    return rows.map((s) => ({ ...s, liveBilling: liveBill(s, now) }));
  }

  /** Running sessions for the counter, with the Station time product their lines use. */
  async counter(user: AuthenticatedUser) {
    const timeProductId = await this.prisma.$transaction((tx) => ensureTimeProduct(tx, user.tenantId));
    return { timeProductId, sessions: await this.activeStations(user) };
  }

  /**
   * Closes sessions billed on a counter bill. The bill's Station time lines
   * carry the money; each session records the amount its line was added
   * with (scaled down if the cashier lowered the rate) and the minutes then.
   * Calling again for the same bill changes nothing.
   */
  async closeSale(user: AuthenticatedUser, dto: CloseSaleDto) {
    const parts = (dto.sessions ?? []).filter((p) => p?.id);
    if (!parts.length) throw new BadRequestException('Koi session nahi chuna');
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: dto.saleId, tenantId: user.tenantId },
        select: { id: true, saleNumber: true, status: true, customerId: true, paymentMethod: true, items: { select: { total: true, product: { select: { sku: true } } } } },
      });
      if (!sale) throw new NotFoundException('Bill nahi mila');
      if (sale.status === 'VOIDED') throw new BadRequestException('Ye bill cancel ho chuka hai');
      const billed = r2(sale.items.filter((i) => i.product?.sku === TIME_SKU).reduce((a, i) => a + Number(i.total || 0), 0));
      if (!(billed > 0)) throw new BadRequestException('Is bill me station ka waqt nahi hai');
      const asked = r2(parts.reduce((a, p) => a + Math.max(Number(p.amount) || 0, 0), 0));
      const scale = asked > billed ? billed / asked : 1;
      const out: Array<{ id: string; sessionNumber: string; totalAmount: number }> = [];
      const endedAt = new Date();
      for (const p of parts) {
        const s = await tx.gamingCafeSession.findFirst({ where: { id: p.id, tenantId: user.tenantId }, include: { station: true } });
        if (!s) throw new NotFoundException('Session nahi mila');
        if (s.status === 'ENDED' && (s.notes ?? '').includes(sale.saleNumber)) { out.push({ id: s.id, sessionNumber: s.sessionNumber, totalAmount: s.totalAmount }); continue; }
        if (s.status !== 'ACTIVE' && s.status !== 'PAUSED') throw new BadRequestException(`${s.sessionNumber} pehle hi band ho chuka`);
        const live = liveBill(s, endedAt.getTime());
        const minutes = Math.max(Math.round(Number(p.minutes) || live.billableMinutes), 0);
        const amount = r2(Math.max(Number(p.amount) || 0, 0) * scale);
        const base = r2(Math.max(Number(p.amount) || 0, 0));
        const updated = await tx.gamingCafeSession.update({
          where: { id: s.id },
          data: {
            status: 'ENDED', endedAt, pausedAt: null,
            actualMinutes: live.actualMinutes, billableMinutes: minutes, totalPauseMinutes: live.pauseMinutes,
            customerId: s.customerId ?? sale.customerId,
            baseAmount: base, discount: r2(base - amount), totalAmount: amount, paidAmount: amount,
            paymentMethod: sale.paymentMethod,
            notes: [s.notes, `Bill ${sale.saleNumber}`].filter(Boolean).join('\n').slice(0, 1000),
          },
        });
        await tx.gamingStation.updateMany({
          where: { id: s.stationId, tenantId: user.tenantId },
          data: { totalHoursUsed: { increment: minutes / 60 }, totalRevenue: { increment: amount } },
        });
        out.push({ id: updated.id, sessionNumber: updated.sessionNumber, totalAmount: updated.totalAmount });
      }
      return { saleNumber: sale.saleNumber, sessions: out };
    });
  }
}

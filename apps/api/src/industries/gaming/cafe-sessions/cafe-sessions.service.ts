import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { EndSessionDto, StartSessionDto } from './dto/start-session.dto';
import { ensureCustomer, postIndustrySale, resolveIndustryShopId } from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

@Injectable()
export class CafeSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(user: AuthenticatedUser, dto: StartSessionDto) {
    const station = await this.prisma.gamingStation.findFirst({ where: { id: dto.stationId, tenantId: user.tenantId } });
    if (!station) throw new NotFoundException('Station not found');
    if (station.isUnderMaintenance) throw new BadRequestException('Station under maintenance');

    const existing = await this.prisma.gamingCafeSession.findFirst({
      where: { stationId: dto.stationId, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    if (existing) throw new BadRequestException('Station already has an active session');

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
        playerCount: dto.playerCount ?? 1,
        gameSelected: dto.gameSelected,
        ratePerHour: dto.ratePerHour ?? station.pricePerHour,
        status: 'ACTIVE',
        handledById: user.id,
      },
    });
  }

  async pause(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session not found');
    if (s.status !== 'ACTIVE') throw new BadRequestException('Only active sessions can be paused');
    return this.prisma.gamingCafeSession.update({
      where: { id },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });
  }

  async resume(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session not found');
    if (s.status !== 'PAUSED' || !s.pausedAt) throw new BadRequestException('Session is not paused');

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
    if (!s) throw new NotFoundException('Session not found');
    if (s.status === 'ENDED' || s.status === 'CANCELLED') throw new BadRequestException('Session already ended');

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
          saleNumber: `GMS-${s.sessionNumber}`,
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

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session not found');
    if (s.status === 'ENDED') throw new BadRequestException('Bill ban chuka hai — session cancel nahi hota');
    return this.prisma.gamingCafeSession.update({
      where: { id },
      data: { status: 'CANCELLED', endedAt: new Date(), notes: reason },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; stationId?: string; from?: string; to?: string }) {
    return this.prisma.gamingCafeSession.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status as any }),
        ...(params.stationId && { stationId: params.stationId }),
        ...(params.from || params.to ? {
          startedAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      include: { station: true },
      orderBy: { startedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { station: true },
    });
    if (!s) throw new NotFoundException('Session not found');

    // Calculate current bill if still active
    if (s.status === 'ACTIVE' || s.status === 'PAUSED') {
      const totalMs = Date.now() - s.startedAt.getTime();
      const actualMinutes = Math.floor(totalMs / 60000);
      const openPause = s.status === 'PAUSED' && s.pausedAt ? Math.floor((Date.now() - s.pausedAt.getTime()) / 60000) : 0;
      const billableMinutes = Math.max(actualMinutes - s.totalPauseMinutes - openPause, s.station?.minimumMinutes ?? 0);
      const currentAmount = r2((billableMinutes / 60) * s.ratePerHour);
      return { ...s, liveBilling: { actualMinutes, billableMinutes, currentAmount } };
    }

    return s;
  }

  async activeStations(user: AuthenticatedUser) {
    return this.prisma.gamingCafeSession.findMany({
      where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } },
      include: { station: true },
      orderBy: { startedAt: 'asc' },
    });
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { EndSessionDto, StartSessionDto } from './dto/start-session.dto';

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

    const count = await this.prisma.gamingCafeSession.count({ where: { tenantId: user.tenantId } });
    const sessionNumber = `SES-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

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

  async end(user: AuthenticatedUser, id: string, dto: EndSessionDto) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session not found');
    if (s.status === 'ENDED' || s.status === 'CANCELLED') throw new BadRequestException('Session already ended');

    const station = await this.prisma.gamingStation.findUnique({ where: { id: s.stationId } });
    const endedAt = new Date();
    const totalMs = endedAt.getTime() - s.startedAt.getTime();
    const actualMinutes = Math.floor(totalMs / 60000);
    const billableMinutes = Math.max(actualMinutes - s.totalPauseMinutes, station?.minimumMinutes ?? 0);

    const baseAmount = (billableMinutes / 60) * s.ratePerHour;
    const foodCharges = dto.foodCharges ?? 0;
    const additionalCharges = dto.additionalCharges ?? 0;
    const discount = dto.discount ?? 0;
    const totalAmount = Math.max(baseAmount + foodCharges + additionalCharges - discount, 0);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.gamingCafeSession.update({
        where: { id },
        data: {
          status: 'ENDED',
          endedAt,
          actualMinutes,
          billableMinutes,
          baseAmount,
          foodCharges,
          additionalCharges,
          discount,
          totalAmount,
          paidAmount: dto.paidAmount ?? totalAmount,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
        },
      });

      // Update station stats
      await tx.gamingStation.update({
        where: { id: s.stationId },
        data: {
          totalHoursUsed: { increment: billableMinutes / 60 },
          totalRevenue: { increment: totalAmount },
        },
      });

      return updated;
    });
  }

  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const s = await this.prisma.gamingCafeSession.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Session not found');
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
      const billableMinutes = Math.max(actualMinutes - s.totalPauseMinutes, 0);
      const currentAmount = (billableMinutes / 60) * s.ratePerHour;
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

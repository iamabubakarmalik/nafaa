import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertStationDto } from './dto/upsert-station.dto';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  private clean(dto: UpsertStationDto) {
    const stationNumber = dto.stationNumber?.trim().toUpperCase();
    if (!stationNumber) throw new BadRequestException('Station number likhein (jaise PS-1)');
    if (!dto.name?.trim()) throw new BadRequestException('Station ka naam likhein');
    if (!(dto.pricePerHour >= 0)) throw new BadRequestException('Ghante ka rate likhein');
    for (const v of [dto.pricePerHalfHour, dto.peakHourPrice, dto.offPeakPrice]) if (v != null && !(v >= 0)) throw new BadRequestException('Rate manfi nahi ho sakta');
    if (dto.minimumMinutes != null && !(dto.minimumMinutes >= 0 && dto.minimumMinutes <= 600)) throw new BadRequestException('Kam se kam minute 0 se 600 tak');
    return { ...dto, stationNumber, name: dto.name.trim(), installedGames: (dto.installedGames ?? []).map((g) => g.trim()).filter(Boolean) };
  }

  async create(user: AuthenticatedUser, input: UpsertStationDto) {
    const dto = this.clean(input);
    const dup = await this.prisma.gamingStation.findFirst({ where: { tenantId: user.tenantId, stationNumber: dto.stationNumber } });
    if (dup) throw new BadRequestException(`Station ${dto.stationNumber} pehle se hai`);
    return this.prisma.gamingStation.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { type?: string; active?: boolean; available?: boolean }) {
    const stations = await this.prisma.gamingStation.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.type && { stationType: params.type as any }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: { stationNumber: 'asc' },
    });

    if (params.available) {
      const activeSessions = await this.prisma.gamingCafeSession.findMany({
        where: { tenantId: user.tenantId, status: { in: ['ACTIVE', 'PAUSED'] } },
        select: { stationId: true },
      });
      const busySet = new Set(activeSessions.map((s) => s.stationId));
      return stations.filter((s) => !busySet.has(s.id) && !s.isUnderMaintenance);
    }

    // Attach current session if any
    const stationIds = stations.map((s) => s.id);
    const sessions = await this.prisma.gamingCafeSession.findMany({
      where: { tenantId: user.tenantId, stationId: { in: stationIds }, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    const sessionMap = new Map(sessions.map((s) => [s.stationId, s]));

    return stations.map((s) => ({ ...s, currentSession: sessionMap.get(s.id) ?? null }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station nahi mila');
    const currentSession = await this.prisma.gamingCafeSession.findFirst({
      where: { tenantId: user.tenantId, stationId: id, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    return { ...s, currentSession };
  }

  async update(user: AuthenticatedUser, id: string, input: UpsertStationDto) {
    const s = await this.prisma.gamingStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station nahi mila');
    const dto = this.clean(input);
    if (dto.stationNumber !== s.stationNumber) {
      const dup = await this.prisma.gamingStation.findFirst({ where: { tenantId: user.tenantId, stationNumber: dto.stationNumber, id: { not: id } } });
      if (dup) throw new BadRequestException(`Station ${dto.stationNumber} pehle se hai`);
    }
    return this.prisma.gamingStation.update({ where: { id }, data: dto });
  }

  async toggleMaintenance(user: AuthenticatedUser, id: string, notes?: string) {
    const s = await this.prisma.gamingStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station nahi mila');
    return this.prisma.gamingStation.update({
      where: { id },
      data: { isUnderMaintenance: !s.isUnderMaintenance, maintenanceNotes: s.isUnderMaintenance ? null : notes?.trim() || null },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station nahi mila');
    const busy = await this.prisma.gamingCafeSession.count({ where: { tenantId: user.tenantId, stationId: id, status: { in: ['ACTIVE', 'PAUSED'] } } });
    if (busy) throw new BadRequestException('Is station par khel chal raha hai — pehle bill banayein');
    return this.prisma.gamingStation.update({ where: { id }, data: { isActive: false } });
  }
}

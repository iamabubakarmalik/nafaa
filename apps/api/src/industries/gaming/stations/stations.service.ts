import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertStationDto } from './dto/upsert-station.dto';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertStationDto) {
    const dup = await this.prisma.gamingStation.findFirst({ where: { tenantId: user.tenantId, stationNumber: dto.stationNumber } });
    if (dup) throw new BadRequestException(`Station ${dto.stationNumber} already exists`);
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
      where: { stationId: { in: stationIds }, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    const sessionMap = new Map(sessions.map((s) => [s.stationId, s]));

    return stations.map((s) => ({ ...s, currentSession: sessionMap.get(s.id) ?? null }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station not found');
    const currentSession = await this.prisma.gamingCafeSession.findFirst({
      where: { stationId: id, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    return { ...s, currentSession };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertStationDto) {
    const s = await this.prisma.gamingStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station not found');
    return this.prisma.gamingStation.update({ where: { id }, data: dto });
  }

  async toggleMaintenance(user: AuthenticatedUser, id: string, notes?: string) {
    const s = await this.prisma.gamingStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station not found');
    return this.prisma.gamingStation.update({
      where: { id },
      data: { isUnderMaintenance: !s.isUnderMaintenance, maintenanceNotes: notes },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gamingStation.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('Station not found');
    return this.prisma.gamingStation.update({ where: { id }, data: { isActive: false } });
  }
}

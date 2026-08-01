import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const count = await this.prisma.gamingTournament.count({ where: { tenantId: user.tenantId } });
    const tournamentNumber = `TRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.gamingTournament.create({
      data: {
        tenantId: user.tenantId,
        tournamentNumber,
        ...dto,
        scheduledDate: new Date(dto.scheduledDate),
        scheduledEndDate: dto.scheduledEndDate ? new Date(dto.scheduledEndDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; platform?: string; upcoming?: boolean; search?: string }) {
    return this.prisma.gamingTournament.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.platform && { platform: params.platform as any }),
        ...(params.upcoming && { scheduledDate: { gte: new Date() } }),
        ...(params.search && {
          OR: [
            { tournamentNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { gameName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { scheduledDate: 'asc' },
      take: 100,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingTournament.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Tournament not found');
    return t;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const t = await this.prisma.gamingTournament.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Tournament not found');
    return this.prisma.gamingTournament.update({
      where: { id },
      data: {
        ...dto,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        scheduledEndDate: dto.scheduledEndDate ? new Date(dto.scheduledEndDate) : undefined,
      },
    });
  }

  async registerParticipant(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingTournament.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Tournament not found');
    if (t.currentParticipants >= t.maxParticipants) throw new BadRequestException('Tournament is full');
    return this.prisma.gamingTournament.update({
      where: { id },
      data: { currentParticipants: { increment: 1 } },
    });
  }

  async completeTournament(user: AuthenticatedUser, id: string, winnerName: string, runnerUpName?: string) {
    const t = await this.prisma.gamingTournament.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Tournament not found');
    return this.prisma.gamingTournament.update({
      where: { id },
      data: { status: 'COMPLETED', winnerName, runnerUpName },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const t = await this.prisma.gamingTournament.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!t) throw new NotFoundException('Tournament not found');
    return this.prisma.gamingTournament.delete({ where: { id } });
  }
}

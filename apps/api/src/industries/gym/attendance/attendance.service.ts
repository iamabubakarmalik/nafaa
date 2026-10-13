import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(user: AuthenticatedUser, dto: { memberId?: string; qrCode?: string; rfidCard?: string; biometricId?: string; method?: string; entryPoint?: string; isGuest?: boolean; guestName?: string; guestPhone?: string; invitedByMemberId?: string; notes?: string }) {
    let memberId = dto.memberId;

    // Auto-detect member by identifier
    if (!memberId && dto.qrCode) {
      const m = await this.prisma.gymMember.findFirst({ where: { qrCode: dto.qrCode, tenantId: user.tenantId } });
      memberId = m?.id;
    }
    if (!memberId && dto.rfidCard) {
      const m = await this.prisma.gymMember.findFirst({ where: { rfidCard: dto.rfidCard, tenantId: user.tenantId } });
      memberId = m?.id;
    }
    if (!memberId && dto.biometricId) {
      const m = await this.prisma.gymMember.findFirst({ where: { biometricId: dto.biometricId, tenantId: user.tenantId } });
      memberId = m?.id;
    }

    if (!memberId && !dto.isGuest) throw new NotFoundException('Member not identified');
    // A guest visit is logged against the member who brought the guest.
    if (!memberId && dto.isGuest) {
      if (!dto.invitedByMemberId) throw new BadRequestException('Guest ke liye bulane wala member chunein');
      const inviter = await this.prisma.gymMember.findFirst({ where: { id: dto.invitedByMemberId, tenantId: user.tenantId }, select: { id: true } });
      if (!inviter) throw new NotFoundException('Member not found');
      memberId = inviter.id;
    }
    if (memberId && !dto.isGuest) {
      const inside = await this.prisma.gymAttendance.findFirst({
        where: { tenantId: user.tenantId, memberId, isGuest: false, checkOutAt: null, checkInAt: { gte: new Date(Date.now() - 16 * 3_600_000) } },
        select: { id: true },
      });
      if (inside) throw new BadRequestException('Ye member pehle se andar hai — pehle check-out karein');
    }

    // Check active membership
    let activeMembership = null;
    if (memberId) {
      activeMembership = await this.prisma.gymMemberMembership.findFirst({
        where: {
          memberId,
          tenantId: user.tenantId,
          status: 'ACTIVE',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          ...(!dto.isGuest && { OR: [{ visitsRemaining: null }, { visitsRemaining: { gt: 0 } }] }),
        },
        orderBy: { endDate: 'asc' },
      });
      if (!activeMembership && !dto.isGuest) {
        const usedUp = await this.prisma.gymMemberMembership.findFirst({
          where: { memberId, tenantId: user.tenantId, status: 'ACTIVE', endDate: { gte: new Date() }, visitsRemaining: { lte: 0 } },
          select: { id: true },
        });
        if (usedUp) throw new BadRequestException('Is membership ki visits khatam ho chuki hain — renew karein');
      }
      if (!activeMembership && !dto.isGuest) {
        throw new BadRequestException('Koi active membership nahi — pehle renew karein');
      }
      if (activeMembership && !dto.isGuest && activeMembership.visitsRemaining !== null && activeMembership.visitsRemaining <= 0) {
        throw new BadRequestException('Is membership ki visits khatam ho chuki hain — renew karein');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.gymAttendance.create({
        data: {
          tenantId: user.tenantId,
          memberId: memberId!,
          method: (dto.method as any) ?? 'MANUAL',
          entryPoint: dto.entryPoint,
          isGuest: dto.isGuest ?? false,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone,
          invitedByMemberId: dto.invitedByMemberId,
          membershipId: activeMembership?.id,
          checkedInById: user.id,
          notes: dto.notes,
        },
        include: { member: true },
      });

      if (memberId && !dto.isGuest) {
        const member = await tx.gymMember.findUnique({ where: { id: memberId } });
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const wasYesterday = member?.lastVisitAt && new Date(member.lastVisitAt) >= yesterday;
        const newStreak = wasYesterday ? (member?.currentStreak ?? 0) + 1 : 1;

        await tx.gymMember.update({
          where: { id: memberId },
          data: {
            totalVisits: { increment: 1 },
            lastVisitAt: new Date(),
            currentStreak: newStreak,
            longestStreak: Math.max(member?.longestStreak ?? 0, newStreak),
          },
        });

        if (activeMembership && !dto.isGuest) {
          await tx.gymMemberMembership.update({
            where: { id: activeMembership.id },
            data: {
              visitsUsed: { increment: 1 },
              visitsRemaining: activeMembership.visitsRemaining !== null ? Math.max((activeMembership.visitsRemaining ?? 0) - 1, 0) : null,
            },
          });
        }
      }

      return attendance;
    });
  }

  async checkOut(user: AuthenticatedUser, attendanceId: string) {
    const a = await this.prisma.gymAttendance.findFirst({ where: { id: attendanceId, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Attendance not found');
    const checkOutAt = new Date();
    const durationMinutes = Math.round((checkOutAt.getTime() - a.checkInAt.getTime()) / 60000);
    return this.prisma.gymAttendance.update({
      where: { id: attendanceId },
      data: { checkOutAt, durationMinutes },
    });
  }

  async list(user: AuthenticatedUser, params: { memberId?: string; from?: string; to?: string; isGuest?: boolean }) {
    return this.prisma.gymAttendance.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.memberId && { memberId: params.memberId }),
        ...(params.isGuest !== undefined && { isGuest: params.isGuest }),
        ...(params.from || params.to ? {
          checkInAt: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      include: { member: true },
      orderBy: { checkInAt: 'desc' },
      take: 500,
    });
  }

  async currentlyInside(user: AuthenticatedUser) {
    return this.prisma.gymAttendance.findMany({
      where: { tenantId: user.tenantId, checkOutAt: null },
      include: { member: true },
      orderBy: { checkInAt: 'desc' },
    });
  }

  async dailyStats(user: AuthenticatedUser, from: string, to: string) {
    return this.prisma.gymAttendance.groupBy({
      by: ['checkInAt'],
      where: {
        tenantId: user.tenantId,
        checkInAt: { gte: new Date(from), lte: new Date(to) },
      },
      _count: { _all: true },
    });
  }
}

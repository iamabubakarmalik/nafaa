import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    if (!dto.guestNumber) {
      const count = await this.prisma.hotelGuest.count({ where: { tenantId: user.tenantId } });
      dto.guestNumber = 'GST-' + String(count + 1).padStart(6, '0');
    }
    if (dto.idNumber) {
      const dup = await this.prisma.hotelGuest.findFirst({
        where: { tenantId: user.tenantId, idNumber: dto.idNumber, isActive: true },
      });
      if (dup) throw new BadRequestException('Guest with this ID already exists');
    }
    const fullName = ((dto.firstName || '') + ' ' + (dto.lastName || '')).trim() || dto.fullName || 'Guest';
    return this.prisma.hotelGuest.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        idExpiryDate: dto.idExpiryDate ? new Date(dto.idExpiryDate) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { isVIP?: boolean; isBlacklisted?: boolean; nationality?: string; search?: string }) {
    return this.prisma.hotelGuest.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.isVIP !== undefined && { isVIP: params.isVIP }),
        ...(params.isBlacklisted !== undefined && { isBlacklisted: params.isBlacklisted }),
        ...(params.nationality && { nationality: { contains: params.nationality, mode: 'insensitive' } }),
        ...(params.search && {
          OR: [
            { guestNumber: { contains: params.search, mode: 'insensitive' } },
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { firstName: { contains: params.search, mode: 'insensitive' } },
            { lastName: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { idNumber: { contains: params.search } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.hotelGuest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Guest not found');
    return g;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const g = await this.prisma.hotelGuest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Guest not found');
    const fullName = ((dto.firstName || g.firstName || '') + ' ' + (dto.lastName || g.lastName || '')).trim();
    return this.prisma.hotelGuest.update({
      where: { id },
      data: {
        ...dto,
        fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        idExpiryDate: dto.idExpiryDate ? new Date(dto.idExpiryDate) : undefined,
      },
    });
  }

  async blacklist(user: AuthenticatedUser, id: string, reason: string) {
    return this.prisma.hotelGuest.update({
      where: { id },
      data: { isBlacklisted: true, blacklistReason: reason },
    });
  }

  async unblacklist(user: AuthenticatedUser, id: string) {
    return this.prisma.hotelGuest.update({
      where: { id },
      data: { isBlacklisted: false, blacklistReason: null },
    });
  }

  async recordStay(user: AuthenticatedUser, id: string, nights: number, spent: number) {
    const g = await this.prisma.hotelGuest.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Guest not found');
    return this.prisma.hotelGuest.update({
      where: { id },
      data: {
        totalStays: g.totalStays + 1,
        totalNights: g.totalNights + nights,
        totalSpent: g.totalSpent + spent,
        lastStayAt: new Date(),
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    return this.prisma.hotelGuest.update({ where: { id }, data: { isActive: false } });
  }

  async stats(user: AuthenticatedUser) {
    const [total, vip, blacklisted, byNationality] = await Promise.all([
      this.prisma.hotelGuest.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.hotelGuest.count({ where: { tenantId: user.tenantId, isActive: true, isVIP: true } }),
      this.prisma.hotelGuest.count({ where: { tenantId: user.tenantId, isActive: true, isBlacklisted: true } }),
      this.prisma.hotelGuest.groupBy({
        by: ['nationality'],
        where: { tenantId: user.tenantId, isActive: true, nationality: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { nationality: 'desc' } },
        take: 10,
      }),
    ]);
    return { total, vip, blacklisted, byNationality };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertFreeReg(tenantId: string, reg: string, exceptId?: string) {
    const dup = await this.prisma.doctor.findFirst({
      where: { tenantId, registrationNumber: { equals: reg, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { name: true },
    });
    if (dup) throw new BadRequestException(`PMDC ${reg} pehle se ${dup.name} ke naam par hai`);
  }

  /** Names are kept without a "Dr." prefix; screens add it. */
  private clean(dto: UpsertDoctorDto) {
    return { ...dto, name: dto.name.trim().replace(/^dr\.?\s+/i, ''), registrationNumber: dto.registrationNumber.trim() };
  }

  async create(user: AuthenticatedUser, dto: UpsertDoctorDto) {
    const data = this.clean(dto);
    await this.assertFreeReg(user.tenantId, data.registrationNumber);
    return this.prisma.doctor.create({ data: { ...data, tenantId: user.tenantId } });
  }

  /**
   * Doctors with their prescription count and the value dispensed against
   * them, worked out from the prescriptions themselves.
   */
  async list(user: AuthenticatedUser, params: { search?: string; specialization?: string; isActive?: boolean }) {
    const where: Prisma.DoctorWhereInput = {
      tenantId: user.tenantId,
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.specialization && { specialization: params.specialization }),
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { registrationNumber: { contains: params.search, mode: 'insensitive' } },
          { phone: { contains: params.search } },
          { clinicName: { contains: params.search, mode: 'insensitive' } },
          { specialization: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
    };
    const doctors = await this.prisma.doctor.findMany({ where, orderBy: [{ isVerified: 'desc' }, { name: 'asc' }] });
    if (!doctors.length) return [];
    const stats = await this.prisma.prescription.groupBy({
      by: ['doctorId'],
      where: { tenantId: user.tenantId, doctorId: { in: doctors.map((d) => d.id) } },
      _count: { _all: true },
      _sum: { totalAmount: true },
      _max: { createdAt: true },
    });
    const byId = new Map(stats.map((s) => [s.doctorId, s]));
    return doctors.map((d) => {
      const s = byId.get(d.id);
      return {
        ...d,
        totalPrescriptions: s?._count._all ?? 0,
        totalBusiness: Number(s?._sum.totalAmount ?? 0),
        lastPrescriptionAt: s?._max.createdAt ?? null,
      };
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const doc = await this.prisma.doctor.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { items: { take: 3 } },
        },
      },
    });
    if (!doc) throw new NotFoundException('Doctor nahi mila');
    return doc;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertDoctorDto) {
    const doc = await this.prisma.doctor.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!doc) throw new NotFoundException('Doctor nahi mila');
    const data = this.clean(dto);
    await this.assertFreeReg(user.tenantId, data.registrationNumber, id);
    return this.prisma.doctor.update({ where: { id }, data });
  }

  /** Doctors are switched off, never deleted: old prescriptions keep their name. */
  async remove(user: AuthenticatedUser, id: string) {
    const doc = await this.prisma.doctor.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!doc) throw new NotFoundException('Doctor nahi mila');
    return this.prisma.doctor.update({ where: { id }, data: { isActive: false } });
  }

  async verify(user: AuthenticatedUser, id: string) {
    const doc = await this.prisma.doctor.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, isVerified: true } });
    if (!doc) throw new NotFoundException('Doctor nahi mila');
    return this.prisma.doctor.update({ where: { id }, data: { isVerified: !doc.isVerified } });
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertDoctorDto) {
    const dup = await this.prisma.doctor.findFirst({ where: { tenantId: user.tenantId, registrationNumber: dto.registrationNumber } });
    if (dup) throw new BadRequestException(`Doctor with reg # ${dto.registrationNumber} already exists`);
    return this.prisma.doctor.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { search?: string; specialization?: string; isActive?: boolean }) {
    return this.prisma.doctor.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.isActive !== undefined && { isActive: params.isActive }),
        ...(params.specialization && { specialization: params.specialization }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { registrationNumber: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { clinicName: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ isVerified: 'desc' }, { name: 'asc' }],
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
    if (!doc) throw new NotFoundException('Doctor not found');
    return doc;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertDoctorDto) {
    const doc = await this.prisma.doctor.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Doctor not found');
    return this.prisma.doctor.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const doc = await this.prisma.doctor.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Doctor not found');
    return this.prisma.doctor.update({ where: { id }, data: { isActive: false } });
  }

  async verify(user: AuthenticatedUser, id: string) {
    const doc = await this.prisma.doctor.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!doc) throw new NotFoundException('Doctor not found');
    return this.prisma.doctor.update({ where: { id }, data: { isVerified: !doc.isVerified } });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertMeasurementDto } from './dto/upsert-measurement.dto';

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertMeasurementDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // If setting as default, unset others
    if (dto.isDefault) {
      await this.prisma.garmentMeasurementProfile.updateMany({
        where: { tenantId: user.tenantId, customerId: dto.customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.garmentMeasurementProfile.create({
      data: {
        tenantId: user.tenantId,
        measuredById: user.id,
        ...dto,
        profileName: dto.profileName ?? 'Default',
      },
    });
  }

  async listByCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.garmentMeasurementProfile.findMany({
      where: { tenantId: user.tenantId, customerId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async listAll(user: AuthenticatedUser, params: { search?: string; gender?: string }) {
    return this.prisma.garmentMeasurementProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.gender && { gender: params.gender as any }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.garmentMeasurementProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Measurement not found');
    const customer = await this.prisma.customer.findUnique({ where: { id: m.customerId } });
    return { ...m, customer };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertMeasurementDto) {
    const m = await this.prisma.garmentMeasurementProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Measurement not found');

    if (dto.isDefault) {
      await this.prisma.garmentMeasurementProfile.updateMany({
        where: { tenantId: user.tenantId, customerId: m.customerId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.garmentMeasurementProfile.update({
      where: { id },
      data: { ...dto, measuredAt: new Date() },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.garmentMeasurementProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Measurement not found');
    return this.prisma.garmentMeasurementProfile.update({ where: { id }, data: { isActive: false } });
  }
}

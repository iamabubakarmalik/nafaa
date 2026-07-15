import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertVehicleModelDto } from './dto/upsert-vehicle-model.dto';

@Injectable()
export class VehicleModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertVehicleModelDto) {
    const make = await this.prisma.vehicleMake.findFirst({ where: { id: dto.makeId, tenantId: user.tenantId } });
    if (!make) throw new NotFoundException('Make not found');

    const dup = await this.prisma.vehicleModel.findFirst({ where: { tenantId: user.tenantId, makeId: dto.makeId, name: dto.name } });
    if (dup) throw new BadRequestException(`Model "${dto.name}" already exists for this make`);

    return this.prisma.vehicleModel.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { makeId?: string; vehicleType?: string; search?: string; active?: boolean }) {
    return this.prisma.vehicleModel.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.makeId && { makeId: params.makeId }),
        ...(params.vehicleType && { vehicleType: params.vehicleType as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: { make: true },
      orderBy: [{ name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.vehicleModel.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { make: true },
    });
    if (!m) throw new NotFoundException('Model not found');
    return m;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertVehicleModelDto) {
    const m = await this.prisma.vehicleModel.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Model not found');
    return this.prisma.vehicleModel.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.vehicleModel.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Model not found');
    return this.prisma.vehicleModel.update({ where: { id }, data: { isActive: false } });
  }
}

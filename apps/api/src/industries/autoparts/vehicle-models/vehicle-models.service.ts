import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertVehicleModelDto } from './dto/upsert-vehicle-model.dto';

@Injectable()
export class VehicleModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertVehicleModelDto) {
    const make = await this.prisma.vehicleMake.findFirst({ where: { id: dto.makeId, tenantId: user.tenantId } });
    if (!make) throw new NotFoundException('Make not found');

    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Model ka naam likhein');
    if (dto.yearFrom && dto.yearTo && dto.yearFrom > dto.yearTo) throw new BadRequestException('Saal "se" saal "tak" se bara hai');
    const dup = await this.prisma.vehicleModel.findFirst({ where: { tenantId: user.tenantId, makeId: dto.makeId, name: { equals: name, mode: 'insensitive' } } });
    if (dup) throw new BadRequestException(`Model "${name}" is company me pehle se hai`);

    return this.prisma.vehicleModel.create({ data: { tenantId: user.tenantId, ...dto, name } });
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
    const makeId = dto.makeId ?? m.makeId;
    if (makeId !== m.makeId && !(await this.prisma.vehicleMake.findFirst({ where: { id: makeId, tenantId: user.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Make not found');
    }
    const name = dto.name?.trim() || m.name;
    const dup = await this.prisma.vehicleModel.findFirst({ where: { tenantId: user.tenantId, makeId, name, id: { not: id } }, select: { id: true } });
    if (dup) throw new BadRequestException(`Model "${name}" is company me pehle se hai`);
    if (dto.yearFrom && dto.yearTo && dto.yearFrom > dto.yearTo) throw new BadRequestException('Saal "se" saal "tak" se bara hai');
    return this.prisma.vehicleModel.update({ where: { id }, data: { ...dto, makeId, name } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.vehicleModel.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Model not found');
    return this.prisma.vehicleModel.update({ where: { id }, data: { isActive: false } });
  }
}

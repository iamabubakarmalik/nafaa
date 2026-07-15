import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertVehicleMakeDto } from './dto/upsert-vehicle-make.dto';

@Injectable()
export class VehicleMakesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertVehicleMakeDto) {
    const dup = await this.prisma.vehicleMake.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Make "${dto.name}" already exists`);
    return this.prisma.vehicleMake.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { search?: string; active?: boolean }) {
    return this.prisma.vehicleMake.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && { name: { contains: params.search, mode: 'insensitive' } }),
      },
      include: { _count: { select: { models: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.vehicleMake.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { models: { orderBy: { name: 'asc' } } },
    });
    if (!m) throw new NotFoundException('Make not found');
    return m;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertVehicleMakeDto) {
    const m = await this.prisma.vehicleMake.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Make not found');
    return this.prisma.vehicleMake.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.vehicleMake.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Make not found');
    return this.prisma.vehicleMake.update({ where: { id }, data: { isActive: false } });
  }

  async seedPakistaniMakes(user: AuthenticatedUser) {
    const makes = [
      { name: 'Toyota', country: 'Japan' },
      { name: 'Honda', country: 'Japan' },
      { name: 'Suzuki', country: 'Japan' },
      { name: 'Nissan', country: 'Japan' },
      { name: 'Mitsubishi', country: 'Japan' },
      { name: 'Daihatsu', country: 'Japan' },
      { name: 'Mazda', country: 'Japan' },
      { name: 'Hyundai', country: 'South Korea' },
      { name: 'KIA', country: 'South Korea' },
      { name: 'Changan', country: 'China' },
      { name: 'Haval', country: 'China' },
      { name: 'MG', country: 'China' },
      { name: 'Proton', country: 'Malaysia' },
      { name: 'Isuzu', country: 'Japan' },
      { name: 'Hino', country: 'Japan' },
      { name: 'FAW', country: 'China' },
      { name: 'Master', country: 'Pakistan' },
      { name: 'JAC', country: 'China' },
      { name: 'DFSK', country: 'China' },
      { name: 'Prince', country: 'China' },
      { name: 'BMW', country: 'Germany' },
      { name: 'Mercedes-Benz', country: 'Germany' },
      { name: 'Audi', country: 'Germany' },
      { name: 'Volkswagen', country: 'Germany' },
      // Motorcycles
      { name: 'Honda Motorcycle', country: 'Japan' },
      { name: 'Yamaha', country: 'Japan' },
      { name: 'Suzuki Motorcycle', country: 'Japan' },
      { name: 'United', country: 'Pakistan' },
      { name: 'Road Prince', country: 'Pakistan' },
      { name: 'Super Star', country: 'Pakistan' },
      { name: 'Ravi', country: 'Pakistan' },
    ];
    let count = 0;
    for (const [i, m] of makes.entries()) {
      const exists = await this.prisma.vehicleMake.findFirst({ where: { tenantId: user.tenantId, name: m.name } });
      if (!exists) {
        await this.prisma.vehicleMake.create({ data: { tenantId: user.tenantId, ...m, displayOrder: i } });
        count++;
      }
    }
    return { created: count, total: makes.length };
  }
}

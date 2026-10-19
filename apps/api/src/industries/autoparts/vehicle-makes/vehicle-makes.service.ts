import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { VehicleType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertVehicleMakeDto } from './dto/upsert-vehicle-make.dto';

const PK_MODELS: Record<string, Array<[string, VehicleType]>> = {
  Toyota: [['Corolla', 'CAR'], ['Yaris', 'CAR'], ['Vitz', 'CAR'], ['Passo', 'CAR'], ['Prius', 'CAR'], ['Camry', 'CAR'], ['Fortuner', 'SUV'], ['Land Cruiser', 'SUV'], ['Prado', 'SUV'], ['Hilux', 'PICKUP'], ['Hiace', 'VAN'], ['Raize', 'SUV'], ['Rush', 'SUV']],
  Honda: [['Civic', 'CAR'], ['City', 'CAR'], ['BR-V', 'SUV'], ['HR-V', 'SUV'], ['Vezel', 'SUV'], ['Fit', 'CAR'], ['Accord', 'CAR'], ['N-Wgn', 'CAR']],
  Suzuki: [['Mehran', 'CAR'], ['Alto', 'CAR'], ['Cultus', 'CAR'], ['Wagon R', 'CAR'], ['Swift', 'CAR'], ['Bolan', 'VAN'], ['Ravi', 'PICKUP'], ['Every', 'VAN'], ['Khyber', 'CAR'], ['Jimny', 'SUV'], ['Vitara', 'SUV']],
  Daihatsu: [['Cuore', 'CAR'], ['Mira', 'CAR'], ['Move', 'CAR'], ['Hijet', 'VAN']],
  Nissan: [['Dayz', 'CAR'], ['Sunny', 'CAR'], ['Note', 'CAR']],
  Hyundai: [['Tucson', 'SUV'], ['Elantra', 'CAR'], ['Sonata', 'CAR'], ['Santro', 'CAR'], ['Porter', 'PICKUP']],
  KIA: [['Sportage', 'SUV'], ['Picanto', 'CAR'], ['Stonic', 'SUV'], ['Sorento', 'SUV']],
  Changan: [['Alsvin', 'CAR'], ['Oshan X7', 'SUV'], ['Karvaan', 'VAN'], ['M9', 'PICKUP']],
  Haval: [['H6', 'SUV'], ['Jolion', 'SUV']],
  MG: [['HS', 'SUV'], ['ZS', 'SUV'], ['MG 5', 'CAR']],
  Proton: [['Saga', 'CAR'], ['X70', 'SUV']],
  'Honda Motorcycle': [['CD 70', 'MOTORCYCLE'], ['CD 70 Dream', 'MOTORCYCLE'], ['Pridor', 'MOTORCYCLE'], ['CG 125', 'MOTORCYCLE'], ['CB 125F', 'MOTORCYCLE'], ['CB 150F', 'MOTORCYCLE']],
  Yamaha: [['YBR 125', 'MOTORCYCLE'], ['YBR 125G', 'MOTORCYCLE'], ['YB 125Z', 'MOTORCYCLE']],
  'Suzuki Motorcycle': [['GD 110', 'MOTORCYCLE'], ['GS 150', 'MOTORCYCLE'], ['GR 150', 'MOTORCYCLE']],
  United: [['US 70', 'MOTORCYCLE'], ['US 125', 'MOTORCYCLE'], ['Loader Rickshaw', 'RICKSHAW']],
  'Road Prince': [['RP 70', 'MOTORCYCLE'], ['RP 125', 'MOTORCYCLE']],
  'Super Star': [['SS 70', 'MOTORCYCLE']],
};

@Injectable()
export class VehicleMakesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertVehicleMakeDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Company ka naam likhein');
    const dup = await this.prisma.vehicleMake.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' } } });
    if (dup) throw new BadRequestException(`Company "${name}" pehle se hai`);
    return this.prisma.vehicleMake.create({ data: { tenantId: user.tenantId, ...dto, name } });
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
    const name = dto.name?.trim() || m.name;
    const dup = await this.prisma.vehicleMake.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' }, id: { not: id } }, select: { id: true } });
    if (dup) throw new BadRequestException(`Company "${name}" pehle se hai`);
    return this.prisma.vehicleMake.update({ where: { id }, data: { ...dto, name } });
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
    let modelCount = 0;
    for (const [i, m] of makes.entries()) {
      let make = await this.prisma.vehicleMake.findFirst({ where: { tenantId: user.tenantId, name: m.name } });
      if (!make) {
        make = await this.prisma.vehicleMake.create({ data: { tenantId: user.tenantId, ...m, displayOrder: i } });
        count++;
      }
      // Common models on Pakistani roads; existing ones are left as they are.
      for (const [name, vehicleType] of PK_MODELS[m.name] ?? []) {
        const has = await this.prisma.vehicleModel.findFirst({ where: { tenantId: user.tenantId, makeId: make.id, name }, select: { id: true } });
        if (has) continue;
        await this.prisma.vehicleModel.create({ data: { tenantId: user.tenantId, makeId: make.id, name, vehicleType } });
        modelCount++;
      }
    }
    return { created: count, models: modelCount, total: makes.length };
  }
}

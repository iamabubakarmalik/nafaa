import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertCustomerVehicleDto } from './dto/upsert-customer-vehicle.dto';

@Injectable()
export class CustomerVehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertCustomerVehicleDto) {
    const dup = await this.prisma.customerVehicle.findFirst({
      where: { tenantId: user.tenantId, registrationNumber: dto.registrationNumber },
    });
    if (dup) throw new BadRequestException(`Vehicle "${dto.registrationNumber}" already registered`);

    // Auto-populate makeName/modelName from IDs
    let makeName = dto.makeName;
    let modelName = dto.modelName;
    if (dto.makeId && !makeName) {
      const make = await this.prisma.vehicleMake.findUnique({ where: { id: dto.makeId } });
      makeName = make?.name;
    }
    if (dto.modelId && !modelName) {
      const model = await this.prisma.vehicleModel.findUnique({ where: { id: dto.modelId } });
      modelName = model?.name;
    }

    return this.prisma.customerVehicle.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        customerId: dto.customerId || '',
        makeName,
        modelName,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : null,
        tokenTaxExpiry: dto.tokenTaxExpiry ? new Date(dto.tokenTaxExpiry) : null,
        fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : null,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { customerId?: string; makeId?: string; vehicleType?: string; search?: string; active?: boolean }) {
    return this.prisma.customerVehicle.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.customerId && { customerId: params.customerId }),
        ...(params.makeId && { makeId: params.makeId }),
        ...(params.vehicleType && { vehicleType: params.vehicleType as any }),
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.search && {
          OR: [
            { registrationNumber: { contains: params.search, mode: 'insensitive' } },
            { ownerName: { contains: params.search, mode: 'insensitive' } },
            { ownerPhone: { contains: params.search } },
            { chassisNumber: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Vehicle not found');

    let customer = null;
    if (v.customerId) customer = await this.prisma.customer.findUnique({ where: { id: v.customerId } });

    // Service history
    const jobs = await this.prisma.workshopJob.findMany({
      where: { tenantId: user.tenantId, vehicleId: id },
      include: { laborItems: true, partsUsed: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Reminders
    const reminders = await this.prisma.vehicleServiceReminder.findMany({
      where: { tenantId: user.tenantId, vehicleId: id, status: { in: ['PENDING', 'SENT'] } },
      orderBy: { dueDate: 'asc' },
    });

    return { ...v, customer, serviceHistory: jobs, reminders };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCustomerVehicleDto) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Vehicle not found');
    return this.prisma.customerVehicle.update({
      where: { id },
      data: {
        ...dto,
        insuranceExpiry: dto.insuranceExpiry ? new Date(dto.insuranceExpiry) : undefined,
        tokenTaxExpiry: dto.tokenTaxExpiry ? new Date(dto.tokenTaxExpiry) : undefined,
        fitnessExpiry: dto.fitnessExpiry ? new Date(dto.fitnessExpiry) : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Vehicle not found');
    return this.prisma.customerVehicle.update({ where: { id }, data: { isActive: false } });
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.customerVehicle.findMany({
      where: { tenantId: user.tenantId, customerId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async expiringDocuments(user: AuthenticatedUser, days = 30) {
    const cutoff = addDays(new Date(), days);
    const now = new Date();

    const [insuranceExpiring, tokenExpiring, fitnessExpiring] = await Promise.all([
      this.prisma.customerVehicle.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          insuranceExpiry: { gte: now, lte: cutoff },
        },
        orderBy: { insuranceExpiry: 'asc' },
      }),
      this.prisma.customerVehicle.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          tokenTaxExpiry: { gte: now, lte: cutoff },
        },
        orderBy: { tokenTaxExpiry: 'asc' },
      }),
      this.prisma.customerVehicle.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          fitnessExpiry: { gte: now, lte: cutoff },
        },
        orderBy: { fitnessExpiry: 'asc' },
      }),
    ]);

    return { insuranceExpiring, tokenExpiring, fitnessExpiring };
  }
}

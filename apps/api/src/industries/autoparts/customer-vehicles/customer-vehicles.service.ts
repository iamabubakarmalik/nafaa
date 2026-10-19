import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { addDays } from 'date-fns';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ensureCustomer } from '../../_shared/industry-sale.helper';
import { ListVehiclesQuery, UpsertCustomerVehicleDto } from './dto/upsert-customer-vehicle.dto';

const blank = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
const regNo = (v?: string | null) => blank(v)?.toUpperCase().replace(/\s+/g, ' ');

function toDate(v: string | undefined, label: string): Date | null | undefined {
  if (v === undefined) return undefined;
  if (!v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${label} ki date sahi likhein`);
  return d;
}

@Injectable()
export class CustomerVehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Make/model names from their ids, both checked against the tenant. */
  private async names(tenantId: string, dto: UpsertCustomerVehicleDto) {
    let makeName = blank(dto.makeName);
    let modelName = blank(dto.modelName);
    const makeId = blank(dto.makeId);
    const modelId = blank(dto.modelId);
    if (makeId) {
      const make = await this.prisma.vehicleMake.findFirst({ where: { id: makeId, tenantId }, select: { name: true } });
      if (!make) throw new NotFoundException('Company nahi mili');
      makeName = makeName ?? make.name;
    }
    if (modelId) {
      const model = await this.prisma.vehicleModel.findFirst({ where: { id: modelId, tenantId, ...(makeId && { makeId }) }, select: { name: true, vehicleType: true } });
      if (!model) throw new NotFoundException('Model nahi mila');
      modelName = modelName ?? model.name;
    }
    return { makeId: makeId ?? null, modelId: modelId ?? null, makeName, modelName };
  }

  private data(dto: UpsertCustomerVehicleDto) {
    return {
      chassisNumber: blank(dto.chassisNumber), engineNumber: blank(dto.engineNumber), vehicleType: dto.vehicleType,
      year: dto.year, color: blank(dto.color), fuelType: dto.fuelType, transmission: dto.transmission, engineCC: dto.engineCC,
      odometerKm: dto.odometerKm, ownerName: blank(dto.ownerName), ownerPhone: blank(dto.ownerPhone), ownerCnic: blank(dto.ownerCnic),
      insuranceProvider: blank(dto.insuranceProvider), insurancePolicyNumber: blank(dto.insurancePolicyNumber),
      insuranceExpiry: toDate(dto.insuranceExpiry, 'Insurance'), tokenTaxExpiry: toDate(dto.tokenTaxExpiry, 'Token tax'),
      fitnessExpiry: toDate(dto.fitnessExpiry, 'Fitness'), documentUrls: dto.documentUrls, photoUrls: dto.photoUrls,
      preferredMechanicId: blank(dto.preferredMechanicId), notes: blank(dto.notes), isActive: dto.isActive,
    };
  }

  /** The vehicle's owner on the khata: picked, or found/opened from the owner's name and phone. */
  private async owner(user: AuthenticatedUser, dto: UpsertCustomerVehicleDto) {
    const id = blank(dto.customerId);
    if (id) {
      const c = await this.prisma.customer.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
      return id;
    }
    if (!blank(dto.ownerName) && !blank(dto.ownerPhone)) return undefined;
    return this.prisma.$transaction((tx) => ensureCustomer(tx, user, { name: blank(dto.ownerName) ?? blank(dto.ownerPhone), phone: blank(dto.ownerPhone) }));
  }

  async create(user: AuthenticatedUser, dto: UpsertCustomerVehicleDto) {
    const registrationNumber = regNo(dto.registrationNumber);
    if (!registrationNumber) throw new BadRequestException('Gaari ka number likhein');
    const dup = await this.prisma.customerVehicle.findFirst({
      where: { tenantId: user.tenantId, registrationNumber: { equals: registrationNumber, mode: 'insensitive' } }, select: { id: true, isActive: true },
    });
    if (dup) throw new BadRequestException(dup.isActive ? `Gaari "${registrationNumber}" pehle se darj hai` : `Gaari "${registrationNumber}" pehle darj thi aur band hai — usay dobara chalu karein`);
    const names = await this.names(user.tenantId, dto);
    const customerId = await this.owner(user, dto);
    return this.prisma.customerVehicle.create({
      data: { tenantId: user.tenantId, registrationNumber, customerId: customerId ?? '', ...names, ...this.data(dto) },
    });
  }

  private listWhere(user: AuthenticatedUser, q: ListVehiclesQuery): Prisma.CustomerVehicleWhereInput {
    const now = new Date();
    const soon = addDays(now, 30);
    const and: Prisma.CustomerVehicleWhereInput[] = [{ tenantId: user.tenantId }];
    and.push({ isActive: q.view === 'inactive' ? false : q.active === 'false' ? false : true });
    if (q.customerId) and.push({ customerId: q.customerId });
    if (q.makeId) and.push({ makeId: q.makeId });
    if (q.vehicleType) and.push({ vehicleType: q.vehicleType });
    if (q.view === 'papers') {
      and.push({ OR: [{ insuranceExpiry: { lte: soon } }, { tokenTaxExpiry: { lte: soon } }, { fitnessExpiry: { lte: soon } }] });
    }
    if (q.view === 'regular') and.push({ totalServices: { gte: 3 } });
    if (q.view === 'away') and.push({ lastServiceAt: { lt: addDays(now, -120) } });
    const s = q.search?.trim();
    if (s) {
      and.push({
        OR: [
          { registrationNumber: { contains: s, mode: 'insensitive' } },
          { ownerName: { contains: s, mode: 'insensitive' } },
          { ownerPhone: { contains: s } },
          { chassisNumber: { contains: s, mode: 'insensitive' } },
          { makeName: { contains: s, mode: 'insensitive' } },
          { modelName: { contains: s, mode: 'insensitive' } },
        ],
      });
    }
    return { AND: and };
  }

  /** Without `page` the old shape (a plain array) is returned; with `page` a page with counts. */
  async list(user: AuthenticatedUser, q: ListVehiclesQuery) {
    const where = this.listWhere(user, q);
    const orderBy: Prisma.CustomerVehicleOrderByWithRelationInput[] = q.sort === 'name' ? [{ registrationNumber: 'asc' }]
      : q.sort === 'spent' ? [{ totalSpent: 'desc' }]
        : q.sort === 'visits' ? [{ totalServices: 'desc' }]
          : [{ lastServiceAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }];
    if (!q.page) return this.prisma.customerVehicle.findMany({ where, orderBy, take: 200 });
    const limit = q.limit ?? 40;
    const [items, total] = await Promise.all([
      this.prisma.customerVehicle.findMany({ where, orderBy, skip: (q.page - 1) * limit, take: limit }),
      this.prisma.customerVehicle.count({ where }),
    ]);
    const open = items.length
      ? await this.prisma.workshopJob.groupBy({ by: ['vehicleId'], where: { tenantId: user.tenantId, vehicleId: { in: items.map((v) => v.id) }, status: { notIn: ['DELIVERED', 'CANCELLED'] } }, _count: { _all: true } })
      : [];
    const openOf = new Map(open.map((o) => [o.vehicleId, o._count._all]));
    return { items: items.map((v) => ({ ...v, openJobs: openOf.get(v.id) ?? 0 })), total, page: q.page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) };
  }

  /** Counts for the vehicles page. */
  async stats(user: AuthenticatedUser) {
    const now = new Date();
    const soon = addDays(now, 30);
    const base = { tenantId: user.tenantId, isActive: true };
    const [total, papers, regular, away, inShop] = await Promise.all([
      this.prisma.customerVehicle.count({ where: base }),
      this.prisma.customerVehicle.count({ where: { ...base, OR: [{ insuranceExpiry: { lte: soon } }, { tokenTaxExpiry: { lte: soon } }, { fitnessExpiry: { lte: soon } }] } }),
      this.prisma.customerVehicle.count({ where: { ...base, totalServices: { gte: 3 } } }),
      this.prisma.customerVehicle.count({ where: { ...base, lastServiceAt: { lt: addDays(now, -120) } } }),
      this.prisma.workshopJob.count({ where: { tenantId: user.tenantId, status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
    ]);
    return { total, papers, regular, away, inShop };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Gaari nahi mili');
    const [customer, serviceHistory, reminders] = await Promise.all([
      v.customerId ? this.prisma.customer.findFirst({ where: { id: v.customerId, tenantId: user.tenantId }, select: { id: true, name: true, phone: true, balance: true } }) : null,
      this.prisma.workshopJob.findMany({
        where: { tenantId: user.tenantId, vehicleId: id },
        include: { laborItems: true, partsUsed: true },
        orderBy: { receivedAt: 'desc' },
        take: 30,
      }),
      this.prisma.vehicleServiceReminder.findMany({
        where: { tenantId: user.tenantId, vehicleId: id, status: { in: ['PENDING', 'SENT', 'SNOOZED'] } },
        orderBy: { dueDate: 'asc' },
      }),
    ]);
    return { ...v, customer, serviceHistory, reminders };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertCustomerVehicleDto) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Gaari nahi mili');
    const registrationNumber = dto.registrationNumber !== undefined ? regNo(dto.registrationNumber) : undefined;
    if (dto.registrationNumber !== undefined && !registrationNumber) throw new BadRequestException('Gaari ka number likhein');
    if (registrationNumber && registrationNumber.toUpperCase() !== v.registrationNumber.toUpperCase()) {
      const dup = await this.prisma.customerVehicle.findFirst({
        where: { tenantId: user.tenantId, id: { not: id }, registrationNumber: { equals: registrationNumber, mode: 'insensitive' } }, select: { id: true },
      });
      if (dup) throw new BadRequestException(`Gaari "${registrationNumber}" pehle se darj hai`);
    }
    const names = dto.makeId !== undefined || dto.modelId !== undefined || dto.makeName !== undefined || dto.modelName !== undefined
      ? await this.names(user.tenantId, dto) : {};
    const customerId = dto.customerId !== undefined || (!v.customerId && (dto.ownerName || dto.ownerPhone)) ? await this.owner(user, dto) : undefined;
    return this.prisma.customerVehicle.update({
      where: { id },
      data: { registrationNumber, ...names, ...(customerId && { customerId }), ...this.data(dto) },
    });
  }

  /** Vehicles are switched off, never deleted: their job history stays. */
  async remove(user: AuthenticatedUser, id: string) {
    const v = await this.prisma.customerVehicle.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!v) throw new NotFoundException('Gaari nahi mili');
    return this.prisma.customerVehicle.update({ where: { id }, data: { isActive: false } });
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.customerVehicle.findMany({
      where: { tenantId: user.tenantId, customerId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async expiringDocuments(user: AuthenticatedUser, days = 30) {
    const cutoff = addDays(new Date(), Math.min(Math.max(days, 1), 365));
    const now = new Date();
    const where = (field: 'insuranceExpiry' | 'tokenTaxExpiry' | 'fitnessExpiry'): Prisma.CustomerVehicleWhereInput => ({
      tenantId: user.tenantId, isActive: true, [field]: { gte: now, lte: cutoff },
    });
    const [insuranceExpiring, tokenExpiring, fitnessExpiring] = await Promise.all([
      this.prisma.customerVehicle.findMany({ where: where('insuranceExpiry'), orderBy: { insuranceExpiry: 'asc' } }),
      this.prisma.customerVehicle.findMany({ where: where('tokenTaxExpiry'), orderBy: { tokenTaxExpiry: 'asc' } }),
      this.prisma.customerVehicle.findMany({ where: where('fitnessExpiry'), orderBy: { fitnessExpiry: 'asc' } }),
    ]);
    return { insuranceExpiring, tokenExpiring, fitnessExpiring };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AddMedicalRecordDto, SellAnimalDto, UpdateAnimalStatusDto, UpsertLiveAnimalDto } from './dto/upsert-live-animal.dto';

@Injectable()
export class LiveAnimalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertLiveAnimalDto) {
    const count = await this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId } });
    const prefix = dto.species.slice(0, 3).toUpperCase();
    const animalNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.petLiveAnimal.create({
      data: {
        tenantId: user.tenantId,
        animalNumber,
        ...dto,
        imageUrls: dto.imageUrls ?? [],
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        acquiredDate: dto.acquiredDate ? new Date(dto.acquiredDate) : new Date(),
        status: 'AVAILABLE',
      },
    });
  }

  async list(user: AuthenticatedUser, params: {
    species?: string; status?: string; breed?: string; featured?: boolean;
    vaccinated?: boolean; minPrice?: number; maxPrice?: number; search?: string;
  }) {
    return this.prisma.petLiveAnimal.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.species && { species: params.species as any }),
        ...(params.status && { status: params.status as any }),
        ...(params.breed && { breed: { contains: params.breed, mode: 'insensitive' } }),
        ...(params.featured !== undefined && { isFeatured: params.featured }),
        ...(params.vaccinated !== undefined && { isVaccinated: params.vaccinated }),
        ...(params.minPrice || params.maxPrice ? {
          askingPrice: {
            ...(params.minPrice && { gte: params.minPrice }),
            ...(params.maxPrice && { lte: params.maxPrice }),
          },
        } : {}),
        ...(params.search && {
          OR: [
            { animalNumber: { contains: params.search, mode: 'insensitive' } },
            { name: { contains: params.search, mode: 'insensitive' } },
            { breed: { contains: params.search, mode: 'insensitive' } },
            { color: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ status: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');

    const ageDays = a.birthDate ? Math.floor((Date.now() - new Date(a.birthDate).getTime()) / 86400000) : null;
    const daysInStore = a.acquiredDate ? Math.floor((Date.now() - new Date(a.acquiredDate).getTime()) / 86400000) : null;
    const profit = a.soldPrice && a.costPrice ? a.soldPrice - a.costPrice : null;

    return {
      ...a,
      computed: {
        ageDays,
        ageMonthsComputed: ageDays != null ? Math.floor(ageDays / 30) : a.ageMonths,
        daysInStore,
        profit,
        isLongStay: daysInStore != null && daysInStore > 60 && a.status === 'AVAILABLE',
      },
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertLiveAnimalDto) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status === 'SOLD') throw new BadRequestException('Cannot edit a sold animal');

    return this.prisma.petLiveAnimal.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        acquiredDate: dto.acquiredDate ? new Date(dto.acquiredDate) : undefined,
      },
    });
  }

  async reserve(user: AuthenticatedUser, id: string, customerName?: string) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status !== 'AVAILABLE') throw new BadRequestException(`Animal is ${a.status}, cannot reserve`);

    return this.prisma.petLiveAnimal.update({
      where: { id },
      data: {
        status: 'RESERVED',
        notes: customerName ? ((a.notes || '') + `\nReserved for ${customerName}`).trim() : a.notes,
      },
    });
  }

  async unreserve(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status !== 'RESERVED') throw new BadRequestException('Animal is not reserved');
    return this.prisma.petLiveAnimal.update({ where: { id }, data: { status: 'AVAILABLE' } });
  }

  async sell(user: AuthenticatedUser, id: string, dto: SellAnimalDto) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status === 'SOLD') throw new BadRequestException('Animal already sold');
    if (a.status === 'DECEASED') throw new BadRequestException('Animal is deceased');

    return this.prisma.petLiveAnimal.update({
      where: { id },
      data: {
        status: 'SOLD',
        soldPrice: dto.soldPrice,
        soldAt: new Date(),
        soldToCustomerId: dto.soldToCustomerId,
        soldToCustomerName: dto.soldToCustomerName,
        notes: dto.notes ? ((a.notes || '') + '\n' + dto.notes).trim() : a.notes,
      },
    });
  }

  async addMedicalRecord(user: AuthenticatedUser, id: string, dto: AddMedicalRecordDto) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');

    const history = (a.medicalHistory as any[]) ?? [];
    history.push({
      at: new Date().toISOString(),
      type: dto.type,
      description: dto.description,
      vetName: dto.vetName,
      cost: dto.cost ?? 0,
      nextDueDate: dto.nextDueDate,
    });

    const patch: any = { medicalHistory: history };
    const t = dto.type.toUpperCase();
    if (t.includes('VACCIN')) {
      patch.isVaccinated = true;
      patch.vaccinationDetails = ((a.vaccinationDetails || '') + `\n${dto.description}`).trim();
    }
    if (t.includes('DEWORM')) {
      patch.isDewormed = true;
      patch.dewormingDetails = ((a.dewormingDetails || '') + `\n${dto.description}`).trim();
    }

    return this.prisma.petLiveAnimal.update({ where: { id }, data: patch });
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateAnimalStatusDto) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');

    return this.prisma.petLiveAnimal.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.reason ? ((a.notes || '') + `\n[${dto.status}] ${dto.reason}`).trim() : a.notes,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const a = await this.prisma.petLiveAnimal.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!a) throw new NotFoundException('Animal not found');
    if (a.status === 'SOLD') throw new BadRequestException('Cannot delete a sold animal record');
    return this.prisma.petLiveAnimal.delete({ where: { id } });
  }

  async summary(user: AuthenticatedUser) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [available, reserved, sold, deceased, financials, monthlySales] = await Promise.all([
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'AVAILABLE' } }),
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'RESERVED' } }),
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'SOLD' } }),
      this.prisma.petLiveAnimal.count({ where: { tenantId: user.tenantId, status: 'DECEASED' } }),
      this.prisma.petLiveAnimal.aggregate({
        where: { tenantId: user.tenantId, status: 'AVAILABLE' },
        _sum: { askingPrice: true, costPrice: true },
      }),
      this.prisma.petLiveAnimal.aggregate({
        where: { tenantId: user.tenantId, status: 'SOLD', soldAt: { gte: monthStart } },
        _sum: { soldPrice: true, costPrice: true },
        _count: { _all: true },
      }),
    ]);

    const revenue = monthlySales._sum.soldPrice ?? 0;
    const cost = monthlySales._sum.costPrice ?? 0;

    const bySpecies = await this.prisma.petLiveAnimal.groupBy({
      by: ['species'],
      where: { tenantId: user.tenantId, status: 'AVAILABLE' },
      _count: { _all: true },
    });

    return {
      available, reserved, sold, deceased,
      inventoryValue: financials._sum.askingPrice ?? 0,
      inventoryCost: financials._sum.costPrice ?? 0,
      monthly: { count: monthlySales._count._all, revenue, cost, profit: revenue - cost },
      bySpecies: bySpecies.map((s) => ({ species: s.species, count: s._count._all })),
    };
  }

  /** Animals sitting in store too long — discount candidates */
  async longStay(user: AuthenticatedUser, days = 60) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return this.prisma.petLiveAnimal.findMany({
      where: { tenantId: user.tenantId, status: 'AVAILABLE', acquiredDate: { lte: cutoff } },
      orderBy: { acquiredDate: 'asc' },
    });
  }

  /** Animals needing vaccination / deworming */
  async healthAlerts(user: AuthenticatedUser) {
    return this.prisma.petLiveAnimal.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['AVAILABLE', 'RESERVED'] },
        OR: [{ isVaccinated: false }, { isDewormed: false }],
      },
      orderBy: { acquiredDate: 'asc' },
    });
  }
}

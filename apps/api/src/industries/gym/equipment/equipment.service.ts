import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GymEquipmentCategory, GymEquipmentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { ShopScope } from '../../../common/shop-scope';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { DAY_MS, assertCan, gymClock, nextNumber, opt, r2 } from '../common/gym-common';
import { CreateEquipmentDto, MaintenanceDto, UpdateEquipmentDto } from './dto/equipment.dto';

const REPAIR_CATEGORY = { name: 'Gym machine repair', icon: '🔧', color: '#0ea5e9' };
const day = (v?: string | null) => (v ? new Date(v) : v === null ? null : undefined);

@Injectable()
export class EquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
    private readonly expenses: ExpensesService,
  ) {}

  private fields(dto: UpdateEquipmentDto) {
    const { equipmentNumber: _n, purchaseDate, warrantyExpiry, nextMaintenanceDate, ...rest } = dto;
    return {
      ...rest,
      ...(rest.name !== undefined && { name: rest.name.trim() }),
      ...(purchaseDate !== undefined && { purchaseDate: day(purchaseDate) }),
      ...(warrantyExpiry !== undefined && { warrantyExpiry: day(warrantyExpiry) }),
      ...(nextMaintenanceDate !== undefined && { nextMaintenanceDate: day(nextMaintenanceDate) }),
    };
  }

  async create(user: AuthenticatedUser, dto: CreateEquipmentDto) {
    const tenantId = user.tenantId;
    return this.prisma.$transaction(async (tx) => {
      let equipmentNumber = opt(dto.equipmentNumber);
      if (equipmentNumber) {
        const dup = await tx.gymEquipment.findFirst({ where: { tenantId, equipmentNumber }, select: { id: true } });
        if (dup) throw new BadRequestException(`Number ${equipmentNumber} pehle se kisi machine ka hai`);
      } else {
        equipmentNumber = await nextNumber(tx, tenantId, 'EQ-', async () => (await tx.gymEquipment.findFirst({
          where: { tenantId, equipmentNumber: { startsWith: 'EQ-' } }, orderBy: { equipmentNumber: 'desc' }, select: { equipmentNumber: true },
        }))?.equipmentNumber, 4);
      }
      return tx.gymEquipment.create({ data: { ...this.fields(dto), name: dto.name.trim(), category: dto.category, tenantId, equipmentNumber } });
    });
  }

  async list(user: AuthenticatedUser, params: { category?: string; status?: string; search?: string }) {
    const q = params.search?.trim();
    return this.prisma.gymEquipment.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(params.category && { category: params.category as GymEquipmentCategory }),
        ...(params.status && { status: params.status as GymEquipmentStatus }),
        ...(q && {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { brand: { contains: q, mode: 'insensitive' } },
            { equipmentNumber: { contains: q, mode: 'insensitive' } },
            { serialNumber: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const e = await this.prisma.gymEquipment.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!e) throw new NotFoundException('Machine nahi mili');
    return e;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEquipmentDto) {
    await this.getOne(user, id);
    return this.prisma.gymEquipment.update({ where: { id }, data: this.fields(dto) as Prisma.GymEquipmentUpdateInput });
  }

  /**
   * Service or repair done. A repair paid now is written as an expense
   * (drawer for cash), so the day book and profit show it.
   */
  async recordMaintenance(user: AuthenticatedUser, scope: ShopScope, id: string, dto: MaintenanceDto) {
    const e = await this.getOne(user, id);
    const cost = r2(dto.cost);
    if (dto.paid && cost > 0) assertCan(user, [PERMISSIONS.EXPENSES_CREATE], 'Repair ka kharcha likhne');
    const clock = await gymClock(this.tz, user.tenantId);
    const nextMaintenanceDate = dto.nextDate
      ? clock.dayStart(dto.nextDate)
      : e.maintenanceIntervalDays ? new Date(clock.dayStart().getTime() + e.maintenanceIntervalDays * DAY_MS) : null;
    if (dto.paid && cost > 0) {
      const category = await this.prisma.expenseCategory.upsert({
        where: { tenantId_name: { tenantId: user.tenantId, name: REPAIR_CATEGORY.name } },
        update: {},
        create: { tenantId: user.tenantId, ...REPAIR_CATEGORY },
        select: { id: true },
      });
      await this.expenses.create(user, scope, {
        title: `Repair · ${e.equipmentNumber} · ${e.name}`.slice(0, 120),
        description: opt(dto.notes)?.slice(0, 500),
        amount: cost,
        paymentMethod: (dto.paymentMethod as PaymentMethod) ?? 'CASH',
        status: 'PAID',
        categoryId: category.id,
        ...(e.shopId && { shopId: e.shopId }),
      });
    }
    const note = opt(dto.notes);
    return this.prisma.gymEquipment.update({
      where: { id },
      data: {
        lastMaintenanceDate: new Date(),
        nextMaintenanceDate,
        totalMaintenanceCost: r2(e.totalMaintenanceCost + cost),
        status: 'AVAILABLE',
        ...(note && { notes: `${e.notes ? `${e.notes}\n` : ''}${clock.todayKey()}: ${note}` }),
      },
    });
  }

  /** Machine sold or scrapped: hidden from lists, the record stays. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.gymEquipment.update({ where: { id }, data: { isActive: false, status: 'RETIRED' } });
  }

  async summary(user: AuthenticatedUser) {
    const [byCategory, byStatus, needsMaintenance] = await Promise.all([
      this.prisma.gymEquipment.groupBy({
        by: ['category'],
        where: { tenantId: user.tenantId, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.gymEquipment.groupBy({
        by: ['status'],
        where: { tenantId: user.tenantId, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.gymEquipment.count({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          nextMaintenanceDate: { lte: new Date() },
        },
      }),
    ]);
    return { byCategory, byStatus, needsMaintenance };
  }
}

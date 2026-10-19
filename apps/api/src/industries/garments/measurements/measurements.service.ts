/**
 * Customers' body measurements (naap). One customer can keep several
 * profiles (own kameez, shalwar, a child's); one of them is the default
 * that new stitching orders pick up.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { opt, paging } from '../common/garments-common';
import { UpsertMeasurementDto } from './dto/upsert-measurement.dto';

const customerSelect = { id: true, name: true, phone: true } as const;

@Injectable()
export class MeasurementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertMeasurementDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId: user.tenantId }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer nahi mila');
    const profileName = opt(dto.profileName) ?? 'Default';
    const { customerId: _c, profileName: _p, ...fields } = dto;
    const hasOther = await this.prisma.garmentMeasurementProfile.count({ where: { tenantId: user.tenantId, customerId: customer.id, isActive: true } });
    const isDefault = dto.isDefault ?? hasOther === 0;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.garmentMeasurementProfile.updateMany({ where: { tenantId: user.tenantId, customerId: customer.id, isDefault: true }, data: { isDefault: false } });
      }
      const existing = await tx.garmentMeasurementProfile.findFirst({ where: { tenantId: user.tenantId, customerId: customer.id, profileName } });
      if (existing?.isActive) throw new BadRequestException(`Is customer ka "${profileName}" naap pehle se hai — usay badlein ya naya naam dein`);
      // A removed profile with the same name comes back with the new numbers.
      if (existing) {
        return tx.garmentMeasurementProfile.update({
          where: { id: existing.id },
          data: { ...fields, isDefault, isActive: true, measuredById: user.id, measuredAt: new Date() },
        });
      }
      return tx.garmentMeasurementProfile.create({
        data: { tenantId: user.tenantId, customerId: customer.id, measuredById: user.id, ...fields, profileName, isDefault },
      });
    });
  }

  async listByCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.garmentMeasurementProfile.findMany({
      where: { tenantId: user.tenantId, customerId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  /**
   * Profiles with their customer. Search matches the customer's name or
   * phone and the profile name. With `page` the answer is paged
   * ({ items, total, page, pages }); without it, a plain list (older callers).
   */
  async listAll(user: AuthenticatedUser, params: { search?: string; gender?: string; page?: string; limit?: string }) {
    const s = params.search?.trim();
    const where: Prisma.GarmentMeasurementProfileWhereInput = {
      tenantId: user.tenantId,
      isActive: true,
      ...(params.gender && { gender: params.gender as never }),
    };
    if (s) {
      const customers = await this.prisma.customer.findMany({
        where: { tenantId: user.tenantId, OR: [{ name: { contains: s, mode: 'insensitive' } }, { phone: { contains: s } }] },
        select: { id: true }, take: 500,
      });
      where.OR = [{ customerId: { in: customers.map((c) => c.id) } }, { profileName: { contains: s, mode: 'insensitive' } }];
    }
    const paged = params.page !== undefined;
    const { page, limit, skip } = paging({ page: params.page, limit: params.limit ?? (paged ? 30 : 200) }, 200);
    const [rows, total] = await Promise.all([
      this.prisma.garmentMeasurementProfile.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      paged ? this.prisma.garmentMeasurementProfile.count({ where }) : Promise.resolve(0),
    ]);
    const customers = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId, id: { in: [...new Set(rows.map((r) => r.customerId))] } },
      select: customerSelect,
    });
    const byId = new Map(customers.map((c) => [c.id, c]));
    const items = rows.map((r) => ({ ...r, customer: byId.get(r.customerId) ?? null }));
    if (!paged) return items;
    const [people, thisMonth] = await Promise.all([
      this.prisma.garmentMeasurementProfile.groupBy({ by: ['customerId'], where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.garmentMeasurementProfile.count({ where: { tenantId: user.tenantId, isActive: true, measuredAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
    ]);
    return { items, total, page, pages: Math.max(Math.ceil(total / limit), 1), stats: { customers: people.length, recent: thisMonth } };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.garmentMeasurementProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Naap nahi mila');
    const customer = await this.prisma.customer.findFirst({ where: { id: m.customerId, tenantId: user.tenantId }, select: customerSelect });
    return { ...m, customer };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertMeasurementDto) {
    const m = await this.prisma.garmentMeasurementProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Naap nahi mila');
    // A profile stays with its customer; only the numbers and name change.
    const { customerId: _c, profileName, ...fields } = dto;
    const name = opt(profileName);
    if (name && name !== m.profileName) {
      const clash = await this.prisma.garmentMeasurementProfile.findFirst({ where: { tenantId: user.tenantId, customerId: m.customerId, profileName: name, id: { not: id } } });
      if (clash) throw new BadRequestException(`Is customer ka "${name}" naap pehle se hai`);
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.garmentMeasurementProfile.updateMany({
          where: { tenantId: user.tenantId, customerId: m.customerId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.garmentMeasurementProfile.update({
        where: { id },
        data: { ...fields, ...(name && { profileName: name }), measuredById: user.id, measuredAt: new Date() },
      });
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const m = await this.prisma.garmentMeasurementProfile.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!m) throw new NotFoundException('Naap nahi mila');
    return this.prisma.garmentMeasurementProfile.update({ where: { id }, data: { isActive: false, isDefault: false } });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertModifierGroupDto } from './dto/upsert-modifier-group.dto';

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertModifierGroupDto) {
    return this.prisma.modifierGroup.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        type: dto.type ?? 'ADDON',
        isRequired: dto.isRequired ?? false,
        minSelections: dto.minSelections ?? 0,
        maxSelections: dto.maxSelections ?? 1,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
        options: {
          create: dto.options.map((o, idx) => ({
            tenantId: user.tenantId,
            name: o.name,
            priceAdjustment: o.priceAdjustment ?? 0,
            isDefault: o.isDefault ?? false,
            displayOrder: o.displayOrder ?? idx,
            isActive: o.isActive ?? true,
            emoji: o.emoji,
          })),
        },
      },
      include: { options: true },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertModifierGroupDto) {
    const group = await this.prisma.modifierGroup.findFirst({ where: { id, tenantId: user.tenantId }, include: { options: true } });
    if (!group) throw new NotFoundException('Modifier group not found');

    // Options are edited in place: past orders point at them, so an option
    // already used on an order is switched off instead of deleted.
    const keepIds = new Set(dto.options.map((o) => o.id).filter(Boolean) as string[]);
    const dropped = group.options.filter((o) => !keepIds.has(o.id)).map((o) => o.id);

    await this.prisma.$transaction(async (tx) => {
      if (dropped.length) {
        const used = await tx.restaurantOrderItemModifier.findMany({
          where: { modifierOptionId: { in: dropped } }, select: { modifierOptionId: true }, distinct: ['modifierOptionId'],
        });
        const usedIds = used.map((u) => u.modifierOptionId);
        if (usedIds.length) await tx.modifierOption.updateMany({ where: { id: { in: usedIds } }, data: { isActive: false } });
        const free = dropped.filter((d) => !usedIds.includes(d));
        if (free.length) await tx.modifierOption.deleteMany({ where: { id: { in: free } } });
      }
      for (const [idx, o] of dto.options.entries()) {
        const data = {
          name: o.name,
          priceAdjustment: o.priceAdjustment ?? 0,
          isDefault: o.isDefault ?? false,
          displayOrder: o.displayOrder ?? idx,
          isActive: o.isActive ?? true,
          emoji: o.emoji,
        };
        if (o.id && group.options.some((g) => g.id === o.id)) {
          await tx.modifierOption.update({ where: { id: o.id }, data });
        } else {
          await tx.modifierOption.create({ data: { ...data, tenantId: user.tenantId, modifierGroupId: id } });
        }
      }
      await tx.modifierGroup.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          type: dto.type ?? group.type,
          isRequired: dto.isRequired ?? group.isRequired,
          minSelections: dto.minSelections ?? group.minSelections,
          maxSelections: dto.maxSelections ?? group.maxSelections,
          displayOrder: dto.displayOrder ?? group.displayOrder,
          isActive: dto.isActive ?? group.isActive,
        },
      });
    });
    return this.getOne(user, id);
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.modifierGroup.findMany({
      where: { tenantId: user.tenantId },
      include: { options: { orderBy: { displayOrder: 'asc' } }, _count: { select: { menuItems: true } } },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.modifierGroup.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { options: { orderBy: { displayOrder: 'asc' } }, menuItems: { include: { menuItem: { include: { product: true } } } } },
    });
    if (!g) throw new NotFoundException('Modifier group not found');
    return g;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.modifierGroup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Modifier group not found');
    // Used on past orders: switch off instead of deleting the history.
    const used = await this.prisma.restaurantOrderItemModifier.count({ where: { modifierOption: { modifierGroupId: id } } });
    if (used) {
      await this.prisma.menuItemModifier.deleteMany({ where: { modifierGroupId: id } });
      return this.prisma.modifierGroup.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.modifierGroup.delete({ where: { id } });
  }

  async toggleActive(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.modifierGroup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Modifier group not found');
    return this.prisma.modifierGroup.update({ where: { id }, data: { isActive: !g.isActive } });
  }
}

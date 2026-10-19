import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModifierType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { UpsertModifierGroupDto } from './dto/upsert-modifier-group.dto';

@Injectable()
export class ModifiersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rules a cashier relies on: a group has options (a free note has none),
   * option names are unique, the counts make sense, and a required group
   * asks for at least one choice. Returns the counts to save.
   */
  private check(dto: UpsertModifierGroupDto, current?: { type: ModifierType; isRequired: boolean; minSelections: number; maxSelections: number }) {
    const type = dto.type ?? current?.type ?? 'ADDON';
    const live = dto.options.filter((o) => o.isActive !== false);
    if (type !== 'NOTE' && !live.length) throw new BadRequestException('Kam se kam ek option daalein');
    const names = dto.options.map((o) => o.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) throw new BadRequestException('Do option ka naam ek jaisa hai');
    const isRequired = dto.isRequired ?? current?.isRequired ?? false;
    let min = dto.minSelections ?? current?.minSelections ?? 0;
    const max = dto.maxSelections ?? current?.maxSelections ?? 1;
    if (isRequired && min < 1) min = 1;
    if (min > max) throw new BadRequestException('Kam se kam chunne wale, zyada se zyada se barh nahi sakte');
    if (type !== 'NOTE' && min > live.length) throw new BadRequestException(`Sirf ${live.length} option hain — kam se kam ${min} nahi chune ja sakte`);
    // A size or spice choice is one of many; extra cheese and raita can be several.
    if ((type === 'VARIATION' || type === 'SPICE_LEVEL') && max > 1) throw new BadRequestException('Size ya teekhapan me ek hi chuna jata hai — "zyada se zyada" 1 rakhein');
    if (dto.options.filter((o) => o.isDefault && o.isActive !== false).length > max) throw new BadRequestException('Pehle se chune hue option zyada se zyada se barh gaye');
    return { type, isRequired, minSelections: min, maxSelections: max };
  }

  async create(user: AuthenticatedUser, dto: UpsertModifierGroupDto) {
    const rules = this.check(dto);
    return this.prisma.modifierGroup.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        ...rules,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
        options: {
          create: dto.options.map((o, idx) => ({
            tenantId: user.tenantId,
            name: o.name.trim(),
            priceAdjustment: o.priceAdjustment ?? 0,
            isDefault: o.isDefault ?? false,
            displayOrder: o.displayOrder ?? idx,
            isActive: o.isActive ?? true,
            emoji: o.emoji || null,
          })),
        },
      },
      include: { options: true },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertModifierGroupDto) {
    const group = await this.prisma.modifierGroup.findFirst({ where: { id, tenantId: user.tenantId }, include: { options: true } });
    if (!group) throw new NotFoundException('Add-on group nahi mila');
    const rules = this.check(dto, group);

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
          name: o.name.trim(),
          priceAdjustment: o.priceAdjustment ?? 0,
          isDefault: o.isDefault ?? false,
          displayOrder: o.displayOrder ?? idx,
          isActive: o.isActive ?? true,
          emoji: o.emoji || null,
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
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          ...rules,
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
      include: { options: { orderBy: { displayOrder: 'asc' } }, _count: { select: { menuItems: true } }, menuItems: { select: { menuItemId: true } } },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.modifierGroup.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { options: { orderBy: { displayOrder: 'asc' } }, menuItems: { include: { menuItem: { include: { product: true } } } } },
    });
    if (!g) throw new NotFoundException('Add-on group nahi mila');
    return g;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.modifierGroup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Add-on group nahi mila');
    // Used on past orders: switch off instead of deleting the history.
    const used = await this.prisma.restaurantOrderItemModifier.count({ where: { modifierOption: { modifierGroupId: id } } });
    if (used) {
      await this.prisma.menuItemModifier.deleteMany({ where: { modifierGroupId: id } });
      return this.prisma.modifierGroup.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.modifierGroup.delete({ where: { id } });
  }

  /**
   * Puts this group on exactly the given dishes: added where missing, taken
   * off the dishes left out. Other groups on those dishes stay as they are.
   */
  async assignDishes(user: AuthenticatedUser, id: string, menuItemIds: string[]) {
    const g = await this.prisma.modifierGroup.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!g) throw new NotFoundException('Add-on group nahi mila');
    const ids = [...new Set(menuItemIds)];
    const items = await this.prisma.restaurantMenuItem.findMany({ where: { id: { in: ids }, tenantId: user.tenantId }, select: { id: true } });
    if (items.length !== ids.length) throw new NotFoundException('Ek ya zyada dish nahi mili');
    const current = await this.prisma.menuItemModifier.findMany({ where: { modifierGroupId: id }, select: { menuItemId: true } });
    const had = new Set(current.map((c) => c.menuItemId));
    const want = new Set(ids);
    await this.prisma.$transaction([
      this.prisma.menuItemModifier.deleteMany({ where: { modifierGroupId: id, menuItemId: { notIn: ids } } }),
      this.prisma.menuItemModifier.createMany({
        data: ids.filter((m) => !had.has(m)).map((menuItemId) => ({ menuItemId, modifierGroupId: id, displayOrder: 99 })),
        skipDuplicates: true,
      }),
    ]);
    return { added: ids.filter((m) => !had.has(m)).length, removed: [...had].filter((m) => !want.has(m)).length };
  }

  async toggleActive(user: AuthenticatedUser, id: string) {
    const g = await this.prisma.modifierGroup.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!g) throw new NotFoundException('Add-on group nahi mila');
    return this.prisma.modifierGroup.update({ where: { id }, data: { isActive: !g.isActive } });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertMenuItemDto } from './dto/upsert-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(user: AuthenticatedUser, dto: UpsertMenuItemDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.restaurantMenuItem.findUnique({
      where: { productId: dto.productId },
    });

    if (existing) {
      return this.prisma.restaurantMenuItem.update({
        where: { productId: dto.productId },
        data: { ...dto, tenantId: user.tenantId },
        include: { modifiers: { include: { modifierGroup: { include: { options: true } } } }, recipe: { include: { ingredients: true } } },
      });
    }
    return this.prisma.restaurantMenuItem.create({
      data: { ...dto, tenantId: user.tenantId },
      include: { modifiers: { include: { modifierGroup: { include: { options: true } } } }, recipe: { include: { ingredients: true } } },
    });
  }

  async list(user: AuthenticatedUser, params: { available?: boolean; bestSeller?: boolean; chefSpecial?: boolean; search?: string }) {
    return this.prisma.restaurantMenuItem.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.available !== undefined && { isAvailable: params.available }),
        ...(params.bestSeller !== undefined && { bestSeller: params.bestSeller }),
        ...(params.chefSpecial !== undefined && { chefSpecial: params.chefSpecial }),
        ...(params.search && { product: { name: { contains: params.search, mode: 'insensitive' } } }),
      },
      include: {
        product: { include: { category: true, images: true } },
        modifiers: { include: { modifierGroup: { include: { options: true } } } },
        recipe: { include: { ingredients: { include: { ingredient: true } } } },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const item = await this.prisma.restaurantMenuItem.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: { include: { category: true, brand: true, images: true, variants: true } },
        modifiers: { include: { modifierGroup: { include: { options: true } } } },
        recipe: { include: { ingredients: { include: { ingredient: true } } } },
      },
    });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async attachModifiers(user: AuthenticatedUser, id: string, modifierGroupIds: string[]) {
    const item = await this.prisma.restaurantMenuItem.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!item) throw new NotFoundException('Menu item not found');

    await this.prisma.menuItemModifier.deleteMany({ where: { menuItemId: id } });
    await this.prisma.menuItemModifier.createMany({
      data: modifierGroupIds.map((gId, idx) => ({ menuItemId: id, modifierGroupId: gId, displayOrder: idx })),
    });
    return this.getOne(user, id);
  }

  async remove(user: AuthenticatedUser, id: string) {
    const item = await this.prisma.restaurantMenuItem.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!item) throw new NotFoundException('Menu item not found');
    return this.prisma.restaurantMenuItem.delete({ where: { id } });
  }

  async toggleAvailable(user: AuthenticatedUser, id: string) {
    const item = await this.prisma.restaurantMenuItem.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!item) throw new NotFoundException('Menu item not found');
    return this.prisma.restaurantMenuItem.update({ where: { id }, data: { isAvailable: !item.isAvailable } });
  }
}

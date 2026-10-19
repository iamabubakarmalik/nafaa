import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { UpsertMenuItemDto } from './dto/upsert-menu-item.dto';
import { servedAt } from './time-window';

const ITEM_INCLUDE = {
  modifiers: { include: { modifierGroup: { include: { options: true } } }, orderBy: { displayOrder: 'asc' } },
  recipe: { include: { ingredients: { include: { ingredient: true } } } },
} satisfies Prisma.RestaurantMenuItemInclude;

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService, private readonly clock: TenantTimezoneService) {}

  /** Empty strings clear a field; numbers and lists pass through. */
  private profileData(dto: UpsertMenuItemDto) {
    const { productId: _productId, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    for (const k of ['availableFrom', 'availableTo', 'cookingInstructions', 'servingSize', 'allergenInfo', 'imageUrl', 'videoUrl', 'highlightColor', 'tagLine'] as const) {
      if (data[k] === '') data[k] = null;
    }
    if (dto.isSpicy === false) data.spiceLevel = null;
    return data as Prisma.RestaurantMenuItemUncheckedUpdateInput;
  }

  async upsert(user: AuthenticatedUser, dto: UpsertMenuItemDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId },
      select: { id: true, isRawMaterial: true },
    });
    if (!product) throw new NotFoundException('Product nahi mila');
    if (product.isRawMaterial) throw new BadRequestException('Raw material menu par nahi aata — pehle product se "Raw material" hatayein');
    if (dto.availableFrom && dto.availableTo && dto.availableFrom === dto.availableTo) {
      throw new BadRequestException('Shuru aur khatam ka waqt ek jaisa nahi ho sakta');
    }

    const data = this.profileData(dto);
    return this.prisma.restaurantMenuItem.upsert({
      where: { productId: dto.productId },
      update: data,
      create: { ...(data as Prisma.RestaurantMenuItemUncheckedCreateInput), productId: dto.productId, tenantId: user.tenantId },
      include: ITEM_INCLUDE,
    });
  }

  /**
   * Menu items with their dish. `available` keeps only dishes on the menu
   * whose product is switched on. Each item carries `servingNow` for its
   * serving hours in shop time; `serving` keeps only those.
   */
  async list(user: AuthenticatedUser, params: { available?: boolean; bestSeller?: boolean; chefSpecial?: boolean; search?: string; serving?: boolean }) {
    const items = await this.prisma.restaurantMenuItem.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.available !== undefined && { isAvailable: params.available }),
        ...(params.available === true && { product: { isActive: true } }),
        ...(params.bestSeller !== undefined && { bestSeller: params.bestSeller }),
        ...(params.chefSpecial !== undefined && { chefSpecial: params.chefSpecial }),
        ...(params.search && {
          product: {
            ...(params.available === true && { isActive: true }),
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
            ],
          },
        }),
      },
      include: {
        product: { include: { category: true, images: { orderBy: { sortOrder: 'asc' } } } },
        ...ITEM_INCLUDE,
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });
    const { tz } = await this.clock.clock(user.tenantId);
    const now = new Date();
    const rows = items.map((i) => ({ ...i, servingNow: servedAt(i, now, tz) }));
    return params.serving ? rows.filter((r) => r.servingNow) : rows;
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const item = await this.prisma.restaurantMenuItem.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        product: { include: { category: true, brand: true, images: true, variants: true } },
        ...ITEM_INCLUDE,
      },
    });
    if (!item) throw new NotFoundException('Menu item nahi mila');
    return item;
  }

  /** The menu profile of a product, or null when it has none. */
  async byProduct(user: AuthenticatedUser, productId: string) {
    return this.prisma.restaurantMenuItem.findFirst({
      where: { productId, tenantId: user.tenantId },
      include: ITEM_INCLUDE,
    });
  }

  async attachModifiers(user: AuthenticatedUser, id: string, modifierGroupIds: string[]) {
    const item = await this.prisma.restaurantMenuItem.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!item) throw new NotFoundException('Menu item nahi mila');
    const ids = [...new Set(modifierGroupIds)];
    const found = ids.length
      ? await this.prisma.modifierGroup.count({ where: { id: { in: ids }, tenantId: user.tenantId } })
      : 0;
    if (found !== ids.length) throw new NotFoundException('Ek ya zyada add-on group nahi mila');

    await this.prisma.$transaction([
      this.prisma.menuItemModifier.deleteMany({ where: { menuItemId: id } }),
      this.prisma.menuItemModifier.createMany({
        data: ids.map((gId, idx) => ({ menuItemId: id, modifierGroupId: gId, displayOrder: idx })),
      }),
    ]);
    return this.getOne(user, id);
  }

  /**
   * Takes the dish off the menu. The profile, its recipe and add-ons stay,
   * so past orders and food-cost history keep their links.
   */
  async remove(user: AuthenticatedUser, id: string) {
    const item = await this.prisma.restaurantMenuItem.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!item) throw new NotFoundException('Menu item nahi mila');
    return this.prisma.restaurantMenuItem.update({ where: { id }, data: { isAvailable: false } });
  }

  async toggleAvailable(user: AuthenticatedUser, id: string) {
    const item = await this.prisma.restaurantMenuItem.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!item) throw new NotFoundException('Menu item nahi mila');
    return this.prisma.restaurantMenuItem.update({ where: { id }, data: { isAvailable: !item.isAvailable } });
  }

  /** Sets "on the menu" to a given value, so two people pressing at once agree. */
  async setAvailable(user: AuthenticatedUser, id: string, available: boolean) {
    const res = await this.prisma.restaurantMenuItem.updateMany({ where: { id, tenantId: user.tenantId }, data: { isAvailable: available } });
    if (!res.count) throw new NotFoundException('Menu item nahi mila');
    return this.prisma.restaurantMenuItem.findUniqueOrThrow({ where: { id } });
  }

  async setAvailableMany(user: AuthenticatedUser, menuItemIds: string[], available: boolean) {
    const res = await this.prisma.restaurantMenuItem.updateMany({
      where: { id: { in: [...new Set(menuItemIds)] }, tenantId: user.tenantId },
      data: { isAvailable: available },
    });
    return { updated: res.count };
  }

  /**
   * Gives products a menu profile so the restaurant POS lists them (cold
   * drinks, water and other items added from the products page or import).
   * Raw materials and products that already have one are skipped.
   */
  async addToMenu(user: AuthenticatedUser, productIds: string[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(productIds)] }, tenantId: user.tenantId, isRawMaterial: false, menuItem: { is: null } },
      select: { id: true },
    });
    if (!products.length) return { added: 0 };
    const res = await this.prisma.restaurantMenuItem.createMany({
      data: products.map((p) => ({ tenantId: user.tenantId, productId: p.id })),
      skipDuplicates: true,
    });
    return { added: res.count };
  }
}

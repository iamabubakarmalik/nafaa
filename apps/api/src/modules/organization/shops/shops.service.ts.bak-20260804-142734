import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashPassword } from '../../../common/utils/password.util';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateShopDto } from './dto/create-shop.dto';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../common/constants/permissions.constants';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * LIST — Owner sees all, Manager/Cashier sees only their assigned shop
   */
  async list(user: AuthenticatedUser) {
    const where: any = { tenantId: user.tenantId };

    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN && user.shopId) {
      where.id = user.shopId;
    }

    return this.prisma.shop.findMany({
      where,
      orderBy: [{ isMain: 'desc' }, { type: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { users: true, sales: true, shopStocks: true, cashRegisters: true },
        },
      },
    });
  }

  /**
   * CREATE — Owner only. Auto-backfills ShopStock for existing products.
   * Optionally creates Manager user atomically.
   */
  async create(user: AuthenticatedUser, dto: CreateShopDto) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sirf Owner shop create kar sakta hai');
    }

    const exists = await this.prisma.shop.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (exists) throw new ConflictException('Shop with this name already exists');

    // Validate manager data
    if (dto.managerEmail) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.managerEmail.toLowerCase() },
      });
      if (emailTaken) throw new ConflictException('Manager email already registered');

      if (!dto.managerName || !dto.managerPassword) {
        throw new BadRequestException('Manager ka name aur password zaroori hai');
      }
    }

    // Unset previous main if new one is main
    if (dto.isMain) {
      await this.prisma.shop.updateMany({
        where: { tenantId: user.tenantId, isMain: true },
        data: { isMain: false },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Shop
      const shop = await tx.shop.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name,
          address: dto.address,
          phone: dto.phone,
          isMain: dto.isMain ?? false,
          type: dto.type ?? 'SHOP',
        },
      });

      // 2. Backfill ShopStock for existing products
      const products = await tx.product.findMany({
        where: { tenantId: user.tenantId },
        select: { id: true, stock: true },
      });

      if (products.length > 0) {
        await tx.shopStock.createMany({
          data: products.map((p) => ({
            tenantId: user.tenantId,
            shopId: shop.id,
            productId: p.id,
            variantId: null,
            stock: 0, // New shop starts empty — use transfers to fill
            isActive: true,
          })),
          skipDuplicates: true,
        });
      }

      // 3. Create default CLOSED cash register (SHOP type only)
      if ((dto.type ?? 'SHOP') === 'SHOP') {
        const registerNumber = `CR-${shop.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
        await tx.cashRegister.create({
          data: {
            tenantId: user.tenantId,
            shopId: shop.id,
            openedById: user.id,
            registerNumber,
            status: 'CLOSED',
            openingBalance: 0,
            expectedBalance: 0,
          },
        });
      }

      // 4. Create Manager if data provided
      let manager: any = null;
      if (dto.managerEmail && dto.managerName && dto.managerPassword) {
        const passwordHash = await hashPassword(dto.managerPassword);

        manager = await tx.user.create({
          data: {
            tenantId: user.tenantId,
            shopId: shop.id,
            fullName: dto.managerName,
            email: dto.managerEmail.toLowerCase(),
            phone: dto.managerPhone,
            passwordHash,
            role: UserRole.MANAGER,
            permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.MANAGER] ?? [],
            isActive: true,
            emailVerified: false,
          },
          select: {
            id: true, fullName: true, email: true, role: true, shopId: true,
          },
        });

        await tx.activityLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'CREATE',
            entityType: 'Shop',
            entityId: shop.id,
            description: `${user.email} created shop "${shop.name}" with manager ${manager.fullName}`,
            metadata: {
              shopType: shop.type,
              managerId: manager.id,
              productsBackfilled: products.length,
            },
          },
        });
      } else {
        await tx.activityLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'CREATE',
            entityType: 'Shop',
            entityId: shop.id,
            description: `${user.email} created shop "${shop.name}"`,
            metadata: {
              shopType: shop.type,
              productsBackfilled: products.length,
            },
          },
        });
      }

      return { ...shop, manager, productsBackfilled: products.length };
    });
  }

  /**
   * GET ONE
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true, fullName: true, email: true, role: true,
            phone: true, lastLoginAt: true, avatarUrl: true,
          },
        },
        _count: {
          select: {
            sales: true,
            shopStocks: true,
            cashRegisters: true,
            users: true,
          },
        },
      },
    });

    if (!shop) throw new NotFoundException('Shop not found');

    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN && user.shopId !== id) {
      throw new ForbiddenException('Aap is shop ko access nahi kar sakte');
    }

    return shop;
  }

  /**
   * UPDATE
   */
  async update(user: AuthenticatedUser, id: string, dto: any) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sirf Owner shop edit kar sakta hai');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    if (dto.name && dto.name !== shop.name) {
      const exists = await this.prisma.shop.findFirst({
        where: { tenantId: user.tenantId, name: dto.name, id: { not: id } },
      });
      if (exists) throw new ConflictException('Shop with this name already exists');
    }

    if (dto.isMain === true && !shop.isMain) {
      await this.prisma.shop.updateMany({
        where: { tenantId: user.tenantId, isMain: true },
        data: { isMain: false },
      });
    }

    const updated = await this.prisma.shop.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.isMain !== undefined && { isMain: dto.isMain }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'Shop',
        entityId: id,
        description: `${user.email} updated shop "${updated.name}"`,
      },
    });

    return updated;
  }

  /**
   * TOGGLE ACTIVE
   */
  async toggleActive(user: AuthenticatedUser, id: string) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sirf Owner shop toggle kar sakta hai');
    }
    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    // Cannot deactivate the only active main shop
    if (shop.isMain && shop.isActive) {
      const otherActiveShops = await this.prisma.shop.count({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          id: { not: id },
          type: 'SHOP',
        },
      });
      if (otherActiveShops === 0) {
        throw new BadRequestException(
          'Ye aap ki akhri active shop hai. Pehle nayi shop banayein.',
        );
      }
    }

    return this.prisma.shop.update({
      where: { id },
      data: { isActive: !shop.isActive },
    });
  }

  /**
   * DELETE — with safety checks + better error message
   */
  async remove(user: AuthenticatedUser, id: string) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sirf Owner shop delete kar sakta hai');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        _count: {
          select: { sales: true, users: true, shopStocks: true, cashRegisters: true },
        },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    // Cannot delete main shop if it has sales
    if (shop.isMain) {
      throw new BadRequestException({
        message: 'Main shop delete nahi kar sakte. Pehle kisi doosri shop ko Main banayein.',
        code: 'MAIN_SHOP_PROTECTED',
        suggestion: 'DEACTIVATE_OR_SET_ANOTHER_AS_MAIN',
      });
    }

    // Safety: block delete if sales exist
    if (shop._count.sales > 0) {
      throw new BadRequestException({
        message: `${shop.name} mein ${shop._count.sales} sales hain. Delete nahi kar sakte.`,
        code: 'HAS_SALES_HISTORY',
        suggestion: 'DEACTIVATE',
        stats: {
          sales: shop._count.sales,
          users: shop._count.users,
          products: shop._count.shopStocks,
          registers: shop._count.cashRegisters,
        },
      });
    }

    // Safety: check for pending transfers
    const pendingTransfers = await this.prisma.stockTransfer.count({
      where: {
        tenantId: user.tenantId,
        status: { in: ['PENDING', 'IN_TRANSIT'] },
        OR: [{ fromShopId: id }, { toShopId: id }],
      },
    });

    if (pendingTransfers > 0) {
      throw new BadRequestException({
        message: `${shop.name} mein ${pendingTransfers} pending transfers hain. Pehle unko complete karein.`,
        code: 'HAS_PENDING_TRANSFERS',
        suggestion: 'COMPLETE_TRANSFERS_FIRST',
      });
    }

    // Safety: check for open cash register
    const openRegister = await this.prisma.cashRegister.findFirst({
      where: { shopId: id, status: 'OPEN' },
    });

    if (openRegister) {
      throw new BadRequestException({
        message: `${shop.name} mein cash register OPEN hai. Pehle close karein.`,
        code: 'HAS_OPEN_REGISTER',
        suggestion: 'CLOSE_REGISTER_FIRST',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      // Unlink users
      await tx.user.updateMany({
        where: { shopId: id },
        data: { shopId: null },
      });

      // Delete shop stocks
      await tx.shopStock.deleteMany({ where: { shopId: id } });

      // Delete cash registers (already closed)
      await tx.cashRegister.deleteMany({ where: { shopId: id } });

      // Delete the shop
      await tx.shop.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'DELETE',
          entityType: 'Shop',
          entityId: id,
          description: `${user.email} deleted shop "${shop.name}"`,
        },
      });
    });

    return { message: 'Shop deleted successfully' };
  }

  /**
   * OVERVIEW — Owner sees stats across all shops
   */
  async overview(user: AuthenticatedUser) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sirf Owner overview dekh sakta hai');
    }

    const shops = await this.prisma.shop.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      include: {
        _count: {
          select: { users: true, sales: true, shopStocks: true },
        },
      },
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = await Promise.all(
      shops.map(async (shop) => {
        const [todayAgg, monthAgg, lowStockCount, openRegister, totalStock] = await Promise.all([
          this.prisma.sale.aggregate({
            where: {
              tenantId: user.tenantId,
              shopId: shop.id,
              status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
              soldAt: { gte: today },
            },
            _sum: { total: true, costOfGoods: true, paidAmount: true, creditAmount: true },
            _count: { _all: true },
          }),
          this.prisma.sale.aggregate({
            where: {
              tenantId: user.tenantId,
              shopId: shop.id,
              status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
              soldAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
            },
            _sum: { total: true, costOfGoods: true },
          }),
          this.prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint as count
            FROM "ShopStock"
            WHERE "shopId" = ${shop.id}
              AND "isActive" = true
              AND stock <= "lowStockAlert"
          `.then((r) => Number(r[0]?.count ?? 0)).catch(() => 0),
          this.prisma.cashRegister.findFirst({
            where: { shopId: shop.id, status: 'OPEN' },
            select: { id: true, expectedBalance: true, openedAt: true, openingBalance: true },
          }),
          this.prisma.shopStock.aggregate({
            where: { shopId: shop.id, isActive: true },
            _sum: { stock: true },
          }),
        ]);

        const todaySales = todayAgg._sum.total ?? 0;
        const todayCogs = todayAgg._sum.costOfGoods ?? 0;
        const monthSales = monthAgg._sum.total ?? 0;
        const monthCogs = monthAgg._sum.costOfGoods ?? 0;

        return {
          ...shop,
          todaySales,
          todayProfit: todaySales - todayCogs,
          todayOrders: todayAgg._count._all ?? 0,
          todayPaid: todayAgg._sum.paidAmount ?? 0,
          todayCredit: todayAgg._sum.creditAmount ?? 0,
          monthSales,
          monthProfit: monthSales - monthCogs,
          lowStockCount,
          totalStock: totalStock._sum.stock ?? 0,
          registerOpen: !!openRegister,
          registerBalance: openRegister?.expectedBalance ?? 0,
          registerOpening: openRegister?.openingBalance ?? 0,
          registerOpenedAt: openRegister?.openedAt ?? null,
        };
      }),
    );

    return enriched;
  }
}

import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashPassword } from '../../common/utils/password.util';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateShopDto } from './dto/create-shop.dto';
import { DEFAULT_ROLE_PERMISSIONS } from '../../common/constants/permissions.constants';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List shops — Owner sees all, Manager/Cashier sees only their assigned shop
   */
  async list(user: AuthenticatedUser) {
    const where: any = { tenantId: user.tenantId };

    // Non-owners see only their assigned shop
    if (user.role !== UserRole.OWNER && (user as any).shopId) {
      where.id = (user as any).shopId;
    }

    return this.prisma.shop.findMany({
      where,
      orderBy: [{ isMain: 'desc' }, { type: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { users: true, sales: true, shopStocks: true },
        },
      },
    });
  }

  /**
   * Create shop — Owner only. Optionally creates Manager user atomically.
   */
  async create(user: AuthenticatedUser, dto: CreateShopDto) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Sirf Owner shop create kar sakta hai');
    }

    const exists = await this.prisma.shop.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (exists) throw new ConflictException('Shop with this name already exists');

    // If creating manager, validate email upfront
    if (dto.managerEmail) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.managerEmail.toLowerCase() },
      });
      if (emailTaken) throw new ConflictException('Manager email already registered');

      if (!dto.managerName || !dto.managerPassword) {
        throw new BadRequestException('Manager ka name aur password zaroori hai');
      }
    }

    // Unset previous main shop if this is set as main
    if (dto.isMain) {
      await this.prisma.shop.updateMany({
        where: { tenantId: user.tenantId, isMain: true },
        data: { isMain: false },
      });
    }

    return this.prisma.$transaction(async (tx) => {
      // Create shop
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

      let manager: any = null;

      // Create manager user if data provided
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
            id: true, fullName: true, email: true, role: true,
          },
        });

        // Activity log
        await tx.activityLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'CREATE',
            entityType: 'Shop',
            entityId: shop.id,
            description: `${user.email} created shop "${shop.name}" with manager ${manager.fullName}`,
            metadata: { shopType: shop.type, managerId: manager.id },
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
            metadata: { shopType: shop.type },
          },
        });
      }

      return { ...shop, manager };
    });
  }

  /**
   * Get single shop — Owner or assigned user
   */
  async findOne(user: AuthenticatedUser, id: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true, fullName: true, email: true, role: true,
            phone: true, lastLoginAt: true,
          },
        },
        _count: {
          select: { sales: true, shopStocks: true, cashRegisters: true },
        },
      },
    });

    if (!shop) throw new NotFoundException('Shop not found');

    // Non-owner can only see their own shop
    if (user.role !== UserRole.OWNER && (user as any).shopId !== id) {
      throw new ForbiddenException('Aap is shop ko access nahi kar sakte');
    }

    return shop;
  }

  /**
   * Update shop — Owner only
   */
  async update(user: AuthenticatedUser, id: string, dto: any) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Sirf Owner shop edit kar sakta hai');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    // If renaming, check for duplicate
    if (dto.name && dto.name !== shop.name) {
      const exists = await this.prisma.shop.findFirst({
        where: { tenantId: user.tenantId, name: dto.name, id: { not: id } },
      });
      if (exists) throw new ConflictException('Shop with this name already exists');
    }

    // If setting as main, unset previous
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
   * Toggle shop active status
   */
  async toggleActive(user: AuthenticatedUser, id: string) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Sirf Owner shop toggle kar sakta hai');
    }
    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    return this.prisma.shop.update({
      where: { id },
      data: { isActive: !shop.isActive },
    });
  }

    /**
   * Delete shop — Owner only, with safety checks
   */
  async remove(user: AuthenticatedUser, id: string) {
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException('Sirf Owner shop delete kar sakta hai');
    }

    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        _count: { select: { sales: true, users: true, shopStocks: true } },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    // Safety: don't allow delete if shop has sales
    if (shop._count.sales > 0) {
      throw new BadRequestException(
        `${shop.name} mein ${shop._count.sales} sales hain. Delete nahi kar sakte. Deactivate karein.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Unlink users from this shop (don't delete users)
      await tx.user.updateMany({
        where: { shopId: id },
        data: { shopId: null },
      });

      // Delete shop stock entries
      await tx.shopStock.deleteMany({ where: { shopId: id } });

      // Delete shop
      await tx.shop.delete({ where: { id } });

      // Log
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
   * Get stats overview for owner — sales/stock across all shops
   */
  async overview(user: AuthenticatedUser) {
    if (user.role !== UserRole.OWNER) {
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

    // Today's sales per shop
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = await Promise.all(
      shops.map(async (shop) => {
        const [todayAgg, lowStockCount, openRegister] = await Promise.all([
          this.prisma.sale.aggregate({
            where: {
              tenantId: user.tenantId,
              shopId: shop.id,
              status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
              soldAt: { gte: today },
            },
            _sum: { total: true, costOfGoods: true },
            _count: { _all: true },
          }),
          this.prisma.shopStock.count({
            where: {
              shopId: shop.id,
              isActive: true,
              stock: { lte: this.prisma.shopStock.fields.lowStockAlert },
            },
          }).catch(() => 0),
          this.prisma.cashRegister.findFirst({
            where: { shopId: shop.id, status: 'OPEN' },
            select: { id: true, expectedBalance: true, openedAt: true },
          }),
        ]);

        return {
          ...shop,
          todaySales: todayAgg._sum.total ?? 0,
          todayProfit: (todayAgg._sum.total ?? 0) - (todayAgg._sum.costOfGoods ?? 0),
          todayOrders: todayAgg._count._all ?? 0,
          lowStockCount,
          registerOpen: !!openRegister,
          registerBalance: openRegister?.expectedBalance ?? 0,
        };
      }),
    );

    return enriched;
  }
}

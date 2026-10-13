/**
 * Branches (shops, warehouses, godowns): list, create with an optional
 * manager login, edit, switch on/off and delete. Branch figures live in
 * ShopsAnalyticsService.
 *
 * Writes need `shops.manage`; giving a new branch a manager login also needs
 * `team.manage`. Staff tied to one branch only see that branch.
 */

import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashPassword } from '../../../common/utils/password.util';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, hasPermission, type PermissionKey } from '../../../common/constants/permissions.constants';

const isUniqueClash = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private need(user: AuthenticatedUser, key: PermissionKey, label: string) {
    if (!hasPermission(user.role, user.permissions, key)) {
      throw new ForbiddenException(`Is kaam ke liye "${label}" ki permission chahiye`);
    }
  }
  /**
   * Make sure an owner always has a branch to work in.
   *
   * Signup creates the main shop automatically, but accounts exist that slipped
   * through: tenants with no shop at all, and owners whose `shopId` was never
   * set (or was cleared when a shop got deleted). Those accounts would see an
   * empty switcher and a POS that refuses to sell, with no way out except
   * knowing to visit /shops.
   *
   * Healing it here — the switcher calls this on every page load — costs one
   * extra query for accounts that are already fine and silently repairs the
   * rest. Idempotent by construction: it only acts when something is missing.
   */
  private async ensureOwnerHasShop(user: AuthenticatedUser): Promise<void> {
    // Only a tenant's own owner. SUPER_ADMIN is platform staff and may be
    // looking at a tenant that legitimately has no shops.
    if (user.role !== UserRole.OWNER) return;

    const existing = await this.prisma.shop.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
      select: { id: true, isActive: true },
    });

    if (!existing) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true },
      });

      const shop = await this.prisma.shop.create({
        data: {
          tenantId: user.tenantId,
          name: tenant?.name?.trim() || 'Main Shop',
          isMain: true,
          isActive: true,
          type: 'SHOP',
          // Every shop starts with a safe account on the Shop accounts page.
          moneyAccounts: { create: { tenantId: user.tenantId, name: 'Tijori (cash)', kind: 'CASH' } },
        },
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { shopId: shop.id },
      });

      await this.prisma.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: 'CREATE',
          entityType: 'Shop',
          entityId: shop.id,
          description: `Main shop "${shop.name}" auto-created — account had none`,
          metadata: { autoHealed: true },
        },
      });

      this.logger.warn(
        `Tenant ${user.tenantId} had no shop — created main shop ${shop.id}`,
      );
      return;
    }

    // Shop exists but this owner is not attached to one — attach them so the
    // switcher, POS and cash register all have a default to fall back on.
    if (!user.shopId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { shopId: existing.id },
      });
      this.logger.warn(
        `Owner ${user.id} had no shopId — assigned to shop ${existing.id}`,
      );
    }
  }

  /**
   * LIST — Owner sees all, Manager/Cashier sees only their assigned shop
   */
  async list(user: AuthenticatedUser) {
    await this.ensureOwnerHasShop(user);

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
   * CREATE — every existing product gets a zero stock row in the new branch,
   * a shop gets a closed drawer, and a manager login is made when asked. The
   * main-branch switch happens in the same transaction.
   */
  async create(user: AuthenticatedUser, dto: CreateShopDto) {
    this.need(user, PERMISSIONS.SHOPS_MANAGE, 'Branches sambhalna');
    const name = dto.name.trim();
    const withManager = !!(dto.managerEmail || dto.managerName || dto.managerPassword);
    if (withManager) {
      this.need(user, PERMISSIONS.TEAM_MANAGE, 'Team sambhalna');
      if (!dto.managerEmail || !dto.managerName || !dto.managerPassword) {
        throw new BadRequestException('Manager ka naam, email aur password teeno zaroori hain');
      }
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.managerEmail.toLowerCase() }, select: { id: true } });
      if (emailTaken) throw new ConflictException('Yeh email pehle se kisi login par hai');
    }

    const exists = await this.prisma.shop.findFirst({ where: { tenantId: user.tenantId, name }, select: { id: true } });
    if (exists) throw new ConflictException('Is naam ki branch pehle se hai');

    const type = dto.type ?? 'SHOP';
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isMain) {
          await tx.shop.updateMany({ where: { tenantId: user.tenantId, isMain: true }, data: { isMain: false } });
        }

        const shop = await tx.shop.create({
          data: {
            tenantId: user.tenantId,
            name,
            address: dto.address?.trim() || null,
            phone: dto.phone?.trim() || null,
            isMain: dto.isMain ?? false,
            type,
            // Every shop starts with a safe account on the Shop accounts page.
            moneyAccounts: { create: { tenantId: user.tenantId, name: 'Tijori (cash)', kind: 'CASH' } },
          },
        });

        // New branch starts empty; stock arrives through transfers or purchases.
        const products = await tx.product.findMany({ where: { tenantId: user.tenantId }, select: { id: true } });
        if (products.length > 0) {
          await tx.shopStock.createMany({
            data: products.map((p) => ({ tenantId: user.tenantId, shopId: shop.id, productId: p.id, variantId: null, stock: 0, isActive: true })),
            skipDuplicates: true,
          });
        }

        if (type === 'SHOP') {
          await tx.cashRegister.create({
            data: {
              tenantId: user.tenantId,
              shopId: shop.id,
              openedById: user.id,
              registerNumber: `CR-${shop.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
              status: 'CLOSED',
              openingBalance: 0,
              expectedBalance: 0,
            },
          });
        }

        let manager: { id: string; fullName: string; email: string; role: UserRole; shopId: string | null } | null = null;
        if (withManager) {
          manager = await tx.user.create({
            data: {
              tenantId: user.tenantId,
              shopId: shop.id,
              fullName: dto.managerName!.trim(),
              email: dto.managerEmail!.toLowerCase(),
              phone: dto.managerPhone?.trim() || null,
              passwordHash: await hashPassword(dto.managerPassword!),
              role: UserRole.MANAGER,
              permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.MANAGER] ?? [],
              isActive: true,
              emailVerified: false,
            },
            select: { id: true, fullName: true, email: true, role: true, shopId: true },
          });
        }

        await tx.activityLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'CREATE',
            entityType: 'Shop',
            entityId: shop.id,
            description: manager ? `Branch "${shop.name}" banayi, manager ${manager.fullName} ke saath` : `Branch "${shop.name}" banayi`,
            metadata: { shopType: shop.type, shopName: shop.name, productsBackfilled: products.length, ...(manager && { managerId: manager.id, managerName: manager.fullName }) },
          },
        });

        return { ...shop, manager, productsBackfilled: products.length };
      });
    } catch (e) {
      if (isUniqueClash(e)) throw new ConflictException('Is naam ki branch ya yeh email pehle se hai');
      throw e;
    }
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


  /** A branch cannot be switched off while it is the last working shop. */
  private async assertCanSwitchOff(tenantId: string, shop: { id: string; isMain: boolean; type: string }) {
    const others = await this.prisma.shop.count({ where: { tenantId, isActive: true, type: 'SHOP', id: { not: shop.id } } });
    if (shop.type === 'SHOP' && others === 0) {
      throw new BadRequestException('Yeh aap ki aakhri chalu dukaan hai. Pehle nayi branch banayein.');
    }
    if (shop.isMain) {
      throw new BadRequestException('Main branch band nahi ho sakti. Pehle kisi aur branch ko main banayein.');
    }
  }

  /** UPDATE — name, address, phone, type, main flag and on/off. */
  async update(user: AuthenticatedUser, id: string, dto: UpdateShopDto) {
    this.need(user, PERMISSIONS.SHOPS_MANAGE, 'Branches sambhalna');
    const shop = await this.prisma.shop.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!shop) throw new NotFoundException('Branch nahi mili');

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) throw new BadRequestException('Branch ka naam zaroori hai');
    if (name && name !== shop.name) {
      const exists = await this.prisma.shop.findFirst({ where: { tenantId: user.tenantId, name, id: { not: id } }, select: { id: true } });
      if (exists) throw new ConflictException('Is naam ki branch pehle se hai');
    }
    const switchingOff = dto.isActive === false && shop.isActive;
    const willBeActive = dto.isActive ?? shop.isActive;
    if (dto.isMain === true && !willBeActive) throw new BadRequestException('Band branch main nahi ban sakti');
    if (dto.isMain === false && shop.isMain) throw new BadRequestException('Main branch hatane ke liye kisi aur branch ko main banayein');
    if (switchingOff) await this.assertCanSwitchOff(user.tenantId, shop);

    const changed = (['name', 'address', 'phone', 'type', 'isMain', 'isActive'] as const).filter((k) => dto[k] !== undefined && dto[k] !== (shop as Record<string, unknown>)[k]);
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isMain === true && !shop.isMain) {
          await tx.shop.updateMany({ where: { tenantId: user.tenantId, isMain: true }, data: { isMain: false } });
        }
        const updated = await tx.shop.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(dto.address !== undefined && { address: dto.address.trim() || null }),
            ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
            ...(dto.isMain !== undefined && { isMain: dto.isMain }),
            ...(dto.type !== undefined && { type: dto.type }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          },
        });
        await tx.activityLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'UPDATE',
            entityType: 'Shop',
            entityId: id,
            description: `Branch "${updated.name}" badli`,
            metadata: { shopName: updated.name, changed },
          },
        });
        return updated;
      });
    } catch (e) {
      if (isUniqueClash(e)) throw new ConflictException('Is naam ki branch pehle se hai');
      throw e;
    }
  }

  /** TOGGLE — switch a branch on or off. */
  async toggleActive(user: AuthenticatedUser, id: string) {
    this.need(user, PERMISSIONS.SHOPS_MANAGE, 'Branches sambhalna');
    const shop = await this.prisma.shop.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!shop) throw new NotFoundException('Branch nahi mili');
    if (shop.isActive) await this.assertCanSwitchOff(user.tenantId, shop);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shop.update({ where: { id }, data: { isActive: !shop.isActive } });
      await tx.activityLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
          entityType: 'Shop',
          entityId: id,
          description: `Branch "${updated.name}" ${updated.isActive ? 'chalu ki' : 'band ki'}`,
          metadata: { shopName: updated.name },
        },
      });
      return updated;
    });
  }

  /**
   * DELETE with safety checks. A branch that has sales or money history can
   * only be switched off, never deleted: there is no path that wipes sales.
   */
  async remove(user: AuthenticatedUser, id: string) {
    this.need(user, PERMISSIONS.SHOPS_MANAGE, 'Branches sambhalna');

    const shop = await this.prisma.shop.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        _count: {
          select: {
            sales: true,
            users: true,
            shopStocks: true,
            cashRegisters: true,
            purchases: true,
            expenses: true,
            customerLedgers: true,
          },
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

    // Safety: block delete while any financial history points at this branch.
    // Sales alone used to be checked, so a branch holding only purchases,
    // expenses or khata entries could be deleted and quietly orphan them.
    const history =
      shop._count.sales +
      shop._count.purchases +
      shop._count.expenses +
      shop._count.customerLedgers;

    if (history > 0) {
      throw new BadRequestException({
        message:
          `${shop.name} ka hisab mojood hai (${shop._count.sales} sales, ` +
          `${shop._count.purchases} purchases, ${shop._count.expenses} expenses, ` +
          `${shop._count.customerLedgers} khata entries). Delete nahi kar sakte — ` +
          `deactivate karein taake record mehfooz rahe.`,
        code: 'HAS_FINANCIAL_HISTORY',
        suggestion: 'DEACTIVATE',
        stats: {
          sales: shop._count.sales,
          purchases: shop._count.purchases,
          expenses: shop._count.expenses,
          ledgerEntries: shop._count.customerLedgers,
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

}

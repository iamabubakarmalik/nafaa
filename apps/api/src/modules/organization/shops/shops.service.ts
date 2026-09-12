import {
  BadRequestException, ConflictException, ForbiddenException,
  Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashPassword } from '../../../common/utils/password.util';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateShopDto } from './dto/create-shop.dto';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../common/constants/permissions.constants';

@Injectable()
export class ShopsService {
  private readonly logger = new Logger(ShopsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
   * DELETE — with optional force flag for full cascade delete
   * force=true → deletes EVERYTHING (sales, transfers, registers, etc.)
   * force=false (default) → safety checks apply
   */
  async remove(user: AuthenticatedUser, id: string, force = false) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Sirf Owner shop delete kar sakta hai');
    }

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

    // ═══ FORCE DELETE — bypass all safety checks ═══
    if (force) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Cancel all pending/in-transit transfers involving this shop
        await tx.stockTransfer.updateMany({
          where: {
            tenantId: user.tenantId,
            status: { in: ['PENDING', 'IN_TRANSIT'] },
            OR: [{ fromShopId: id }, { toShopId: id }],
          },
          data: { status: 'CANCELLED' },
        });

        // 2. Close all open cash registers
        await tx.cashRegister.updateMany({
          where: { shopId: id, status: 'OPEN' },
          data: { status: 'CLOSED', closedAt: new Date() },
        });

        // 3. Delete all sales (SaleItems cascade automatically via schema)
        await tx.sale.deleteMany({ where: { tenantId: user.tenantId, shopId: id } });

        // 4. Unlink users from this shop
        await tx.user.updateMany({
          where: { shopId: id },
          data: { shopId: null },
        });

        // 5. Delete shop stocks
        await tx.shopStock.deleteMany({ where: { shopId: id } });

        // 6. Delete cash registers (now closed)
        await tx.cashRegister.deleteMany({ where: { shopId: id } });

        // 7. Delete stock transfers involving this shop
        await tx.stockTransfer.deleteMany({
          where: {
            tenantId: user.tenantId,
            OR: [{ fromShopId: id }, { toShopId: id }],
          },
        });

        // 8. Finally delete the shop.
        // Purchases, expenses, khata entries, stock movements and adjustments
        // are ON DELETE SET NULL — the money trail survives as untagged
        // history rather than disappearing with the branch.
        await tx.shop.delete({ where: { id } });

        await tx.activityLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.id,
            action: 'FORCE_DELETE',
            entityType: 'Shop',
            entityId: id,
            description: `${user.email} FORCE DELETED shop "${shop.name}" (cascade)`,
            metadata: { forced: true, hadSales: shop._count.sales },
          },
        });
      });

      return { message: `Shop "${shop.name}" force-deleted with all history`, forced: true };
    }

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
          `${shop._count.purchases} purchases, ${shop._count.expenses} kharche, ` +
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

  /**
   * OVERVIEW — Owner sees stats across all shops
   */
  /**
   * ANALYTICS — every branch side by side, plus the tenant-wide roll-up.
   *
   * This is what the owner's "All Shops" view is built on: who is selling most,
   * who is sitting on udhaar, whose register is still shut.
   */
  async analytics(user: AuthenticatedUser) {
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
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const enriched = await Promise.all(
      shops.map(async (shop) => {
        const [
          todayAgg, monthAgg, lowStockCount, openRegister, totalStock,
          yesterdayAgg, weekAgg, expenseToday, expenseMonth, creditAgg, staffCount,
        ] = await Promise.all([
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

          // ── Comparison + branch-health figures ──
          this.prisma.sale.aggregate({
            where: {
              tenantId: user.tenantId,
              shopId: shop.id,
              status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
              soldAt: { gte: yesterday, lt: today },
            },
            _sum: { total: true },
          }),
          this.prisma.sale.aggregate({
            where: {
              tenantId: user.tenantId,
              shopId: shop.id,
              status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] },
              soldAt: { gte: weekAgo },
            },
            _sum: { total: true, costOfGoods: true },
            _count: { _all: true },
          }),
          this.prisma.expense.aggregate({
            where: {
              tenantId: user.tenantId,
              shopId: shop.id,
              status: 'PAID',
              expenseDate: { gte: today },
            },
            _sum: { amount: true },
          }),
          this.prisma.expense.aggregate({
            where: {
              tenantId: user.tenantId,
              shopId: shop.id,
              status: 'PAID',
              expenseDate: { gte: monthStart },
            },
            _sum: { amount: true },
          }),
          // Is branch ne jo udhaar diya, uska baqi — khata ki jaan
          this.prisma.customerLedger.aggregate({
            where: { tenantId: user.tenantId, shopId: shop.id },
            _sum: { amount: true },
          }),
          this.prisma.staff.count({
            where: { tenantId: user.tenantId, shopId: shop.id, status: 'ACTIVE' },
          }),
        ]);

        const todaySales = todayAgg._sum.total ?? 0;
        const todayCogs = todayAgg._sum.costOfGoods ?? 0;
        const monthSales = monthAgg._sum.total ?? 0;
        const monthCogs = monthAgg._sum.costOfGoods ?? 0;
        const yesterdaySales = yesterdayAgg._sum.total ?? 0;
        const weekSales = weekAgg._sum.total ?? 0;
        const weekCogs = weekAgg._sum.costOfGoods ?? 0;
        const todayExpenses = expenseToday._sum.amount ?? 0;
        const monthExpenses = expenseMonth._sum.amount ?? 0;

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

          // ── Comparison ──
          yesterdaySales,
          /** Kal ke muqable kitne % upar/neeche */
          growthVsYesterday:
            yesterdaySales > 0
              ? ((todaySales - yesterdaySales) / yesterdaySales) * 100
              : todaySales > 0
                ? 100
                : 0,
          weekSales,
          weekProfit: weekSales - weekCogs,
          weekOrders: weekAgg._count._all ?? 0,
          avgOrderValue:
            (weekAgg._count._all ?? 0) > 0 ? weekSales / weekAgg._count._all : 0,

          // ── Branch health ──
          todayExpenses,
          monthExpenses,
          /** Aaj ka asli bacha hua paisa: sales − cost − kharche */
          todayNetProfit: todaySales - todayCogs - todayExpenses,
          monthNetProfit: monthSales - monthCogs - monthExpenses,
          /** Is branch ka diya hua udhaar jo abhi baqi hai */
          outstandingCredit: Math.max(Number(creditAgg._sum.amount ?? 0), 0),
          staffCount,
        };
      }),
    );

    // Tenant-wide roll-up so the UI doesn't have to re-add it, plus each
    // branch's share of the month — that is what makes the All Shops view
    // answer "kaun si branch chal rahi hai".
    const totals = enriched.reduce(
      (a, s) => ({
        todaySales: a.todaySales + s.todaySales,
        todayOrders: a.todayOrders + s.todayOrders,
        todayNetProfit: a.todayNetProfit + s.todayNetProfit,
        todayExpenses: a.todayExpenses + s.todayExpenses,
        monthSales: a.monthSales + s.monthSales,
        monthNetProfit: a.monthNetProfit + s.monthNetProfit,
        outstandingCredit: a.outstandingCredit + s.outstandingCredit,
        lowStockCount: a.lowStockCount + s.lowStockCount,
        totalStock: a.totalStock + s.totalStock,
        registersOpen: a.registersOpen + (s.registerOpen ? 1 : 0),
        staffCount: a.staffCount + s.staffCount,
      }),
      {
        todaySales: 0, todayOrders: 0, todayNetProfit: 0, todayExpenses: 0,
        monthSales: 0, monthNetProfit: 0, outstandingCredit: 0,
        lowStockCount: 0, totalStock: 0, registersOpen: 0, staffCount: 0,
      },
    );

    const withShare = enriched
      .map((s) => ({
        ...s,
        monthShare: totals.monthSales > 0 ? (s.monthSales / totals.monthSales) * 100 : 0,
      }))
      .sort((a, b) => b.monthSales - a.monthSales);

    const ranked = withShare.map((s, i) => ({ ...s, rank: i + 1 }));

    return {
      shops: ranked,
      totals: { ...totals, shopCount: ranked.length },
      best: ranked[0] ?? null,
      /** Jin par fauran tawajjo chahiye */
      needsAttention: ranked
        .filter((s) => s.lowStockCount > 0 || s.outstandingCredit > 0 || (!s.registerOpen && s.type === 'SHOP'))
        .map((s) => ({
          shopId: s.id,
          name: s.name,
          reasons: [
            s.lowStockCount > 0 ? `${s.lowStockCount} items low stock` : null,
            s.outstandingCredit > 0 ? `Rs ${Math.round(s.outstandingCredit)} udhaar baqi` : null,
            !s.registerOpen && s.type === 'SHOP' ? 'Register band hai' : null,
          ].filter((r): r is string => r !== null),
        })),
    };
  }

  /**
   * OVERVIEW — per-branch rows only.
   *
   * Kept as a plain array because the Shops and Shops-Overview pages already
   * render it that way; the roll-up lives at `analytics()` instead of changing
   * this shape out from under them. The extra per-shop fields are additive.
   */
  async overview(user: AuthenticatedUser) {
    const { shops } = await this.analytics(user);
    return shops;
  }
}

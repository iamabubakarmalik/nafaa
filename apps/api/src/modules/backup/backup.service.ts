/**
 * Full business backup: one JSON file with every core table of the tenant.
 * Read-only: nothing here changes or removes business data. Each download is
 * written to the activity log so the owner can see when backups were taken.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

export const BACKUP_ACTION = 'BACKUP_DOWNLOADED';
export const EXPORT_ACTION = 'DATA_EXPORTED';

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  /** Row counts per table plus the last backup, without loading the rows. */
  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const where = { tenantId };
    const [
      tenant, shops, categories, products, customers, suppliers, expenses, sales,
      purchases, stockMovements, cashRegisters, transfers, khataEntries, lastBackup,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      this.prisma.shop.count({ where }),
      this.prisma.category.count({ where }),
      this.prisma.product.count({ where }),
      this.prisma.customer.count({ where }),
      this.prisma.supplier.count({ where }),
      this.prisma.expense.count({ where }),
      this.prisma.sale.count({ where }),
      this.prisma.purchase.count({ where }),
      this.prisma.stockMovement.count({ where }),
      this.prisma.cashRegister.count({ where }),
      this.prisma.stockTransfer.count({ where }),
      this.prisma.customerLedger.count({ where }),
      this.prisma.activityLog.findFirst({
        where: { tenantId, action: BACKUP_ACTION },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, user: { select: { fullName: true } } },
      }),
    ]);

    return {
      meta: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        tenantId,
        tenantName: tenant?.name,
      },
      counts: {
        shops, categories, products, customers, suppliers, expenses, sales,
        purchases, stockMovements, cashRegisters, transfers, khataEntries,
      },
      lastBackup: lastBackup
        ? { at: lastBackup.createdAt, by: lastBackup.user?.fullName ?? null }
        : null,
    };
  }

  async exportAll(user: AuthenticatedUser) {
    const tenantId = user.tenantId;

    const [
      tenant,
      settings,
      shops,
      categories,
      products,
      customers,
      suppliers,
      expenseCategories,
      expenses,
      sales,
      saleItems,
      purchases,
      purchaseItems,
      stockMovements,
      stockAdjustments,
      customerLedgers,
      cashRegisters,
      cashTransactions,
      transfers,
      transferItems,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.tenantSettings.findUnique({ where: { tenantId } }),
      this.prisma.shop.findMany({ where: { tenantId } }),
      this.prisma.category.findMany({ where: { tenantId } }),
      this.prisma.product.findMany({ where: { tenantId } }),
      this.prisma.customer.findMany({ where: { tenantId } }),
      this.prisma.supplier.findMany({ where: { tenantId } }),
      this.prisma.expenseCategory.findMany({ where: { tenantId } }),
      this.prisma.expense.findMany({ where: { tenantId } }),
      this.prisma.sale.findMany({ where: { tenantId } }),
      this.prisma.saleItem.findMany({
        where: { sale: { tenantId } },
      }),
      this.prisma.purchase.findMany({ where: { tenantId } }),
      this.prisma.purchaseItem.findMany({
        where: { purchase: { tenantId } },
      }),
      this.prisma.stockMovement.findMany({ where: { tenantId } }),
      this.prisma.stockAdjustment.findMany({ where: { tenantId } }),
      this.prisma.customerLedger.findMany({ where: { tenantId } }),
      this.prisma.cashRegister.findMany({ where: { tenantId } }),
      this.prisma.cashTransaction.findMany({ where: { tenantId } }),
      this.prisma.stockTransfer.findMany({ where: { tenantId } }),
      this.prisma.stockTransferItem.findMany({
        where: { transfer: { tenantId } },
      }),
    ]);

    // The owner PIN hash is short and easy to brute-force offline; a backup
    // file gets copied around, so it never carries it.
    const safeSettings = settings ? { ...settings, managerPin: null } : null;

    return {
      meta: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        tenantId,
        tenantName: tenant?.name,
      },
      data: {
        tenant,
        settings: safeSettings,
        shops,
        categories,
        products,
        customers,
        suppliers,
        expenseCategories,
        expenses,
        sales,
        saleItems,
        purchases,
        purchaseItems,
        stockMovements,
        stockAdjustments,
        customerLedgers,
        cashRegisters,
        cashTransactions,
        transfers,
        transferItems,
      },
      counts: {
        shops: shops.length,
        categories: categories.length,
        products: products.length,
        customers: customers.length,
        suppliers: suppliers.length,
        expenses: expenses.length,
        sales: sales.length,
        purchases: purchases.length,
        stockMovements: stockMovements.length,
        cashRegisters: cashRegisters.length,
        transfers: transfers.length,
        khataEntries: customerLedgers.length,
      },
    };
  }

  /** Records that a backup file left the system. */
  async logDownload(user: AuthenticatedUser, counts: Record<string, number>, bytes: number) {
    const rows = Object.values(counts).reduce((s, n) => s + n, 0);
    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: BACKUP_ACTION,
        entityType: 'backup',
        description: `Poora backup download hua (${rows} records)`,
        metadata: { counts, bytes },
      },
    });
  }

  /** Backups and file exports taken by anyone in the business, newest first. */
  history(user: AuthenticatedUser) {
    return this.prisma.activityLog.findMany({
      where: { tenantId: user.tenantId, action: { in: [BACKUP_ACTION, EXPORT_ACTION] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        description: true,
        metadata: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
    });
  }
}

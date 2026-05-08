import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      meta: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        tenantId,
        tenantName: tenant?.name,
      },
      data: {
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
      },
    };
  }
}

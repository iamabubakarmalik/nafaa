import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SettingsBackupService {
  constructor(private readonly prisma: PrismaService) {}

  /** Export tenant data as JSON snapshot */
  async exportData(user: AuthenticatedUser, entities: string[]) {
    const allowed = ['products', 'customers', 'suppliers', 'sales', 'purchases', 'expenses', 'categories', 'settings'];
    const requested = entities.filter((e) => allowed.includes(e));
    if (!requested.length) throw new BadRequestException('Koi valid entity nahi di gayi');

    const snapshot: any = { exportedAt: new Date().toISOString(), tenantId: user.tenantId };
    const where = { tenantId: user.tenantId };

    if (requested.includes('products')) snapshot.products = await this.prisma.product.findMany({ where });
    if (requested.includes('customers')) snapshot.customers = await this.prisma.customer.findMany({ where });
    if (requested.includes('suppliers')) snapshot.suppliers = await this.prisma.supplier.findMany({ where });
    if (requested.includes('sales')) snapshot.sales = await this.prisma.sale.findMany({ where, include: { items: true } });
    if (requested.includes('purchases')) snapshot.purchases = await this.prisma.purchase.findMany({ where, include: { items: true } });
    if (requested.includes('expenses')) snapshot.expenses = await this.prisma.expense.findMany({ where });
    if (requested.includes('categories')) snapshot.categories = await this.prisma.category.findMany({ where });
    if (requested.includes('settings')) snapshot.settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });

    await this.prisma.activityLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: 'DATA_EXPORTED',
        description: `Exported: ${requested.join(', ')}`,
      },
    });

    return snapshot;
  }

  /** Summary of stored data */
  async stats(user: AuthenticatedUser) {
    const [products, customers, sales, purchases, expenses] = await Promise.all([
      this.prisma.product.count({ where: { tenantId: user.tenantId } }),
      this.prisma.customer.count({ where: { tenantId: user.tenantId } }),
      this.prisma.sale.count({ where: { tenantId: user.tenantId } }),
      this.prisma.purchase.count({ where: { tenantId: user.tenantId } }),
      this.prisma.expense.count({ where: { tenantId: user.tenantId } }),
    ]);
    return { products, customers, sales, purchases, expenses };
  }
}

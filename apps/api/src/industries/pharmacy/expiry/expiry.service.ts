import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { genericLabel } from '../medicines/medicines.service';
import { daysUntil, round2 } from '../common/pharmacy-time';
import { ListExpiryDto } from './dto/list-expiry.dto';

export interface ExpiryBucketTotals { batches: number; qty: number; cost: number; sale: number }
const empty = (): ExpiryBucketTotals => ({ batches: 0, qty: 0, cost: 0, sale: 0 });

/**
 * Batches by expiry for the branch: what has expired, what expires soon, the
 * money at stake (at cost and at sale price), and where each batch came from
 * so it can go back to the distributor.
 */
@Injectable()
export class ExpiryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, scope: ShopScope, q: ListExpiryDto) {
    const now = new Date();
    const bucket = q.bucket ?? '90';
    const page = q.page ?? 1;
    const limit = q.limit ?? 50;
    const search = q.search?.trim();

    const rows = await this.prisma.productBatch.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        quantity: { gt: 0.0001 },
        expiryDate: { not: null },
        product: { tenantId: user.tenantId },
        ...scope.whereLoose,
      },
      select: {
        id: true, batchNumber: true, expiryDate: true, manufactureDate: true, quantity: true, costPrice: true, notes: true, shopId: true,
        shop: { select: { id: true, name: true } },
        product: {
          select: {
            id: true, name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, isActive: true,
            images: { where: { isPrimary: true }, take: 1, select: { url: true } },
            pharmacyMedicine: { select: { isNarcotic: true, requiresColdChain: true, requiresPrescription: true, dosageForm: true, manufacturer: true } },
            productSalts: { select: { strength: true, isMainSalt: true, salt: { select: { name: true } } } },
          },
        },
      },
      take: 20_000,
    });

    const items = rows.map((b) => {
      const days = daysUntil(b.expiryDate, now) ?? 0;
      const qty = Number(b.quantity);
      const unitCost = Number(b.costPrice) || Number(b.product.costPrice) || 0;
      const { productSalts, pharmacyMedicine, images, ...product } = b.product;
      return {
        id: b.id,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        manufactureDate: b.manufactureDate,
        daysLeft: days,
        quantity: qty,
        unitCost,
        value: round2(qty * unitCost),
        saleValue: round2(qty * Number(b.product.price || 0)),
        notes: b.notes,
        shop: b.shop,
        product: { ...product, image: images[0]?.url ?? null },
        medicine: pharmacyMedicine,
        generic: genericLabel(productSalts),
      };
    });

    const totals = { expired: empty(), d30: empty(), d90: empty(), d180: empty() };
    for (const it of items) {
      const add = (t: ExpiryBucketTotals) => { t.batches += 1; t.qty += it.quantity; t.cost += it.value; t.sale += it.saleValue; };
      if (it.daysLeft < 0) add(totals.expired);
      else {
        if (it.daysLeft <= 30) add(totals.d30);
        if (it.daysLeft <= 90) add(totals.d90);
        if (it.daysLeft <= 180) add(totals.d180);
      }
    }
    for (const t of Object.values(totals)) { t.qty = round2(t.qty); t.cost = round2(t.cost); t.sale = round2(t.sale); }

    const inBucket = (d: number) => bucket === 'all' || (bucket === 'expired' ? d < 0 : d >= 0 && d <= Number(bucket));
    const needle = search?.toLowerCase();
    let list = items.filter((it) => inBucket(it.daysLeft) && (!needle || [it.product.name, it.product.sku, it.product.barcode, it.batchNumber, it.generic]
      .some((v) => (v ?? '').toLowerCase().includes(needle))));
    list = list.sort((a, b) => (q.sort === 'value' ? b.value - a.value
      : q.sort === 'name' ? a.product.name.localeCompare(b.product.name)
        : a.daysLeft - b.daysLeft));

    return {
      items: list.slice((page - 1) * limit, page * limit),
      total: list.length,
      page,
      limit,
      totals,
    };
  }

  /**
   * Received purchase lines this batch came from, with how much can still go
   * back to the distributor. A line matches on its batch number, or on the
   * bill number when the purchase gave only an expiry date.
   */
  async source(user: AuthenticatedUser, batchId: string) {
    const batch = await this.prisma.productBatch.findFirst({
      where: { id: batchId, tenantId: user.tenantId },
      select: { id: true, batchNumber: true, productId: true, variantId: true, shopId: true, quantity: true, expiryDate: true },
    });
    if (!batch) throw new NotFoundException('Batch nahi mila');
    const where: Prisma.PurchaseItemWhereInput = {
      productId: batch.productId,
      variantId: batch.variantId,
      purchase: {
        tenantId: user.tenantId,
        status: { in: ['RECEIVED', 'PARTIAL'] },
        ...(batch.shopId && { shopId: batch.shopId }),
      },
      OR: [
        { batchNo: batch.batchNumber },
        { batchNo: null, purchase: { purchaseNumber: batch.batchNumber } },
      ],
    };
    const lines = await this.prisma.purchaseItem.findMany({
      where,
      select: {
        id: true, unitName: true, conversionRate: true, costPrice: true, receivedQty: true, returnedQty: true,
        purchase: { select: { id: true, purchaseNumber: true, purchasedAt: true, supplier: { select: { id: true, name: true, phone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      batch,
      lines: lines.map((l) => {
        const base = Math.max(0, Number(l.receivedQty) - Number(l.returnedQty));
        const rate = Number(l.conversionRate) || 1;
        return {
          itemId: l.id,
          purchaseId: l.purchase.id,
          purchaseNumber: l.purchase.purchaseNumber,
          purchasedAt: l.purchase.purchasedAt,
          supplier: l.purchase.supplier,
          unitName: l.unitName,
          conversionRate: rate,
          unitCost: Number(l.costPrice),
          returnableBase: round2(Math.min(base, Number(batch.quantity))),
          returnableUnits: Math.floor((Math.min(base, Number(batch.quantity)) / rate) * 1000) / 1000,
        };
      }).filter((l) => l.returnableBase > 0),
    };
  }
}

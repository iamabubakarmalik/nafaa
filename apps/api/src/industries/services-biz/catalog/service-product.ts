/**
 * Each catalogue service has a matching product (unit "service", no stock)
 * so it can be sold at the shared counter and shows in product and sales
 * reports. The product is found by its SKU; name, price and active state
 * follow the catalogue.
 */

import type { Prisma, ServiceCatalog } from '@prisma/client';
import { r2 } from '../jobs/job-rules';

type Db = Prisma.TransactionClient;

export const serviceSku = (serviceId: string) => `SVCB-${serviceId}`;
const SERVICE_TYPE = 'SERVICE';

/** Counter price of a service: fixed charge, else visit charge, else the hourly rate. */
export const servicePrice = (s: Pick<ServiceCatalog, 'baseCharge' | 'visitCharge' | 'hourlyRate'>) =>
  r2(s.baseCharge || s.visitCharge || s.hourlyRate || 0);

export async function ensureServiceProduct(
  db: Db,
  tenantId: string,
  svc: Pick<ServiceCatalog, 'id' | 'name' | 'description' | 'baseCharge' | 'visitCharge' | 'hourlyRate' | 'isActive'>,
): Promise<string> {
  const sku = serviceSku(svc.id);
  const data = {
    name: svc.name,
    price: servicePrice(svc),
    unit: 'service',
    productType: SERVICE_TYPE,
    isActive: svc.isActive,
  };
  const found = await db.product.findFirst({ where: { tenantId, sku }, select: { id: true, name: true, price: true, unit: true, isActive: true, productType: true } });
  if (!found) {
    const created = await db.product.create({
      data: { tenantId, sku, ...data, costPrice: 0, stock: 0, lowStockAlert: 0, description: svc.description || 'Service — Service Catalog se badlein' },
      select: { id: true },
    });
    return created.id;
  }
  if (found.name !== data.name || found.price !== data.price || found.unit !== 'service' || found.isActive !== data.isActive || found.productType !== SERVICE_TYPE) {
    await db.product.update({ where: { id: found.id }, data: { name: data.name, price: data.price, unit: 'service', productType: SERVICE_TYPE, isActive: data.isActive } });
  }
  return found.id;
}

/** Product ids of the given services that already have one (never creates). */
export async function serviceProductIds(db: Pick<Db, 'product'>, tenantId: string, serviceIds: string[]) {
  if (!serviceIds.length) return new Map<string, string>();
  const rows = await db.product.findMany({ where: { tenantId, sku: { in: serviceIds.map(serviceSku) } }, select: { id: true, sku: true } });
  return new Map(rows.map((r) => [r.sku!.slice('SVCB-'.length), r.id]));
}

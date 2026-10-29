/**
 * Data for the printed distribution documents. The web renders them through
 * core/print (kinds invoice-a4, load-sheet, recovery-sheet); the API only
 * gathers the figures so every copy matches the bill.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { splitPacks } from '../helpers/logistics';
import { customerCards, r2, routeNames, userNames } from '../distribution.support';
import { LoadSheetsService } from './load-sheets.service';

@Injectable()
export class DistributionPrintService {
  constructor(private readonly prisma: PrismaService, private readonly sheets: LoadSheetsService) {}

  /** The business block printed on every document. */
  async business(tenantId: string) {
    const [s, fbr, tenant] = await Promise.all([
      this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { shopName: true, legalName: true, shopAddress: true, shopCity: true, shopPhone: true, shopEmail: true, logoUrl: true, receiptFooter: true },
      }),
      this.prisma.fbrConfig.findUnique({ where: { tenantId }, select: { ntn: true, strn: true, businessName: true } }),
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    return {
      name: s?.shopName || fbr?.businessName || tenant?.name || '',
      legalName: s?.legalName ?? null, address: s?.shopAddress ?? null, city: s?.shopCity ?? null,
      phone: s?.shopPhone ?? null, email: s?.shopEmail ?? null, logoUrl: s?.logoUrl ?? null, footer: s?.receiptFooter ?? null,
      ntn: fbr?.ntn ?? null, strn: fbr?.strn ?? null,
    };
  }

  /** A4 invoices for invoiced orders (kind invoice-a4), in the order asked. */
  async invoices(user: AuthenticatedUser, orderIds: string[]) {
    const tenantId = user.tenantId;
    const orders = await this.prisma.salesOrder.findMany({
      where: { tenantId, id: { in: [...new Set(orderIds)] }, saleId: { not: null } },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
    const saleIds = orders.map((o) => o.saleId!);
    const productIds = [...new Set(orders.flatMap((o) => o.items.flatMap((i) => [i.productId, ...(i.freeProductId ? [i.freeProductId] : [])])))];
    const [business, sales, products, units, customers, users, routes] = await Promise.all([
      this.business(tenantId),
      this.prisma.sale.findMany({ where: { tenantId, id: { in: saleIds } }, select: { id: true, saleNumber: true, soldAt: true, total: true, paidAmount: true, creditAmount: true, refundedAmount: true, status: true } }),
      this.prisma.product.findMany({ where: { tenantId, id: { in: productIds } }, select: { id: true, name: true, sku: true, unit: true, taxRate: true } }),
      this.prisma.productUnit.findMany({ where: { tenantId, productId: { in: productIds }, isActive: true }, select: { productId: true, variantId: true, unitName: true, conversionRate: true } }),
      customerCards(this.prisma, tenantId, orders.map((o) => o.customerId)),
      userNames(this.prisma, tenantId, orders.map((o) => o.bookedById)),
      routeNames(this.prisma, tenantId, orders.map((o) => o.routeId)),
    ]);
    const ledger = await this.prisma.customerLedger.findMany({
      where: { tenantId, type: 'SALE_CREDIT', reference: { in: sales.map((s) => s.saleNumber) } },
      select: { reference: true, amount: true, balanceAfter: true },
    });
    const extra = await this.prisma.customer.findMany({ where: { tenantId, id: { in: orders.map((o) => o.customerId) } }, select: { id: true, licenseNo: true, licenseExpiry: true, cnic: true } });
    const saleMap = new Map(sales.map((s) => [s.id, s]));
    const pMap = new Map(products.map((p) => [p.id, p]));
    const lMap = new Map(ledger.map((l) => [l.reference, l]));
    const xMap = new Map(extra.map((x) => [x.id, x]));
    const byId = new Map(orders.map((o) => [o.id, o]));

    return {
      kind: 'invoice-a4',
      business,
      invoices: orderIds.map((id) => byId.get(id)).filter((o): o is NonNullable<typeof o> => !!o).map((o) => {
        const sale = saleMap.get(o.saleId!)!;
        const credit = lMap.get(sale?.saleNumber);
        const lines = o.items.map((i, n) => {
          const p = pMap.get(i.productId);
          const net = r2(i.total);
          const rate = Number(p?.taxRate) || 0;
          return {
            no: n + 1, productId: i.productId, name: p?.name ?? '', sku: p?.sku ?? null,
            unitName: i.unitName ?? p?.unit ?? 'pcs', conversionRate: i.conversionRate, qty: i.qty, baseQty: i.baseQty,
            rate: i.price, gross: r2(i.qty * i.price), schemeDiscount: i.schemeDiscount, discount: i.discount, net,
            schemeNote: i.schemeNote, taxRate: rate, taxIncluded: rate > 0 ? r2((net * rate) / (100 + rate)) : 0,
          };
        });
        const free = o.items.filter((i) => i.freeBaseQty > 0).map((i) => {
          const pid = i.freeProductId ?? i.productId;
          const p = pMap.get(pid);
          const packs = units.filter((u) => u.productId === pid && (!u.variantId || u.variantId === i.variantId));
          return { productId: pid, name: p?.name ?? '', baseQty: i.freeBaseQty, text: splitPacks(i.freeBaseQty, packs, p?.unit || 'pcs').text, schemeNote: i.schemeNote };
        });
        const c = customers.get(o.customerId);
        const x = xMap.get(o.customerId);
        return {
          orderId: o.id, orderNumber: o.orderNumber, saleId: o.saleId, invoiceNumber: sale?.saleNumber ?? null,
          date: sale?.soldAt ?? o.invoicedAt, bookedAt: o.bookedAt, deliveryDate: o.deliveryDate, status: sale?.status ?? null,
          customer: c ? { ...c, licenseNo: x?.licenseNo ?? null, licenseExpiry: x?.licenseExpiry ?? null, cnic: x?.cnic ?? null } : null,
          bookedByName: users.get(o.bookedById) ?? null, routeName: o.routeId ? routes.get(o.routeId) ?? null : null,
          lines, free,
          totals: {
            gross: r2(lines.reduce((s, l) => s + l.gross, 0)), schemeDiscount: o.schemeDiscount, discount: o.discount, total: o.total,
            taxIncluded: r2(lines.reduce((s, l) => s + l.taxIncluded, 0)),
            paid: sale?.paidAmount ?? 0, returned: sale?.refundedAmount ?? 0,
            previousBalance: credit ? r2(credit.balanceAfter - credit.amount) : null,
            balanceAfterInvoice: credit ? r2(credit.balanceAfter) : null,
          },
          note: o.note,
        };
      }),
    };
  }

  /** Load sheet with its goods to pick, and every invoice on it for printing together. */
  async loadSheet(user: AuthenticatedUser, id: string, withInvoices = true) {
    const sheet = await this.sheets.get(user, id);
    return {
      kind: 'load-sheet',
      business: await this.business(user.tenantId),
      sheet,
      ...(withInvoices && { invoices: (await this.invoices(user, sheet.orders.map((o) => o.id))).invoices }),
    };
  }
}

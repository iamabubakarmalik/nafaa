/**
 * Excel and PDF files of the business records: sales, products, customers,
 * suppliers, expenses, purchases, khata and stock movements. Dated records
 * follow business days and the branch scope; cost columns need `cost.view`.
 * Every file is written to the activity log so the Exports and Backup pages
 * can show who downloaded what. Read-only.
 */

import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { BusinessClock, TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { safeDayStart, tzParts, zonedToUtc } from '../../../common/helpers/business-time.helper';
import { PERMISSIONS, hasPermission, type PermissionKey } from '../../../common/constants/permissions.constants';
import { EXPORT_ACTION } from '../../backup/backup.service';
import { ExportQueryDto } from './dto/export-query.dto';

export const EXPORT_KINDS = ['sales', 'products', 'customers', 'suppliers', 'expenses', 'purchases', 'ledger', 'stock-movements'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

const KIND_LABEL: Record<ExportKind, string> = {
  sales: 'Bikri',
  products: 'Maal (products)',
  customers: 'Customers',
  suppliers: 'Suppliers',
  expenses: 'Kharche',
  purchases: 'Kharidari',
  ledger: 'Khata',
  'stock-movements': 'Stock ka aana jana',
};

/** The view right of the records inside each file. */
const KIND_PERMISSION: Record<ExportKind, PermissionKey> = {
  sales: PERMISSIONS.SALES_VIEW,
  products: PERMISSIONS.PRODUCTS_VIEW,
  customers: PERMISSIONS.CUSTOMERS_VIEW,
  suppliers: PERMISSIONS.SUPPLIERS_VIEW,
  expenses: PERMISSIONS.EXPENSES_VIEW,
  purchases: PERMISSIONS.PURCHASES_VIEW,
  ledger: PERMISSIONS.KHATA_VIEW,
  'stock-movements': PERMISSIONS.STOCK_MOVEMENTS_VIEW,
};

/** Large tenants: keep one file within memory and Excel's comfort zone. */
const MAX_ROWS = 20_000;
const MAX_PDF_ROWS = 500;

interface Column { header: string; key: string; width: number; money?: boolean }
type Row = Record<string, string | number | null>;

interface ExportContext {
  user: AuthenticatedUser;
  scope: ShopScope;
  clock: BusinessClock;
  range?: { gte?: Date; lte?: Date };
  canSeeCost: boolean;
}

@Injectable()
export class ExportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** Builds one Excel file and logs it. */
  async excel(user: AuthenticatedUser, scope: ShopScope, kind: string, q: ExportQueryDto): Promise<Buffer> {
    if (!EXPORT_KINDS.includes(kind as ExportKind)) throw new BadRequestException('Ye file nahi ban sakti');
    this.assertCanExport(user, kind as ExportKind);
    const ctx = await this.context(user, scope, q);
    const { columns, rows } = await this.build(kind as ExportKind, ctx);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(KIND_LABEL[kind as ExportKind].slice(0, 31));
    sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width, style: c.money ? { numFmt: '#,##0.00' } : undefined }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C9466' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.addRows(rows);

    await this.log(ctx, kind as ExportKind, 'excel', rows.length, q);
    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async salesPdf(user: AuthenticatedUser, scope: ShopScope, q: ExportQueryDto): Promise<Buffer> {
    this.assertCanExport(user, 'sales');
    const ctx = await this.context(user, scope, q);
    const [sales, tenant, shop] = await Promise.all([
      this.prisma.sale.findMany({
        where: this.saleWhere(ctx),
        orderBy: { soldAt: 'desc' },
        select: { saleNumber: true, soldAt: true, total: true, paidAmount: true, refundedAmount: true, paymentMethod: true, customer: { select: { name: true } } },
        take: MAX_PDF_ROWS,
      }),
      this.prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { name: true } }),
      scope.shopId ? this.prisma.shop.findUnique({ where: { id: scope.shopId }, select: { name: true } }) : null,
    ]);
    await this.log(ctx, 'sales', 'pdf', sales.length, q);

    const period = q.from || q.to ? `${q.from ?? 'shuru'} se ${q.to ?? 'aaj'} tak` : 'Sab waqt';
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new (PDFDocument as any)({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).fillColor('#0f172a').text('Sales Report', { align: 'center' });
      doc.fontSize(10).fillColor('#64748b').text([tenant?.name || 'Nafaa', shop?.name].filter(Boolean).join(' · '), { align: 'center' });
      doc.text(`${period} · Bana: ${this.stamp(new Date(), ctx.clock)}`, { align: 'center' });
      if (sales.length === MAX_PDF_ROWS) doc.text(`Sirf naye ${MAX_PDF_ROWS} bill — poori list Excel me lein`, { align: 'center' });
      doc.moveDown(1.5);

      const cols = [40, 130, 240, 340, 420, 500];
      const head = ['Sale #', 'Date', 'Customer', 'Total', 'Paid', 'Method'];
      let y = doc.y;
      doc.fontSize(9).fillColor('#0f172a').font('Helvetica-Bold');
      head.forEach((h, i) => doc.text(h, cols[i], y));
      doc.moveTo(40, y + 14).lineTo(560, y + 14).stroke('#cbd5e1');
      doc.font('Helvetica');
      y += 20;

      let total = 0;
      let refunded = 0;
      for (const s of sales) {
        if (y > 750) { doc.addPage(); y = 40; }
        doc.text(s.saleNumber, cols[0], y, { width: 85 });
        doc.text(this.stamp(s.soldAt, ctx.clock), cols[1], y, { width: 105 });
        doc.text((s.customer?.name || 'Walk-in').substring(0, 18), cols[2], y, { width: 95 });
        doc.text(`Rs ${s.total.toFixed(0)}`, cols[3], y, { width: 75 });
        doc.text(`Rs ${s.paidAmount.toFixed(0)}`, cols[4], y, { width: 75 });
        doc.text(s.paymentMethod, cols[5], y, { width: 60 });
        total += s.total;
        refunded += s.refundedAmount;
        y += 18;
      }

      doc.moveTo(40, y + 4).lineTo(560, y + 4).stroke('#cbd5e1');
      y += 14;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
      doc.text(`Bills: ${sales.length}`, 40, y);
      doc.text(`Total: Rs ${total.toFixed(0)}`, 160, y);
      doc.text(`Wapas: Rs ${refunded.toFixed(0)}`, 330, y);
      doc.end();
    });
  }

  /** Recent file exports in this business. */
  history(user: AuthenticatedUser) {
    return this.prisma.activityLog.findMany({
      where: { tenantId: user.tenantId, action: EXPORT_ACTION },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, description: true, metadata: true, createdAt: true, user: { select: { fullName: true } } },
    });
  }

  /* ─── builders ─── */

  private build(kind: ExportKind, ctx: ExportContext): Promise<{ columns: Column[]; rows: Row[] }> {
    switch (kind) {
      case 'sales': return this.sales(ctx);
      case 'products': return this.products(ctx);
      case 'customers': return this.customers(ctx);
      case 'suppliers': return this.suppliers(ctx);
      case 'expenses': return this.expenses(ctx);
      case 'purchases': return this.purchases(ctx);
      case 'ledger': return this.ledger(ctx);
      case 'stock-movements': return this.movements(ctx);
    }
  }

  private saleWhere(ctx: ExportContext) {
    return {
      tenantId: ctx.user.tenantId,
      ...ctx.scope.where,
      status: { not: 'VOIDED' as const },
      ...(ctx.range ? { soldAt: ctx.range } : {}),
    };
  }

  private async sales(ctx: ExportContext) {
    const sales = await this.prisma.sale.findMany({
      where: this.saleWhere(ctx),
      orderBy: { soldAt: 'desc' },
      take: MAX_ROWS,
      select: {
        saleNumber: true, soldAt: true, status: true, subtotal: true, discount: true, total: true, paidAmount: true,
        creditAmount: true, refundedAmount: true, costOfGoods: true, paymentMethod: true, source: true,
        customer: { select: { name: true, phone: true } },
        createdBy: { select: { fullName: true } },
        shop: { select: { name: true } },
        _count: { select: { items: true } },
      },
    });
    const columns: Column[] = [
      { header: 'Sale Number', key: 'saleNumber', width: 18 },
      { header: 'Date', key: 'soldAt', width: 18 },
      { header: 'Branch', key: 'shop', width: 18 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Items', key: 'items', width: 8 },
      { header: 'Subtotal', key: 'subtotal', width: 14, money: true },
      { header: 'Discount', key: 'discount', width: 12, money: true },
      { header: 'Total', key: 'total', width: 14, money: true },
      { header: 'Paid', key: 'paid', width: 14, money: true },
      { header: 'Credit', key: 'credit', width: 14, money: true },
      { header: 'Refunded', key: 'refunded', width: 14, money: true },
      ...(ctx.canSeeCost ? [{ header: 'Cost', key: 'cost', width: 14, money: true }] : []),
      { header: 'Payment', key: 'method', width: 14 },
      { header: 'Source', key: 'source', width: 12 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Cashier', key: 'cashier', width: 20 },
    ];
    const rows = sales.map((s) => ({
      saleNumber: s.saleNumber, soldAt: this.stamp(s.soldAt, ctx.clock), shop: s.shop?.name ?? '',
      customer: s.customer?.name || 'Walk-in', phone: s.customer?.phone ?? '', items: s._count.items,
      subtotal: s.subtotal, discount: s.discount, total: s.total, paid: s.paidAmount, credit: s.creditAmount,
      refunded: s.refundedAmount, cost: s.costOfGoods, method: s.paymentMethod, source: s.source, status: s.status,
      cashier: s.createdBy?.fullName ?? '',
    }));
    return { columns, rows };
  }

  private async products(ctx: ExportContext) {
    const products = await this.prisma.product.findMany({
      where: { tenantId: ctx.user.tenantId },
      orderBy: { name: 'asc' },
      take: MAX_ROWS,
      select: { id: true, name: true, sku: true, barcode: true, unit: true, price: true, costPrice: true, stock: true, lowStockAlert: true, isActive: true, category: { select: { name: true } } },
    });
    // In one branch the stock column is that branch's stock, not the business total.
    let branchStock: Map<string, number> | null = null;
    if (ctx.scope.shopId) {
      const rows = await this.prisma.shopStock.groupBy({
        by: ['productId'],
        where: { tenantId: ctx.user.tenantId, shopId: ctx.scope.shopId },
        _sum: { stock: true },
      });
      branchStock = new Map(rows.map((r) => [r.productId, r._sum.stock ?? 0]));
    }
    const columns: Column[] = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Barcode', key: 'barcode', width: 18 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Unit', key: 'unit', width: 8 },
      { header: 'Price', key: 'price', width: 12, money: true },
      ...(ctx.canSeeCost ? [{ header: 'Cost Price', key: 'costPrice', width: 12, money: true }] : []),
      { header: branchStock ? 'Stock (branch)' : 'Stock', key: 'stock', width: 12 },
      { header: 'Low Alert', key: 'lowStockAlert', width: 10 },
      ...(ctx.canSeeCost ? [{ header: 'Stock Value (cost)', key: 'stockValue', width: 16, money: true }] : []),
      { header: 'Active', key: 'isActive', width: 8 },
    ];
    const rows = products.map((p) => {
      const stock = branchStock ? branchStock.get(p.id) ?? 0 : p.stock;
      return {
        name: p.name, sku: p.sku ?? '', barcode: p.barcode ?? '', category: p.category?.name ?? '', unit: p.unit,
        price: p.price, costPrice: p.costPrice, stock, lowStockAlert: p.lowStockAlert,
        stockValue: Math.round(stock * p.costPrice * 100) / 100, isActive: p.isActive ? 'Yes' : 'No',
      };
    });
    return { columns, rows };
  }

  private async customers(ctx: ExportContext) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId: ctx.user.tenantId },
      orderBy: { name: 'asc' },
      take: MAX_ROWS,
      select: { name: true, phone: true, email: true, address: true, balance: true, creditLimit: true, loyaltyPoints: true, totalSpent: true, isActive: true, createdAt: true },
    });
    const columns: Column[] = [
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Balance (Udhaar)', key: 'balance', width: 16, money: true },
      { header: 'Credit Limit', key: 'creditLimit', width: 14, money: true },
      { header: 'Loyalty Points', key: 'loyaltyPoints', width: 14 },
      { header: 'Total Spent', key: 'totalSpent', width: 16, money: true },
      { header: 'Active', key: 'isActive', width: 8 },
      { header: 'Created', key: 'createdAt', width: 18 },
    ];
    const rows = customers.map((c) => ({
      name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', balance: c.balance,
      creditLimit: c.creditLimit, loyaltyPoints: c.loyaltyPoints, totalSpent: c.totalSpent,
      isActive: c.isActive ? 'Yes' : 'No', createdAt: this.stamp(c.createdAt, ctx.clock),
    }));
    return { columns, rows };
  }

  private async suppliers(ctx: ExportContext) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { tenantId: ctx.user.tenantId },
      orderBy: { name: 'asc' },
      take: MAX_ROWS,
      select: { name: true, contactPerson: true, phone: true, email: true, city: true, address: true, ntn: true, bankName: true, accountNumber: true, iban: true, paymentTerms: true, totalPurchased: true, outstandingDue: true, isActive: true },
    });
    const columns: Column[] = [
      { header: 'Name', key: 'name', width: 26 },
      { header: 'Contact Person', key: 'contactPerson', width: 20 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'City', key: 'city', width: 14 },
      { header: 'Address', key: 'address', width: 28 },
      { header: 'NTN', key: 'ntn', width: 14 },
      { header: 'Bank', key: 'bankName', width: 16 },
      { header: 'Account No.', key: 'accountNumber', width: 20 },
      { header: 'IBAN', key: 'iban', width: 26 },
      { header: 'Payment Terms', key: 'paymentTerms', width: 16 },
      { header: 'Total Purchased', key: 'totalPurchased', width: 16, money: true },
      { header: 'Outstanding Due', key: 'outstandingDue', width: 16, money: true },
      { header: 'Active', key: 'isActive', width: 8 },
    ];
    const rows = suppliers.map((s) => ({
      name: s.name, contactPerson: s.contactPerson ?? '', phone: s.phone ?? '', email: s.email ?? '', city: s.city ?? '',
      address: s.address ?? '', ntn: s.ntn ?? '', bankName: s.bankName ?? '', accountNumber: s.accountNumber ?? '', iban: s.iban ?? '',
      paymentTerms: s.paymentTerms ?? '', totalPurchased: s.totalPurchased, outstandingDue: s.outstandingDue, isActive: s.isActive ? 'Yes' : 'No',
    }));
    return { columns, rows };
  }

  private async expenses(ctx: ExportContext) {
    const expenses = await this.prisma.expense.findMany({
      where: { tenantId: ctx.user.tenantId, ...ctx.scope.where, ...(ctx.range ? { expenseDate: ctx.range } : {}) },
      orderBy: { expenseDate: 'desc' },
      take: MAX_ROWS,
      select: { expenseNumber: true, expenseDate: true, title: true, description: true, amount: true, paymentMethod: true, status: true, category: { select: { name: true } }, shop: { select: { name: true } }, createdBy: { select: { fullName: true } } },
    });
    const columns: Column[] = [
      { header: 'Number', key: 'number', width: 14 },
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Branch', key: 'shop', width: 18 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Title', key: 'title', width: 28 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Amount', key: 'amount', width: 14, money: true },
      { header: 'Payment', key: 'method', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Added By', key: 'by', width: 20 },
    ];
    const rows = expenses.map((e) => ({
      number: e.expenseNumber, date: this.stamp(e.expenseDate, ctx.clock), shop: e.shop?.name ?? '', category: e.category?.name ?? '',
      title: e.title, description: e.description ?? '', amount: e.amount, method: e.paymentMethod, status: e.status, by: e.createdBy?.fullName ?? '',
    }));
    return { columns, rows };
  }

  private async purchases(ctx: ExportContext) {
    const purchases = await this.prisma.purchase.findMany({
      where: { tenantId: ctx.user.tenantId, ...ctx.scope.where, ...(ctx.range ? { purchasedAt: ctx.range } : {}) },
      orderBy: { purchasedAt: 'desc' },
      take: MAX_ROWS,
      select: {
        purchaseNumber: true, purchasedAt: true, supplierInvoiceNo: true, status: true, subtotal: true, discount: true, taxAmount: true,
        otherCharges: true, total: true, paidAmount: true, returnedAmount: true, paymentMethod: true,
        supplier: { select: { name: true } }, shop: { select: { name: true } }, _count: { select: { items: true } },
      },
    });
    const columns: Column[] = [
      { header: 'Number', key: 'number', width: 14 },
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Branch', key: 'shop', width: 18 },
      { header: 'Supplier', key: 'supplier', width: 24 },
      { header: 'Supplier Bill', key: 'bill', width: 14 },
      { header: 'Items', key: 'items', width: 8 },
      { header: 'Subtotal', key: 'subtotal', width: 14, money: true },
      { header: 'Discount', key: 'discount', width: 12, money: true },
      { header: 'Tax', key: 'tax', width: 12, money: true },
      { header: 'Other Charges', key: 'other', width: 14, money: true },
      { header: 'Total', key: 'total', width: 14, money: true },
      { header: 'Paid', key: 'paid', width: 14, money: true },
      { header: 'Returned', key: 'returned', width: 14, money: true },
      { header: 'Payment', key: 'method', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
    ];
    const rows = purchases.map((p) => ({
      number: p.purchaseNumber, date: this.stamp(p.purchasedAt, ctx.clock), shop: p.shop?.name ?? '', supplier: p.supplier.name,
      bill: p.supplierInvoiceNo ?? '', items: p._count.items, subtotal: p.subtotal, discount: p.discount, tax: p.taxAmount,
      other: p.otherCharges, total: p.total, paid: p.paidAmount, returned: p.returnedAmount, method: p.paymentMethod, status: p.status,
    }));
    return { columns, rows };
  }

  private async ledger(ctx: ExportContext) {
    const entries = await this.prisma.customerLedger.findMany({
      where: { tenantId: ctx.user.tenantId, ...ctx.scope.whereLoose, ...(ctx.range ? { createdAt: ctx.range } : {}) },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      select: { createdAt: true, type: true, amount: true, balanceAfter: true, reference: true, note: true, customer: { select: { name: true, phone: true } }, shop: { select: { name: true } } },
    });
    const columns: Column[] = [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Branch', key: 'shop', width: 18 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Type', key: 'type', width: 18 },
      { header: 'Amount', key: 'amount', width: 14, money: true },
      { header: 'Balance After', key: 'balance', width: 14, money: true },
      { header: 'Reference', key: 'reference', width: 16 },
      { header: 'Note', key: 'note', width: 30 },
    ];
    const rows = entries.map((e) => ({
      date: this.stamp(e.createdAt, ctx.clock), shop: e.shop?.name ?? '', customer: e.customer.name, phone: e.customer.phone ?? '',
      type: e.type, amount: e.amount, balance: e.balanceAfter, reference: e.reference ?? '', note: e.note ?? '',
    }));
    return { columns, rows };
  }

  private async movements(ctx: ExportContext) {
    const moves = await this.prisma.stockMovement.findMany({
      where: { tenantId: ctx.user.tenantId, ...ctx.scope.where, ...(ctx.range ? { createdAt: ctx.range } : {}) },
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      select: { createdAt: true, type: true, quantity: true, balanceAfter: true, unitCost: true, reference: true, note: true, product: { select: { name: true, sku: true } }, shop: { select: { name: true } } },
    });
    const columns: Column[] = [
      { header: 'Date', key: 'date', width: 18 },
      { header: 'Branch', key: 'shop', width: 18 },
      { header: 'Product', key: 'product', width: 28 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Balance After', key: 'balance', width: 12 },
      ...(ctx.canSeeCost ? [{ header: 'Unit Cost', key: 'unitCost', width: 12, money: true }] : []),
      { header: 'Reference', key: 'reference', width: 16 },
      { header: 'Note', key: 'note', width: 28 },
    ];
    const rows = moves.map((m) => ({
      date: this.stamp(m.createdAt, ctx.clock), shop: m.shop?.name ?? '', product: m.product.name, sku: m.product.sku ?? '',
      type: m.type, quantity: m.quantity, balance: m.balanceAfter, unitCost: m.unitCost, reference: m.reference ?? '', note: m.note ?? '',
    }));
    return { columns, rows };
  }

  /* ─── helpers ─── */

  private assertCanExport(user: AuthenticatedUser, kind: ExportKind) {
    if (!hasPermission(user.role, user.permissions, KIND_PERMISSION[kind])) {
      throw new ForbiddenException(`${KIND_LABEL[kind]} dekhne ki ijazat nahi — is ki file bhi nahi ban sakti`);
    }
  }

  private async context(user: AuthenticatedUser, scope: ShopScope, q: ExportQueryDto): Promise<ExportContext> {
    const clock = await this.tz.clock(user.tenantId);
    if (q.from && q.to && q.from > q.to) throw new BadRequestException('"Se" tareekh "Tak" se pehle honi chahiye');
    const start = safeDayStart(clock.dayStartHour);
    const at = (key: string, addDays: number) => {
      const [y, m, d] = key.split('-').map(Number);
      return zonedToUtc(y, m, d + addDays, start, 0, 0, clock.tz);
    };
    const range = q.from || q.to
      ? { ...(q.from ? { gte: at(q.from, 0) } : {}), ...(q.to ? { lte: new Date(at(q.to, 1).getTime() - 1) } : {}) }
      : undefined;
    return { user, scope, clock, range, canSeeCost: hasPermission(user.role, user.permissions, PERMISSIONS.COST_VIEW) };
  }

  /** "2026-10-13 21:05" in the shop's own time zone. */
  private stamp(d: Date, clock: BusinessClock) {
    const p = tzParts(d, clock.tz);
    const two = (n: number) => String(n).padStart(2, '0');
    return `${p.year}-${two(p.month)}-${two(p.day)} ${two(p.hour)}:${two(p.minute)}`;
  }

  private async log(ctx: ExportContext, kind: ExportKind, format: 'excel' | 'pdf', rows: number, q: ExportQueryDto) {
    const period = q.from || q.to ? ` · ${q.from ?? '…'} se ${q.to ?? '…'}` : '';
    await this.prisma.activityLog.create({
      data: {
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        action: EXPORT_ACTION,
        entityType: 'export',
        description: `${KIND_LABEL[kind]} ${format === 'pdf' ? 'PDF' : 'Excel'} (${rows} rows)${period}`,
        metadata: { kind, format, rows, from: q.from ?? null, to: q.to ?? null, shopId: ctx.scope.shopId },
      },
    });
  }
}

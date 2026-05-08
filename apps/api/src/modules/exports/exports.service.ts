import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportSalesExcel(user: AuthenticatedUser): Promise<Buffer> {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      orderBy: { soldAt: 'desc' },
      include: {
        customer: true,
        createdBy: { select: { fullName: true } },
        items: { include: { product: true } },
      },
      take: 1000,
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales');

    sheet.columns = [
      { header: 'Sale Number', key: 'saleNumber', width: 20 },
      { header: 'Date', key: 'soldAt', width: 22 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Items', key: 'itemsCount', width: 10 },
      { header: 'Subtotal', key: 'subtotal', width: 14 },
      { header: 'Discount', key: 'discount', width: 12 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Paid', key: 'paidAmount', width: 14 },
      { header: 'Credit', key: 'creditAmount', width: 14 },
      { header: 'Payment', key: 'paymentMethod', width: 14 },
      { header: 'Cashier', key: 'cashier', width: 22 },
    ];

    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C9466' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const sale of sales) {
      sheet.addRow({
        saleNumber: sale.saleNumber,
        soldAt: sale.soldAt,
        customer: sale.customer?.name || 'Walk-in',
        itemsCount: sale.items.length,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        paidAmount: sale.paidAmount,
        creditAmount: sale.creditAmount,
        paymentMethod: sale.paymentMethod,
        cashier: sale.createdBy?.fullName || '—',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async exportProductsExcel(user: AuthenticatedUser): Promise<Buffer> {
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Barcode', key: 'barcode', width: 18 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Price', key: 'price', width: 14 },
      { header: 'Cost Price', key: 'costPrice', width: 14 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Low Alert', key: 'lowStockAlert', width: 12 },
      { header: 'Stock Value', key: 'stockValue', width: 16 },
      { header: 'Active', key: 'isActive', width: 10 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C9466' },
    };

    for (const p of products) {
      sheet.addRow({
        name: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        category: p.category?.name || '',
        unit: p.unit,
        price: p.price,
        costPrice: p.costPrice,
        stock: p.stock,
        lowStockAlert: p.lowStockAlert,
        stockValue: p.stock * p.costPrice,
        isActive: p.isActive ? 'Yes' : 'No',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async exportCustomersExcel(user: AuthenticatedUser): Promise<Buffer> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Customers');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 26 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Balance (Udhaar)', key: 'balance', width: 18 },
      { header: 'Credit Limit', key: 'creditLimit', width: 16 },
      { header: 'Loyalty Points', key: 'loyaltyPoints', width: 16 },
      { header: 'Total Spent', key: 'totalSpent', width: 16 },
      { header: 'Active', key: 'isActive', width: 10 },
      { header: 'Created', key: 'createdAt', width: 22 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C9466' },
    };

    for (const c of customers) {
      sheet.addRow({
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        balance: c.balance,
        creditLimit: c.creditLimit,
        loyaltyPoints: c.loyaltyPoints,
        totalSpent: c.totalSpent,
        isActive: c.isActive ? 'Yes' : 'No',
        createdAt: c.createdAt,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  async exportSalesPdf(user: AuthenticatedUser): Promise<Buffer> {
    const sales = await this.prisma.sale.findMany({
      where: { tenantId: user.tenantId, status: { in: ['COMPLETED', 'PARTIALLY_RETURNED'] } },
      orderBy: { soldAt: 'desc' },
      include: { customer: true },
      take: 100,
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    return new Promise<Buffer>((resolve) => {
      const doc = new (PDFDocument as any)({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(20).fillColor('#0f172a').text('Sales Report', { align: 'center' });
      doc.fontSize(10).fillColor('#64748b').text(tenant?.name || 'Nafaa', { align: 'center' });
      doc.text(new Date().toLocaleString('en-PK'), { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(9).fillColor('#0f172a');

      const tableTop = doc.y;
      const cols = [40, 130, 240, 340, 420, 500];

      doc.font('Helvetica-Bold');
      doc.text('Sale #', cols[0], tableTop);
      doc.text('Date', cols[1], tableTop);
      doc.text('Customer', cols[2], tableTop);
      doc.text('Total', cols[3], tableTop);
      doc.text('Paid', cols[4], tableTop);
      doc.text('Method', cols[5], tableTop);

      doc.moveTo(40, tableTop + 14).lineTo(560, tableTop + 14).stroke('#cbd5e1');
      doc.font('Helvetica');

      let y = tableTop + 20;
      let totalRevenue = 0;

      for (const sale of sales) {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
        doc.text(sale.saleNumber, cols[0], y, { width: 85 });
        doc.text(new Date(sale.soldAt).toLocaleDateString('en-PK'), cols[1], y, { width: 105 });
        doc.text((sale.customer?.name || 'Walk-in').substring(0, 18), cols[2], y, { width: 95 });
        doc.text(`Rs ${sale.total.toFixed(0)}`, cols[3], y, { width: 75 });
        doc.text(`Rs ${sale.paidAmount.toFixed(0)}`, cols[4], y, { width: 75 });
        doc.text(sale.paymentMethod, cols[5], y, { width: 60 });
        totalRevenue += sale.total;
        y += 18;
      }

      doc.moveTo(40, y + 4).lineTo(560, y + 4).stroke('#cbd5e1');
      y += 14;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a');
      doc.text(`Total Revenue: Rs ${totalRevenue.toFixed(0)}`, 40, y);
      doc.text(`Total Sales: ${sales.length}`, 350, y);

      doc.end();
    });
  }
}

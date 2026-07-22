import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FbrPosStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FbrService {
  private readonly logger = new Logger(FbrService.name);
  constructor(private readonly prisma: PrismaService) {}

  async configure(tenantId: string, dto: {
    posId: string; ntn: string; strn?: string; apiToken: string; isSandbox?: boolean;
  }) {
    return this.prisma.fbrConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...dto, isActive: false },
      update: dto,
    });
  }

  async activate(tenantId: string) {
    return this.prisma.fbrConfig.update({ where: { tenantId }, data: { isActive: true } });
  }

  async submitInvoice(tenantId: string, saleId: string) {
    const config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });
    if (!config || !config.isActive) throw new BadRequestException('FBR not configured');

    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: { include: { product: true } }, customer: true, tenant: true },
    });
    if (!sale) throw new NotFoundException();

    const payload = {
      invoiceType: 'Sale Invoice',
      invoiceDate: sale.soldAt.toISOString().slice(0, 10),
      sellerNTNCNIC: config.ntn,
      sellerBusinessName: sale.tenant.name,
      buyerNTNCNIC: sale.customer?.cnic ?? '0000000000000',
      buyerBusinessName: sale.customer?.name ?? 'Walk-in Customer',
      invoiceRefNo: sale.saleNumber,
      items: sale.items.map((i) => ({
        hsCode: '9999.9999',
        productDescription: i.product.name,
        rate: 17,
        uoM: 'PCS',
        quantity: i.quantity,
        totalValues: Number(i.total),
        valueSalesExcludingST: Number(i.total) / 1.17,
        salesTaxApplicable: (Number(i.total) / 1.17) * 0.17,
        salesTaxWithheldAtSource: 0,
        extraTax: 0,
        furtherTax: 0,
        sroScheduleNo: '',
        fedPayable: 0,
        discount: Number(i.total) * 0 / 100,
        saleType: 'Goods at standard rate (default)',
        sroItemSerialNo: '',
      })),
    };

    const log = await this.prisma.fbrInvoiceLog.create({
      data: {
        tenantId, saleId,
        invoiceNumber: sale.saleNumber,
        status: 'PENDING',
        payload,
      },
    });

    try {
      const res = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();

      const isSuccess = res.ok && data.validationResponse?.statusCode === '00';
      await this.prisma.fbrInvoiceLog.update({
        where: { id: log.id },
        data: {
          status: isSuccess ? 'ACKNOWLEDGED' : 'REJECTED',
          response: data,
          fbrInvoiceRef: data.invoiceNumber,
          fbrQrCode: data.qrCode,
          submittedAt: new Date(),
          acknowledgedAt: isSuccess ? new Date() : null,
          errorMessage: isSuccess ? null : (data.validationResponse?.error ?? 'Unknown error'),
        },
      });
      await this.prisma.fbrConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          totalInvoicesSent: { increment: 1 },
          totalRejected: isSuccess ? undefined : { increment: 1 },
        },
      });
      return { success: isSuccess, ...data };
    } catch (e: any) {
      this.logger.error(`FBR submit failed: ${e.message}`);
      await this.prisma.fbrInvoiceLog.update({
        where: { id: log.id },
        data: { status: 'RETRY_REQUIRED', errorMessage: e.message },
      });
      throw new BadRequestException('FBR submission failed: ' + e.message);
    }
  }

  async listLogs(tenantId: string, status?: FbrPosStatus, limit = 50) {
    return this.prisma.fbrInvoiceLog.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async retryFailed(tenantId: string, logId: string) {
    const log = await this.prisma.fbrInvoiceLog.findFirst({
      where: { id: logId, tenantId, status: { in: ['REJECTED', 'RETRY_REQUIRED'] } },
    });
    if (!log || !log.saleId) throw new NotFoundException();
    await this.prisma.fbrInvoiceLog.update({
      where: { id: logId },
      data: { retryCount: { increment: 1 } },
    });
    return this.submitInvoice(tenantId, log.saleId);
  }
}

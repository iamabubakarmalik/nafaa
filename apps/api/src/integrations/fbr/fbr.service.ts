import {
  BadRequestException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  FbrEnvironment, FbrInvoiceStatus, FbrSubmissionMode, Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { encrypt, decrypt } from '../../core/lib/crypto';
import { parseFbrResponse, shouldRetry } from './fbr-errors';
import { UpsertFbrConfigDto } from './dto/fbr-config.dto';

const FBR_ENDPOINTS = {
  SANDBOX: 'https://gw.fbr.gov.pk/imsp/v1/api/inv/postinvoicedata_sb',
  PRODUCTION: 'https://gw.fbr.gov.pk/imsp/v1/api/inv/postinvoicedata',
  VERIFY: 'https://esp.fbr.gov.pk/EsPos/POSVerifyInvoice',
};

@Injectable()
export class FbrService {
  private readonly logger = new Logger(FbrService.name);
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════

  async getConfig(tenantId: string) {
    let config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });
    // Mask token in API response (only last 4 chars visible)
    if (config?.apiToken) {
      const decrypted = decrypt(config.apiToken);
      if (decrypted && decrypted.length > 4) {
        (config as any).apiToken = '••••••••' + decrypted.slice(-4);
      }
    }
    if (!config) {
      config = await this.prisma.fbrConfig.create({
        data: {
          tenantId,
          isEnabled: false,
          submissionMode: 'DISABLED',
          environment: 'SANDBOX',
        },
      });
    }
    const stats = await this.getStats(tenantId);
    return { ...config, stats };
  }

  async upsertConfig(tenantId: string, dto: UpsertFbrConfigDto) {
    const existing = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });

    const data: Prisma.FbrConfigUncheckedUpdateInput = {
      ...dto,
      apiEndpoint: dto.environment
        ? FBR_ENDPOINTS[dto.environment]
        : existing?.apiEndpoint,
    };

    if (dto.isEnabled && (!dto.ntn && !existing?.ntn)) {
      throw new BadRequestException(
        'FBR enable karne ke liye NTN zaroori hai. Pehle iris.fbr.gov.pk se lo.',
      );
    }

    // Encrypt sensitive fields before save (skip masked values)
    if (data.apiToken && typeof data.apiToken === 'string' && !data.apiToken.startsWith('••••')) {
      data.apiToken = encrypt(data.apiToken) ?? data.apiToken;
    }

    if (existing) {
      return this.prisma.fbrConfig.update({
        where: { tenantId },
        data,
      });
    }

    return this.prisma.fbrConfig.create({
      data: {
        tenantId,
        ...dto,
        apiEndpoint: dto.environment ? FBR_ENDPOINTS[dto.environment] : FBR_ENDPOINTS.SANDBOX,
      } as any,
    });
  }

  async testConnection(tenantId: string) {
    const config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('FBR config not found');

    if (!config.ntn || !config.apiToken || !config.posId) {
      return {
        success: false,
        message: 'FBR credentials adhoore hain',
        missing: [
          !config.ntn && 'NTN',
          !config.posId && 'POS ID',
          !config.apiToken && 'API Token',
        ].filter(Boolean),
      };
    }

    const endpoint = config.apiEndpoint ?? FBR_ENDPOINTS[config.environment];

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getDecryptedToken(config)}`,
        },
        body: JSON.stringify({
          test: true,
          posId: config.posId,
        }),
      });

      const ok = res.status < 500;
      if (ok) {
        await this.prisma.fbrConfig.update({
          where: { tenantId },
          data: { isVerified: true, verifiedAt: new Date() },
        });
      }

      return {
        success: ok,
        message: ok
          ? 'FBR se connection ban gaya!'
          : 'FBR server tak nahi pahuncha — credentials check karo',
        statusCode: res.status,
        environment: config.environment,
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'Connection fail: ' + e.message,
      };
    }
  }

  async getStats(tenantId: string) {
    const [submitted, rejected, pending, skipped, recentSum] = await Promise.all([
      this.prisma.fbrInvoice.count({
        where: { tenantId, status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] } },
      }),
      this.prisma.fbrInvoice.count({ where: { tenantId, status: 'REJECTED' } }),
      this.prisma.fbrInvoice.count({
        where: { tenantId, status: { in: ['PENDING', 'RETRY_QUEUED'] } },
      }),
      this.prisma.fbrInvoice.count({ where: { tenantId, status: 'MANUAL_SKIPPED' } }),
      this.prisma.fbrInvoice.aggregate({
        where: {
          tenantId,
          status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] },
          submittedAt: { gte: new Date(Date.now() - 30 * 86400 * 1000) },
        },
        _sum: { totalAmount: true, taxAmount: true },
      }),
    ]);

    return {
      submitted,
      rejected,
      pending,
      skipped,
      last30DaysAmount: Number(recentSum._sum.totalAmount ?? 0),
      last30DaysTax: Number(recentSum._sum.taxAmount ?? 0),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SUBMIT SALE TO FBR (called after sale creation)
  // ═══════════════════════════════════════════════════════════

  async submitSale(tenantId: string, saleId: string, options?: { forceResubmit?: boolean }) {
    const config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });
    if (!config || !config.isEnabled) {
      return { skipped: true, reason: 'FBR disabled for this tenant' };
    }

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: {
        items: { include: { product: true } },
        customer: true,
        tenant: true,
        shop: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    // AUTO_ABOVE_LIMIT check
    if (config.submissionMode === 'AUTO_ABOVE_LIMIT') {
      const threshold = Number(config.autoSubmitThreshold ?? 0);
      if (Number(sale.total) < threshold) {
        return { skipped: true, reason: `Amount below Rs ${threshold} threshold` };
      }
    }

    if (config.submissionMode === 'DISABLED') {
      return { skipped: true, reason: 'Submission mode is DISABLED' };
    }

    // Check existing invoice
    let invoice = await this.prisma.fbrInvoice.findUnique({ where: { saleId } });
    if (invoice && !options?.forceResubmit) {
      if (invoice.status === 'ACKNOWLEDGED' || invoice.status === 'SUBMITTED') {
        return { alreadySubmitted: true, fbrInvoiceNumber: invoice.fbrInvoiceNumber };
      }
    }

    const taxRate = Number(config.defaultTaxRate);
    const totalAmount = Number(sale.total);

    // Sum tax per item (respect per-product rates)
    let taxAmount = 0;
    let netAmount = 0;
    for (const i of sale.items) {
      const itemRate = Number((i.product as any)?.taxRate ?? taxRate);
      const gross = Number(i.total);
      const net = gross / (1 + itemRate / 100);
      taxAmount += gross - net;
      netAmount += net;
    }
    // Fallback if no items
    if (netAmount === 0) {
      netAmount = totalAmount;
      taxAmount = 0;
    }

    const payload = {
      invoiceType: 'Sale Invoice',
      invoiceDate: sale.soldAt.toISOString().slice(0, 10),
      sellerNTNCNIC: config.ntn,
      sellerBusinessName: config.businessName ?? sale.tenant.name,
      sellerProvince: config.province ?? 'PUNJAB',
      sellerAddress: config.businessAddress ?? '',
      buyerNTNCNIC: sale.customer?.ntn ?? sale.customer?.cnic ?? '0000000000000',
      buyerBusinessName: sale.customer?.name ?? 'Walk-in Customer',
      buyerProvince: sale.customer?.city ?? 'PUNJAB',
      buyerAddress: sale.customer?.address ?? '',
      buyerRegistrationType: sale.customer?.isRegistered ? 'Registered' : 'Unregistered',
      invoiceRefNo: sale.saleNumber,
      scenarioId: config.environment === 'SANDBOX' ? 'SN019' : null,
      items: sale.items.map((i) => {
        const itemRate = Number((i.product as any)?.taxRate ?? taxRate);
        const hs = (i.product as any)?.hsCode ?? '9999.9999';
        const category = (i.product as any)?.taxCategory ?? 'Goods at standard rate (default)';
        const gross = Number(i.total);
        const net = gross / (1 + itemRate / 100);
        const tax = gross - net;
        return {
          hsCode: hs,
          productDescription: i.product?.name ?? 'Item',
          rate: `${itemRate}%`,
          uoM: 'PCS',
          quantity: i.quantity,
          totalValues: gross,
          valueSalesExcludingST: net,
          salesTaxApplicable: tax,
          salesTaxWithheldAtSource: 0,
          extraTax: 0,
          furtherTax: 0,
          sroScheduleNo: '',
          fedPayable: 0,
          discount: 0,
          saleType: category,
          sroItemSerialNo: '',
        };
      }),
    };

    if (!invoice) {
      invoice = await this.prisma.fbrInvoice.create({
        data: {
          tenantId,
          configId: config.id,
          saleId,
          invoiceNumber: sale.saleNumber,
          status: 'SUBMITTING',
          totalAmount,
          taxAmount,
          netAmount,
          taxRate,
          requestPayload: payload as any,
        },
      });
    } else {
      await this.prisma.fbrInvoice.update({
        where: { id: invoice.id },
        data: { status: 'SUBMITTING', requestPayload: payload as any, retryCount: { increment: 1 } },
      });
    }

    const endpoint = config.apiEndpoint ?? FBR_ENDPOINTS[config.environment];

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getDecryptedToken(config)}`,
        },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json().catch(() => ({}));
      const parsed = parseFbrResponse(data);
      const success = parsed.success;

      // Retry logic — set nextRetryAt if error is retriable
      let nextRetryAt: Date | null = null;
      let newStatus: any = success ? 'ACKNOWLEDGED' : 'REJECTED';

      if (!success && parsed.errorInfo?.retriable && invoice.retryCount < 5) {
        newStatus = 'RETRY_QUEUED';
        const backoff = [5, 15, 60, 360, 1440][invoice.retryCount] ?? 1440;
        nextRetryAt = new Date(Date.now() + backoff * 60 * 1000);
      }

      const updated = await this.prisma.fbrInvoice.update({
        where: { id: invoice.id },
        data: {
          status: newStatus,
          fbrInvoiceNumber: parsed.invoiceNumber ?? null,
          fbrQrCode: parsed.qrCode ?? null,
          fbrVerificationUrl: parsed.invoiceNumber
            ? `${FBR_ENDPOINTS.VERIFY}?InvoiceNumber=${parsed.invoiceNumber}`
            : null,
          responsePayload: data,
          errorMessage: success ? null : (parsed.errorInfo?.userMessage ?? 'Unknown error'),
          nextRetryAt,
          submittedAt: new Date(),
          acknowledgedAt: success ? new Date() : null,
        },
      });

      await this.prisma.fbrConfig.update({
        where: { tenantId },
        data: {
          lastSubmissionAt: new Date(),
          ...(success
            ? { totalSubmitted: { increment: 1 } }
            : { totalRejected: { increment: 1 } }),
        },
      });

      this.logger.log(
        success
          ? `✅ FBR: ${sale.saleNumber} → ${data.invoiceNumber}`
          : `❌ FBR reject: ${sale.saleNumber} — ${updated.errorMessage}`,
      );

      return {
        success,
        fbrInvoiceNumber: data.invoiceNumber,
        qrCode: data.qrCode,
        errorMessage: updated.errorMessage,
      };
    } catch (e: any) {
      await this.prisma.fbrInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'RETRY_QUEUED',
          errorMessage: e.message,
          nextRetryAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });
      this.logger.error(`FBR submit failed: ${e.message}`);
      throw new BadRequestException('FBR submit failed: ' + e.message);
    }
  }

  async skipSale(tenantId: string, saleId: string, reason: string, userId?: string) {
    const config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });
    if (!config) throw new NotFoundException('FBR config not found');

    const sale = await this.prisma.sale.findFirst({ where: { id: saleId, tenantId } });
    if (!sale) throw new NotFoundException('Sale not found');

    const existing = await this.prisma.fbrInvoice.findUnique({ where: { saleId } });
    if (existing && existing.status === 'ACKNOWLEDGED') {
      throw new BadRequestException('Sale is already submitted, cannot skip');
    }

    await this.prisma.fbrConfig.update({
      where: { tenantId },
      data: { totalSkipped: { increment: 1 } },
    });

    if (existing) {
      return this.prisma.fbrInvoice.update({
        where: { id: existing.id },
        data: {
          status: 'MANUAL_SKIPPED',
          skippedReason: reason,
          skippedBy: userId,
        },
      });
    }

    return this.prisma.fbrInvoice.create({
      data: {
        tenantId,
        configId: config.id,
        saleId,
        invoiceNumber: sale.saleNumber,
        status: 'MANUAL_SKIPPED',
        totalAmount: sale.total,
        taxAmount: 0,
        netAmount: sale.total,
        taxRate: Number(config.defaultTaxRate),
        requestPayload: {} as any,
        skippedReason: reason,
        skippedBy: userId,
      },
    });
  }

  async retryPending(tenantId: string) {
    const pending = await this.prisma.fbrInvoice.findMany({
      where: {
        tenantId,
        status: { in: ['RETRY_QUEUED', 'REJECTED'] },
        retryCount: { lt: 5 },
      },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    const results: Array<{ saleId: string; success: boolean; error?: string }> = [];
    for (const inv of pending) {
      try {
        const result = await this.submitSale(tenantId, inv.saleId, { forceResubmit: true });
        results.push({ saleId: inv.saleId, success: !!result.success });
      } catch (e: any) {
        results.push({ saleId: inv.saleId, success: false, error: e.message });
      }
    }
    return { retried: pending.length, results };
  }

  async listInvoices(tenantId: string, params: {
    status?: FbrInvoiceStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.FbrInvoiceWhereInput = { tenantId };
    if (params.status) where.status = params.status;
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.fbrInvoice.findMany({
        where,
        take: params.limit ?? 50,
        skip: params.offset ?? 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.fbrInvoice.count({ where }),
    ]);
    return { items, total };
  }

  async getInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.fbrInvoice.findFirst({
      where: { id: invoiceId, tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async monthlyReport(tenantId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const invoices = await this.prisma.fbrInvoice.findMany({
      where: {
        tenantId,
        status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] },
        submittedAt: { gte: start, lte: end },
      },
      orderBy: { submittedAt: 'asc' },
    });

    const totalNet = invoices.reduce((s, i) => s + Number(i.netAmount), 0);
    const totalTax = invoices.reduce((s, i) => s + Number(i.taxAmount), 0);
    const totalGross = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      totalInvoices: invoices.length,
      totalNet,
      totalTax,
      totalGross,
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        fbrInvoiceNumber: i.fbrInvoiceNumber,
        submittedAt: i.submittedAt,
        totalAmount: Number(i.totalAmount),
        taxAmount: Number(i.taxAmount),
        netAmount: Number(i.netAmount),
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // SALE-LEVEL FBR STATUS (POS / sale detail page ke liye)
  // ═══════════════════════════════════════════════════════════

  async getSaleFbrStatus(tenantId: string, saleId: string) {
    const config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });

    if (!config || !config.isEnabled) {
      return {
        fbrEnabled: false,
        mode: 'DISABLED',
        invoice: null,
        canSubmit: false,
        canSkip: false,
        message: 'FBR integration off hai',
      };
    }

    const invoice = await this.prisma.fbrInvoice.findUnique({ where: { saleId } });

    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      select: { total: true, saleNumber: true },
    });

    const threshold = Number(config.autoSubmitThreshold ?? 0);
    const belowThreshold =
      config.submissionMode === 'AUTO_ABOVE_LIMIT' &&
      sale &&
      Number(sale.total) < threshold;

    const isFinal =
      invoice?.status === 'ACKNOWLEDGED' || invoice?.status === 'SUBMITTED';

    return {
      fbrEnabled: true,
      mode: config.submissionMode,
      environment: config.environment,
      taxRate: Number(config.defaultTaxRate),
      askBeforeSubmit: config.askBeforeSubmit,
      printQrOnReceipt: config.printQrOnReceipt,
      printFbrLogo: config.printFbrLogo,
      belowThreshold,
      threshold: threshold || null,
      invoice: invoice
        ? {
            id: invoice.id,
            status: invoice.status,
            fbrInvoiceNumber: invoice.fbrInvoiceNumber,
            fbrQrCode: invoice.fbrQrCode,
            fbrVerificationUrl: invoice.fbrVerificationUrl,
            totalAmount: Number(invoice.totalAmount),
            taxAmount: Number(invoice.taxAmount),
            netAmount: Number(invoice.netAmount),
            errorMessage: invoice.errorMessage,
            retryCount: invoice.retryCount,
            submittedAt: invoice.submittedAt,
            skippedReason: invoice.skippedReason,
          }
        : null,
      canSubmit: !isFinal,
      canSkip: !isFinal && !invoice?.skippedReason,
    };
  }

  /**
   * Sale creation ke baad call hota hai — mode ke hisaab se decide karta hai
   * ki auto submit karna hai ya nahi. NEVER throws — sale kabhi fail nahi hogi.
   */
  async maybeAutoSubmit(tenantId: string, saleId: string) {
    try {
      const config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });
      if (!config || !config.isEnabled) return { skipped: true, reason: 'disabled' };

      if (config.submissionMode === 'DISABLED' || config.submissionMode === 'MANUAL') {
        return { skipped: true, reason: 'manual mode' };
      }

      if (config.submissionMode === 'AUTO_ABOVE_LIMIT') {
        const sale = await this.prisma.sale.findUnique({
          where: { id: saleId },
          select: { total: true },
        });
        const threshold = Number(config.autoSubmitThreshold ?? 0);
        if (!sale || Number(sale.total) < threshold) {
          return { skipped: true, reason: 'below threshold' };
        }
      }

      const result = await this.submitSale(tenantId, saleId);
      return result;
    } catch (e: any) {
      this.logger.warn(`FBR auto-submit failed (non-blocking): ${e.message}`);
      return { skipped: true, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // AUTO RETRY CRON — Har 5 minute chalti hai
  // Exponential backoff: 5m → 15m → 1h → 6h → 24h
  // ═══════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRetryQueue() {
    const now = new Date();
    const toRetry = await this.prisma.fbrInvoice.findMany({
      where: {
        status: { in: ['RETRY_QUEUED', 'REJECTED'] },
        retryCount: { lt: 5 },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    if (toRetry.length === 0) return;

    this.logger.log(`🔄 FBR retry cron: ${toRetry.length} invoices to retry`);

    for (const inv of toRetry) {
      try {
        const result = await this.submitSale(inv.tenantId, inv.saleId, { forceResubmit: true });
        if (!result.success) {
          // Set exponential backoff
          const backoffMinutes = [5, 15, 60, 360, 1440][inv.retryCount] ?? 1440;
          await this.prisma.fbrInvoice.update({
            where: { id: inv.id },
            data: { nextRetryAt: new Date(Date.now() + backoffMinutes * 60 * 1000) },
          });
        }
      } catch (e: any) {
        this.logger.warn(`Retry failed for ${inv.saleId}: ${e.message}`);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // CANCEL INVOICE — sale void ya return hone pe
  // ═══════════════════════════════════════════════════════════

  async cancelInvoice(tenantId: string, saleId: string, reason: string) {
    const invoice = await this.prisma.fbrInvoice.findUnique({ where: { saleId } });
    if (!invoice) {
      return { skipped: true, message: 'No FBR invoice for this sale' };
    }

    if (invoice.status === 'CANCELLED') {
      return { alreadyCancelled: true };
    }

    // Agar submitted nahi hui, sirf status update
    if (invoice.status !== 'ACKNOWLEDGED' && invoice.status !== 'SUBMITTED') {
      await this.prisma.fbrInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'CANCELLED',
          skippedReason: `Sale voided: ${reason}`,
        },
      });
      return { success: true, message: 'Local invoice cancelled' };
    }

    // FBR ko cancellation notice bhejo
    const config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });
    if (!config) return { skipped: true };

    const cancelPayload = {
      invoiceType: 'Debit Note',
      originalInvoiceNumber: invoice.fbrInvoiceNumber,
      invoiceRefNo: `CANCEL-${invoice.invoiceNumber}`,
      cancellationReason: reason,
      cancellationDate: new Date().toISOString().slice(0, 10),
    };

    try {
      const endpoint = config.apiEndpoint ?? 'https://gw.fbr.gov.pk/imsp/v1/api/inv/postinvoicedata_sb';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getDecryptedToken(config)}`,
        },
        body: JSON.stringify(cancelPayload),
      });
      const data: any = await res.json().catch(() => ({}));

      await this.prisma.fbrInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'CANCELLED',
          skippedReason: `Sale voided: ${reason}`,
          responsePayload: data,
        },
      });

      this.logger.log(`✅ FBR cancelled: ${invoice.fbrInvoiceNumber}`);
      return { success: true, message: 'FBR notified of cancellation' };
    } catch (e: any) {
      this.logger.warn(`FBR cancel failed (non-blocking): ${e.message}`);
      // Void continues even if FBR cancel fails
      await this.prisma.fbrInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'CANCELLED',
          skippedReason: `Sale voided: ${reason} (FBR notify failed)`,
          errorMessage: e.message,
        },
      });
      return { success: false, message: 'Local cancel done, FBR notify failed' };
    }
  }

  /** Returns decrypted apiToken safe to use in HTTP calls */
  private getDecryptedToken(config: any): string | null {
    return decrypt(config?.apiToken);
  }

  // ═══════════════════════════════════════════════════════════
  // BULK SUBMIT — multiple sales at once
  // ═══════════════════════════════════════════════════════════

  async bulkSubmit(tenantId: string, params: {
    saleIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    onlyPending?: boolean;
  }) {
    let saleIds = params.saleIds ?? [];

    // If date range provided, fetch matching sales
    if (!saleIds.length && (params.dateFrom || params.dateTo)) {
      const where: any = { tenantId, status: 'COMPLETED' };
      if (params.dateFrom || params.dateTo) {
        where.soldAt = {};
        if (params.dateFrom) where.soldAt.gte = new Date(params.dateFrom);
        if (params.dateTo) where.soldAt.lte = new Date(params.dateTo);
      }

      const sales = await this.prisma.sale.findMany({
        where,
        select: { id: true },
        take: 500,
      });
      saleIds = sales.map((s) => s.id);
    }

    // Filter to only sales without FBR invoice (or failed ones) if requested
    if (params.onlyPending) {
      const existing = await this.prisma.fbrInvoice.findMany({
        where: {
          saleId: { in: saleIds },
          status: { in: ['ACKNOWLEDGED', 'SUBMITTED'] },
        },
        select: { saleId: true },
      });
      const doneIds = new Set(existing.map((i) => i.saleId));
      saleIds = saleIds.filter((id) => !doneIds.has(id));
    }

    const results: Array<{ saleId: string; success: boolean; error?: string }> = [];
    for (const saleId of saleIds) {
      try {
        const r = await this.submitSale(tenantId, saleId);
        results.push({ saleId, success: !!(r as any).success });
      } catch (e: any) {
        results.push({ saleId, success: false, error: e.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
      results,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CREDIT NOTE — Return/refund pe FBR ko batao
  // ═══════════════════════════════════════════════════════════

  async submitCreditNote(tenantId: string, returnId: string) {
    const config = await this.prisma.fbrConfig.findUnique({ where: { tenantId } });
    if (!config || !config.isEnabled) {
      return { skipped: true, reason: 'FBR disabled' };
    }

    const saleReturn = await this.prisma.saleReturn.findFirst({
      where: { id: returnId, tenantId },
      include: {
        sale: { include: { items: { include: { product: true } }, customer: true } },
        items: { include: { product: true } },
      },
    }).catch(() => null);

    if (!saleReturn) return { skipped: true, reason: 'Return not found' };

    const originalInvoice = await this.prisma.fbrInvoice.findUnique({
      where: { saleId: saleReturn.sale.id },
    });

    if (!originalInvoice?.fbrInvoiceNumber) {
      return { skipped: true, reason: 'Original sale not submitted to FBR' };
    }

    const taxRate = Number(config.defaultTaxRate);
    const returnTotal = Number((saleReturn as any).total ?? 0);

    const payload = {
      invoiceType: 'Credit Note',
      invoiceRefNo: `CN-${originalInvoice.invoiceNumber}`,
      originalInvoiceNumber: originalInvoice.fbrInvoiceNumber,
      invoiceDate: new Date().toISOString().slice(0, 10),
      sellerNTNCNIC: config.ntn,
      sellerBusinessName: config.businessName ?? '',
      sellerProvince: config.province ?? 'PUNJAB',
      buyerNTNCNIC: saleReturn.sale.customer?.ntn ?? saleReturn.sale.customer?.cnic ?? '0000000000000',
      buyerBusinessName: saleReturn.sale.customer?.name ?? 'Walk-in',
      buyerRegistrationType: saleReturn.sale.customer?.isRegistered ? 'Registered' : 'Unregistered',
      items: (saleReturn as any).items.map((i: any) => ({
        hsCode: i.product?.hsCode ?? '9999.9999',
        productDescription: i.product?.name ?? 'Item',
        rate: `${taxRate}%`,
        uoM: 'PCS',
        quantity: -Math.abs(Number(i.quantity)),
        totalValues: -Math.abs(Number(i.total)),
        valueSalesExcludingST: -Math.abs(Number(i.total) / (1 + taxRate / 100)),
        salesTaxApplicable: -Math.abs((Number(i.total) / (1 + taxRate / 100)) * (taxRate / 100)),
        salesTaxWithheldAtSource: 0,
        extraTax: 0, furtherTax: 0, fedPayable: 0, discount: 0,
        sroScheduleNo: '', sroItemSerialNo: '',
        saleType: 'Goods at standard rate (default)',
      })),
    };

    try {
      const endpoint = config.apiEndpoint ?? 'https://gw.fbr.gov.pk/imsp/v1/api/inv/postinvoicedata_sb';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getDecryptedToken(config)}`,
        },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json().catch(() => ({}));
      const success = data.invoiceNumber || data.validationResponse?.statusCode === '00';

      this.logger.log(success
        ? `✅ FBR Credit Note: ${originalInvoice.fbrInvoiceNumber} → ${data.invoiceNumber}`
        : `❌ FBR Credit Note failed: ${JSON.stringify(data)}`);

      return {
        success,
        creditNoteNumber: data.invoiceNumber,
        error: success ? null : (data.validationResponse?.error ?? 'Unknown'),
      };
    } catch (e: any) {
      this.logger.warn(`Credit note failed (non-blocking): ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ANALYTICS — 12 month trends + rejection rate + top categories
  // ═══════════════════════════════════════════════════════════

  async getAnalytics(tenantId: string) {
    const now = new Date();
    const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const invoices = await this.prisma.fbrInvoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: yearAgo },
      },
      select: {
        status: true,
        totalAmount: true,
        taxAmount: true,
        netAmount: true,
        submittedAt: true,
        createdAt: true,
        errorMessage: true,
      },
    });

    // Monthly trend (12 months)
    const monthlyMap: Record<string, { period: string; gross: number; tax: number; count: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { period: key, gross: 0, tax: 0, count: 0 };
    }
    for (const inv of invoices) {
      if (inv.status !== 'ACKNOWLEDGED' && inv.status !== 'SUBMITTED') continue;
      const d = inv.submittedAt ?? inv.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key]) {
        monthlyMap[key].gross += Number(inv.totalAmount);
        monthlyMap[key].tax += Number(inv.taxAmount);
        monthlyMap[key].count += 1;
      }
    }
    const monthlyTrend = Object.values(monthlyMap).reverse();

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const inv of invoices) {
      statusCounts[inv.status] = (statusCounts[inv.status] ?? 0) + 1;
    }

    // Rejection rate
    const submitted = (statusCounts['ACKNOWLEDGED'] ?? 0) + (statusCounts['SUBMITTED'] ?? 0);
    const rejected = statusCounts['REJECTED'] ?? 0;
    const rejectionRate = submitted + rejected > 0
      ? (rejected / (submitted + rejected)) * 100
      : 0;

    // Top error messages
    const errorCounts: Record<string, number> = {};
    for (const inv of invoices) {
      if (inv.status === 'REJECTED' && inv.errorMessage) {
        const key = inv.errorMessage.slice(0, 100);
        errorCounts[key] = (errorCounts[key] ?? 0) + 1;
      }
    }
    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    // Today vs yesterday
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400_000);
    const todayInvoices = invoices.filter((i) => {
      const d = i.submittedAt ?? i.createdAt;
      return d >= startOfToday && (i.status === 'ACKNOWLEDGED' || i.status === 'SUBMITTED');
    });
    const yesterdayInvoices = invoices.filter((i) => {
      const d = i.submittedAt ?? i.createdAt;
      return d >= startOfYesterday && d < startOfToday && (i.status === 'ACKNOWLEDGED' || i.status === 'SUBMITTED');
    });

    return {
      monthlyTrend,
      statusCounts,
      rejectionRate: Math.round(rejectionRate * 100) / 100,
      totalSubmitted: submitted,
      totalRejected: rejected,
      totalPending: (statusCounts['PENDING'] ?? 0) + (statusCounts['RETRY_QUEUED'] ?? 0),
      totalSkipped: statusCounts['MANUAL_SKIPPED'] ?? 0,
      topErrors,
      today: {
        count: todayInvoices.length,
        gross: todayInvoices.reduce((s, i) => s + Number(i.totalAmount), 0),
        tax: todayInvoices.reduce((s, i) => s + Number(i.taxAmount), 0),
      },
      yesterday: {
        count: yesterdayInvoices.length,
        gross: yesterdayInvoices.reduce((s, i) => s + Number(i.totalAmount), 0),
        tax: yesterdayInvoices.reduce((s, i) => s + Number(i.taxAmount), 0),
      },
    };
  }
}

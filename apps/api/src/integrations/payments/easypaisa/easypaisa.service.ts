import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InitiateEasypaisaDto } from './dto/initiate-easypaisa.dto';
import { VerifyEasypaisaDto } from './dto/verify-easypaisa.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';

/**
 * Easypaisa Payment Gateway integration (Telenor Microfinance Bank)
 *
 * Env vars required:
 *   EASYPAISA_STORE_ID
 *   EASYPAISA_HASH_KEY
 *   EASYPAISA_BASE_URL
 *   EASYPAISA_RETURN_URL
 */
@Injectable()
export class EasypaisaService {
  private readonly logger = new Logger(EasypaisaService.name);
  private readonly storeId: string;
  private readonly hashKey: string;
  private readonly baseUrl: string;
  private readonly returnUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
  ) {
    this.storeId = config.get<string>('EASYPAISA_STORE_ID') ?? '';
    this.hashKey = config.get<string>('EASYPAISA_HASH_KEY') ?? '';
    this.baseUrl = config.get<string>('EASYPAISA_BASE_URL') ??
      'https://easypaystg.easypaisa.com.pk/easypay-service/rest/v4';
    this.returnUrl = config.get<string>('EASYPAISA_RETURN_URL') ??
      'https://api.nafaa.pk/integrations/payments/easypaisa/callback';
  }

  // ═══════════════════════════════════════════════════════════
  // INITIATE
  // ═══════════════════════════════════════════════════════════

  async initiate(dto: InitiateEasypaisaDto, customerId: string) {
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { id: dto.orderId, customerId },
    });
    if (!order) throw new BadRequestException('Order not found');
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Order already paid');
    }
    if (Number(order.total) !== dto.amount) {
      throw new BadRequestException('Amount mismatch');
    }

    const orderRefNum = `EP${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const expiryDate = this.formatDate(new Date(Date.now() + 60 * 60 * 1000));

    if (dto.paymentMethod === 'MA') {
      if (!dto.mobileAccountNo) {
        throw new BadRequestException('mobileAccountNo required for MA');
      }
      return this.initiateMobileAccount(order, orderRefNum, dto, expiryDate);
    }

    // OTC (voucher)
    return this.initiateOtc(order, orderRefNum, dto, expiryDate);
  }

  private async initiateMobileAccount(order: any, orderRefNum: string, dto: InitiateEasypaisaDto, expiryDate: string) {
    const payload: Record<string, string> = {
      orderId: orderRefNum,
      storeId: this.storeId,
      transactionAmount: dto.amount.toFixed(2),
      transactionType: 'MA',
      mobileAccountNo: dto.mobileAccountNo!,
      emailAddress: dto.email ?? '',
    };
    payload.hashKey = this.buildHash(payload);

    try {
      const res = await fetch(`${this.baseUrl}/initiate-ma-transaction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Credentials: this.hashKey },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();

      const isSuccess = data.responseCode === '0000';
      if (isSuccess) {
        await this.prisma.marketplaceOrder.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            paymentGatewayRef: orderRefNum,
            paidAt: new Date(),
          },
        });
        this.rt.emitOrderUpdate(order.id, { paymentStatus: 'PAID' });
      }

      return { success: isSuccess, orderRefNum, ...data };
    } catch (e: any) {
      this.logger.error(`Easypaisa MA failed: ${e.message}`);
      throw new BadRequestException('Payment error: ' + e.message);
    }
  }

  private async initiateOtc(order: any, orderRefNum: string, dto: InitiateEasypaisaDto, expiryDate: string) {
    const payload: Record<string, string> = {
      orderId: orderRefNum,
      storeId: this.storeId,
      transactionAmount: dto.amount.toFixed(2),
      transactionType: 'OTC',
      mobileNumber: dto.mobileAccountNo ?? '',
      emailAddress: dto.email ?? '',
      expiryDate,
    };
    payload.hashKey = this.buildHash(payload);

    try {
      const res = await fetch(`${this.baseUrl}/initiate-transaction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Credentials: this.hashKey },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();

      // OTC returns a voucher number that customer pays at any easypaisa outlet
      return {
        success: data.responseCode === '0000',
        orderRefNum,
        voucherNumber: data.paymentToken,
        expiryDate,
        instructions: 'Kisi bhi Easypaisa dukaan pe ye voucher number bataayen aur payment karain',
        ...data,
      };
    } catch (e: any) {
      this.logger.error(`Easypaisa OTC failed: ${e.message}`);
      throw new BadRequestException('Payment error: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VERIFY
  // ═══════════════════════════════════════════════════════════

  async verify(dto: VerifyEasypaisaDto) {
    const payload: Record<string, string> = {
      orderId: dto.orderRefNum,
      storeId: this.storeId,
    };
    payload.hashKey = this.buildHash(payload);

    try {
      const res = await fetch(`${this.baseUrl}/inquire-transaction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Credentials: this.hashKey },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();
      return { success: data.responseCode === '0000', ...data };
    } catch (e: any) {
      this.logger.error(`Easypaisa verify failed: ${e.message}`);
      throw new BadRequestException('Verify failed: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // WEBHOOK CALLBACK
  // ═══════════════════════════════════════════════════════════

  async handleWebhook(payload: any) {
    this.logger.log(`Easypaisa webhook: ${JSON.stringify(payload)}`);
    const orderRefNum = payload.orderId;
    const responseCode = payload.responseCode ?? payload.status;
    const isSuccess = responseCode === '0000' || responseCode === 'PAID';

    // Find order by paymentGatewayRef
    const order = await this.prisma.marketplaceOrder.findFirst({
      where: { paymentGatewayRef: orderRefNum },
    });

    if (order && isSuccess && order.paymentStatus !== 'PAID') {
      await this.prisma.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
        },
      });
      this.rt.emitOrderUpdate(order.id, { paymentStatus: 'PAID' });
    }
    return { received: true };
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private buildHash(payload: Record<string, string>): string {
    const sortedKeys = Object.keys(payload).sort();
    const paramString = sortedKeys
      .filter((k) => k !== 'hashKey')
      .map((k) => `${k}=${payload[k]}`)
      .join('&');
    return crypto
      .createHmac('sha256', this.hashKey)
      .update(paramString)
      .digest('base64');
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear() + '-' +
      pad(date.getMonth() + 1) + '-' +
      pad(date.getDate()) + 'T' +
      pad(date.getHours()) + ':' +
      pad(date.getMinutes()) + ':' +
      pad(date.getSeconds())
    );
  }
}

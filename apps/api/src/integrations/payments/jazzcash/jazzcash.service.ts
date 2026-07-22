import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InitiateJazzCashDto } from './dto/initiate-payment.dto';
import { VerifyJazzCashDto } from './dto/verify-payment.dto';
import { RefundJazzCashDto } from './dto/refund.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../../core/realtime/realtime.service';

/**
 * JazzCash Payment Gateway integration.
 * Docs: https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantpayment
 *
 * Env vars required:
 *   JAZZCASH_MERCHANT_ID
 *   JAZZCASH_PASSWORD
 *   JAZZCASH_INTEGRITY_SALT
 *   JAZZCASH_BASE_URL   (sandbox or prod)
 *   JAZZCASH_RETURN_URL
 */
@Injectable()
export class JazzCashService {
  private readonly logger = new Logger(JazzCashService.name);
  private readonly merchantId: string;
  private readonly password: string;
  private readonly salt: string;
  private readonly baseUrl: string;
  private readonly returnUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly rt: RealtimeService,
  ) {
    this.merchantId = config.get<string>('JAZZCASH_MERCHANT_ID') ?? '';
    this.password = config.get<string>('JAZZCASH_PASSWORD') ?? '';
    this.salt = config.get<string>('JAZZCASH_INTEGRITY_SALT') ?? '';
    this.baseUrl = config.get<string>('JAZZCASH_BASE_URL') ??
      'https://sandbox.jazzcash.com.pk/ApplicationAPI/API';
    this.returnUrl = config.get<string>('JAZZCASH_RETURN_URL') ??
      'https://api.nafaa.pk/integrations/payments/jazzcash/callback';
  }

  // ═══════════════════════════════════════════════════════════
  // INITIATE PAYMENT
  // ═══════════════════════════════════════════════════════════

  async initiate(dto: InitiateJazzCashDto, customerId: string) {
    // Verify order belongs to customer
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

    const now = new Date();
    const txnDateTime = this.formatDate(now);
    const expiryDateTime = this.formatDate(new Date(now.getTime() + 60 * 60 * 1000));
    const txnRefNo = `T${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const amountPaisa = Math.round(dto.amount * 100).toString(); // amount in paisa

    // Build payload based on payment type
    let payload: Record<string, string> = {
      pp_Version: '1.1',
      pp_TxnType: 'MWALLET',
      pp_Language: 'EN',
      pp_MerchantID: this.merchantId,
      pp_SubMerchantID: '',
      pp_Password: this.password,
      pp_BankID: '',
      pp_ProductID: '',
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amountPaisa,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: order.orderNumber,
      pp_Description: dto.description ?? `Order ${order.orderNumber}`,
      pp_TxnExpiryDateTime: expiryDateTime,
      pp_ReturnURL: dto.returnUrl ?? this.returnUrl,
      ppmpf_1: order.id,
      ppmpf_2: customerId,
      ppmpf_3: '',
      ppmpf_4: '',
      ppmpf_5: '',
    };

    if (dto.paymentType === 'WALLET') {
      if (!dto.mobileNumber || !dto.cnic) {
        throw new BadRequestException('mobileNumber & cnic required for WALLET');
      }
      payload.pp_MobileNumber = dto.mobileNumber;
      payload.pp_CNIC = dto.cnic;
      payload.pp_TxnType = 'MWALLET';
    } else if (dto.paymentType === 'CARD') {
      payload.pp_TxnType = 'MPAY';
    } else {
      payload.pp_TxnType = 'MPAY';
    }

    // Build secure hash
    payload.pp_SecureHash = this.buildSecureHash(payload);

    // For WALLET → server-to-server API call
    // For CARD/VOUCHER → return HTML form for browser redirect
    if (dto.paymentType === 'WALLET') {
      return this.callWalletApi(payload, order.id);
    }

    // Return form data for browser redirect (checkout page will auto-submit)
    return {
      method: 'REDIRECT',
      url: `${this.baseUrl}/Purchase/DoTransaction`,
      fields: payload,
      txnRefNo,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // WALLET API CALL (Mobile Account)
  // ═══════════════════════════════════════════════════════════

  private async callWalletApi(payload: Record<string, string>, orderId: string) {
    try {
      const res = await fetch(`${this.baseUrl}/Purchase/DoMWalletTransaction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();

      const responseCode = data.pp_ResponseCode;
      const responseMessage = data.pp_ResponseMessage;
      const txnRefNo = data.pp_TxnRefNo ?? payload.pp_TxnRefNo;

      const isSuccess = responseCode === '000' || responseCode === '121';

      // Update order
      if (isSuccess) {
        await this.prisma.marketplaceOrder.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            paymentGatewayRef: txnRefNo,
            paidAt: new Date(),
          },
        });
        this.rt.emitOrderUpdate(orderId, { paymentStatus: 'PAID' });
      }

      return {
        success: isSuccess,
        responseCode, responseMessage, txnRefNo,
        rawResponse: data,
      };
    } catch (e: any) {
      this.logger.error(`JazzCash wallet API failed: ${e.message}`);
      throw new BadRequestException('Payment gateway error: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VERIFY / STATUS INQUIRY
  // ═══════════════════════════════════════════════════════════

  async verify(dto: VerifyJazzCashDto) {
    const payload: Record<string, string> = {
      pp_MerchantID: this.merchantId,
      pp_Password: this.password,
      pp_TxnRefNo: dto.txnRefNo,
    };
    payload.pp_SecureHash = this.buildSecureHash(payload);

    try {
      const res = await fetch(`${this.baseUrl}/PaymentInquiry/Inquire/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();
      const isSuccess = data.pp_ResponseCode === '000';

      // If success + orderId provided → update order
      if (isSuccess && dto.orderId) {
        const order = await this.prisma.marketplaceOrder.findUnique({
          where: { id: dto.orderId },
        });
        if (order && order.paymentStatus !== 'PAID') {
          await this.prisma.marketplaceOrder.update({
            where: { id: dto.orderId },
            data: {
              paymentStatus: 'PAID',
              paymentGatewayRef: dto.txnRefNo,
              paidAt: new Date(),
            },
          });
          this.rt.emitOrderUpdate(dto.orderId, { paymentStatus: 'PAID' });
        }
      }

      return { success: isSuccess, ...data };
    } catch (e: any) {
      this.logger.error(`JazzCash verify failed: ${e.message}`);
      throw new BadRequestException('Verify failed: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HANDLE CALLBACK (from browser redirect)
  // ═══════════════════════════════════════════════════════════

  async handleCallback(payload: Record<string, string>) {
    // Verify hash first
    const receivedHash = payload.pp_SecureHash;
    delete payload.pp_SecureHash;
    const expectedHash = this.buildSecureHash(payload);

    if (receivedHash !== expectedHash) {
      this.logger.warn('JazzCash callback hash mismatch');
      throw new BadRequestException('Invalid signature');
    }

    const responseCode = payload.pp_ResponseCode;
    const txnRefNo = payload.pp_TxnRefNo;
    const orderId = payload.ppmpf_1;
    const isSuccess = responseCode === '000' || responseCode === '121';

    if (isSuccess && orderId) {
      const order = await this.prisma.marketplaceOrder.findUnique({
        where: { id: orderId },
      });
      if (order && order.paymentStatus !== 'PAID') {
        await this.prisma.marketplaceOrder.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'PAID',
            paymentGatewayRef: txnRefNo,
            paidAt: new Date(),
          },
        });
        this.rt.emitOrderUpdate(orderId, { paymentStatus: 'PAID' });
        this.logger.log(`✅ JazzCash payment success: order ${orderId}`);
      }
    } else if (orderId) {
      await this.prisma.marketplaceOrder.update({
        where: { id: orderId },
        data: { paymentStatus: 'FAILED' },
      });
      this.logger.log(`❌ JazzCash payment failed: ${responseCode}`);
    }

    return { success: isSuccess, responseCode, txnRefNo, orderId };
  }

  // ═══════════════════════════════════════════════════════════
  // REFUND
  // ═══════════════════════════════════════════════════════════

  async refund(dto: RefundJazzCashDto) {
    const payload: Record<string, string> = {
      pp_MerchantID: this.merchantId,
      pp_Password: this.password,
      pp_TxnRefNo: `R${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      pp_OriginalTxnRefNo: dto.originalTxnRefNo,
      pp_Amount: Math.round(dto.amount * 100).toString(),
      pp_MerchantMPIN: this.password,
    };
    payload.pp_SecureHash = this.buildSecureHash(payload);

    try {
      const res = await fetch(`${this.baseUrl}/PaymentRefund/RefundTransaction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();
      return {
        success: data.pp_ResponseCode === '000',
        ...data,
      };
    } catch (e: any) {
      this.logger.error(`JazzCash refund failed: ${e.message}`);
      throw new BadRequestException('Refund failed: ' + e.message);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private buildSecureHash(payload: Record<string, string>): string {
    // Sort keys alphabetically, filter out empty + secure hash itself,
    // join values with '&', prepend salt, then HMAC-SHA256
    const sortedKeys = Object.keys(payload).sort();
    const values = sortedKeys
      .filter((k) => k !== 'pp_SecureHash' && payload[k] !== '' && payload[k] != null)
      .map((k) => payload[k]);
    const stringToHash = [this.salt, ...values].join('&');
    return crypto.createHmac('sha256', this.salt).update(stringToHash).digest('hex').toUpperCase();
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
}

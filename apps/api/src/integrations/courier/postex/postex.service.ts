import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PostExService {
  private readonly logger = new Logger(PostExService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async getConfig(tenantId: string) {
    const c = await this.prisma.courierConfig.findFirst({
      where: { tenantId, provider: 'POSTEX', isActive: true },
    });
    if (!c) throw new BadRequestException('PostEx not configured');
    return c;
  }

  async bookShipment(tenantId: string, dto: {
    orderId: string;
    customerName: string; customerPhone: string;
    deliveryAddress: string; city: string;
    codAmount: number; cnValue: number;
    weightKg?: number; pieces?: number;
    orderRefNumber: string;
  }) {
    const config = await this.getConfig(tenantId);
    const base = config.isSandbox ? 'https://api.postex.pk/sandbox' : 'https://api.postex.pk';

    const payload = {
      cityName: dto.city,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      deliveryAddress: dto.deliveryAddress,
      invoicePayment: dto.codAmount,
      orderRefNumber: dto.orderRefNumber,
      transactionNotes: `Order ${dto.orderRefNumber}`,
      items: dto.pieces ?? 1,
      orderType: 'Normal',
      pickupAddressCode: config.merchantCode ?? 'DEFAULT',
    };

    try {
      const res = await fetch(`${base}/services/integration/api/order/v3/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', token: config.apiKey },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();

      if (data.statusCode !== '200') {
        throw new BadRequestException(data.statusMessage ?? 'PostEx booking failed');
      }
      const trackingNumber = data.dist?.trackingNumber ?? data.trackingNumber;

      return this.prisma.courierShipment.create({
        data: {
          tenantId,
          orderId: dto.orderId,
          provider: 'POSTEX',
          trackingNumber,
          status: 'CREATED',
          cnValue: dto.cnValue,
          codAmount: dto.codAmount,
          weightKg: dto.weightKg,
          pieces: dto.pieces ?? 1,
          destinationCity: dto.city,
          labelUrl: data.dist?.slipLink,
          metadata: data,
        },
      });
    } catch (e: any) {
      this.logger.error(`PostEx booking failed: ${e.message}`);
      throw new BadRequestException('Booking failed: ' + e.message);
    }
  }

  async trackShipment(tenantId: string, trackingNumber: string) {
    const config = await this.getConfig(tenantId);
    const base = config.isSandbox ? 'https://api.postex.pk/sandbox' : 'https://api.postex.pk';

    const res = await fetch(`${base}/services/integration/api/order/v1/track-order/${trackingNumber}`, {
      headers: { token: config.apiKey },
    });
    const data: any = await res.json();

    if (data.statusCode === '200' && data.dist) {
      const statusMap: Record<string, any> = {
        'Booked': 'CREATED', 'Picked': 'PICKED_UP', 'In Transit': 'IN_TRANSIT',
        'Out for Delivery': 'OUT_FOR_DELIVERY', 'Delivered': 'DELIVERED',
        'Returned': 'RETURNED', 'Cancelled': 'CANCELLED',
      };
      const currentStatus = data.dist.transactionStatus;
      await this.prisma.courierShipment.updateMany({
        where: { trackingNumber, tenantId },
        data: {
          status: statusMap[currentStatus] ?? 'IN_TRANSIT',
          lastEvent: currentStatus,
          lastEventAt: new Date(),
          events: data.dist.transactionStatusHistory ?? [],
          deliveredAt: currentStatus === 'Delivered' ? new Date() : undefined,
        },
      });
    }
    return data;
  }

  async cancel(tenantId: string, trackingNumber: string) {
    const config = await this.getConfig(tenantId);
    const base = config.isSandbox ? 'https://api.postex.pk/sandbox' : 'https://api.postex.pk';
    const res = await fetch(`${base}/services/integration/api/order/v1/cancel-order/${trackingNumber}`, {
      method: 'PUT', headers: { token: config.apiKey },
    });
    const data: any = await res.json();
    if (data.statusCode === '200') {
      await this.prisma.courierShipment.updateMany({
        where: { trackingNumber, tenantId }, data: { status: 'CANCELLED' },
      });
    }
    return data;
  }
}

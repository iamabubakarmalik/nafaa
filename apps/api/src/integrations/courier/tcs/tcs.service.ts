import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * TCS Courier API Integration
 * Book shipment, track, cancel
 */
@Injectable()
export class TcsService {
  private readonly logger = new Logger(TcsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getConfig(tenantId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'TCS_COURIER', status: 'CONNECTED' },
    });
    if (!integration) throw new BadRequestException('TCS not connected');
    return integration;
  }

  async bookShipment(tenantId: string, dto: {
    orderId: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    city: string;
    codAmount: number;
    weightKg?: number;
    pieces?: number;
    productDescription: string;
  }) {
    const integration = await this.getConfig(tenantId);
    const credentials = integration.credentials as any;
    const baseUrl = credentials.sandbox
      ? 'https://api-staging.tcs.com.pk/v1'
      : 'https://api.tcs.com.pk/v1';

    const payload = {
      consigneeName: dto.customerName,
      consigneeAddress: dto.customerAddress,
      consigneeMobNo: dto.customerPhone,
      consigneeCity: dto.city,
      codAmount: dto.codAmount,
      weight: dto.weightKg ?? 0.5,
      pieces: dto.pieces ?? 1,
      productDescription: dto.productDescription,
      merchantId: credentials.merchantId,
      originCity: credentials.originCity ?? 'Karachi',
      serviceType: 'O',
      shippingMode: 'COD',
    };

    try {
      const res = await fetch(`${baseUrl}/shipments/booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': credentials.apiKey,
        },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();

      if (data.success || data.bookingInfo) {
        const trackingNumber = data.bookingInfo?.cnNumber ?? data.trackingNumber;
        return this.prisma.courierShipment.create({
          data: {
            tenantId,
            orderId: dto.orderId,
            provider: 'TCS',
            trackingNumber,
            status: 'CREATED',
            cnValue: dto.codAmount,
            codAmount: dto.codAmount,
            weightKg: dto.weightKg ?? 0.5,
            pieces: dto.pieces ?? 1,
            destinationCity: dto.city,
            originCity: credentials.originCity ?? 'Karachi',
            labelUrl: data.bookingInfo?.labelUrl,
            metadata: data,
          },
        });
      }
      throw new BadRequestException(data.message ?? 'TCS booking failed');
    } catch (e: any) {
      this.logger.error(`TCS booking failed: ${e.message}`);
      throw new BadRequestException('TCS booking failed: ' + e.message);
    }
  }

  async track(tenantId: string, trackingNumber: string) {
    const integration = await this.getConfig(tenantId);
    const credentials = integration.credentials as any;
    const baseUrl = credentials.sandbox ? 'https://api-staging.tcs.com.pk/v1' : 'https://api.tcs.com.pk/v1';

    const res = await fetch(`${baseUrl}/tracking/${trackingNumber}`, {
      headers: { 'X-API-Key': credentials.apiKey },
    });
    const data: any = await res.json();

    if (data.success) {
      const statusMap: Record<string, any> = {
        'BOOKED': 'CREATED', 'PICKED_UP': 'PICKED_UP', 'IN_TRANSIT': 'IN_TRANSIT',
        'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY', 'DELIVERED': 'DELIVERED',
        'RETURNED': 'RETURNED', 'CANCELLED': 'CANCELLED',
      };
      const currentStatus = data.trackingInfo?.status ?? data.status;
      await this.prisma.courierShipment.updateMany({
        where: { trackingNumber, tenantId },
        data: {
          status: statusMap[currentStatus] ?? 'IN_TRANSIT',
          lastEvent: currentStatus,
          lastEventAt: new Date(),
          deliveredAt: currentStatus === 'DELIVERED' ? new Date() : undefined,
        },
      });
    }
    return data;
  }

  async cancel(tenantId: string, trackingNumber: string) {
    const integration = await this.getConfig(tenantId);
    const credentials = integration.credentials as any;
    const baseUrl = credentials.sandbox ? 'https://api-staging.tcs.com.pk/v1' : 'https://api.tcs.com.pk/v1';

    const res = await fetch(`${baseUrl}/shipments/${trackingNumber}/cancel`, {
      method: 'POST',
      headers: { 'X-API-Key': credentials.apiKey },
    });
    const data: any = await res.json();

    if (data.success) {
      await this.prisma.courierShipment.updateMany({
        where: { trackingNumber, tenantId },
        data: { status: 'CANCELLED' },
      });
    }
    return data;
  }
}

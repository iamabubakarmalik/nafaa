import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Leopards Courier API Integration
 */
@Injectable()
export class LeopardsService {
  private readonly logger = new Logger(LeopardsService.name);
  private readonly baseUrl = 'https://api.leopardscourier.com/api/v1';

  constructor(private readonly prisma: PrismaService) {}

  private async getConfig(tenantId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'LEOPARDS_COURIER', status: 'CONNECTED' },
    });
    if (!integration) throw new BadRequestException('Leopards not connected');
    return integration;
  }

  async bookShipment(tenantId: string, dto: {
    orderId: string; customerName: string; customerPhone: string;
    customerAddress: string; city: string; codAmount: number;
    weightKg?: number; pieces?: number; productDescription: string;
  }) {
    const integration = await this.getConfig(tenantId);
    const credentials = integration.credentials as any;

    const payload = {
      merchantCode: credentials.merchantCode,
      apiKey: credentials.apiKey,
      consigneeName: dto.customerName,
      consigneeAddress: dto.customerAddress,
      consigneePhone: dto.customerPhone,
      consigneeCity: dto.city,
      codAmount: dto.codAmount,
      weight: dto.weightKg ?? 0.5,
      pieces: dto.pieces ?? 1,
      productDescription: dto.productDescription,
      serviceType: 'COD',
    };

    try {
      const res = await fetch(`${this.baseUrl}/booking/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apiKey: credentials.apiKey },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json();

      if (data.status === 'success' || data.trackingNumber) {
        const trackingNumber = data.trackingNumber ?? data.cnNumber;
        return this.prisma.courierShipment.create({
          data: {
            tenantId, orderId: dto.orderId, provider: 'LEOPARDS',
            trackingNumber, status: 'CREATED',
            cnValue: dto.codAmount, codAmount: dto.codAmount,
            weightKg: dto.weightKg ?? 0.5, pieces: dto.pieces ?? 1,
            destinationCity: dto.city, labelUrl: data.slipUrl, metadata: data,
          },
        });
      }
      throw new BadRequestException(data.message ?? 'Leopards booking failed');
    } catch (e: any) {
      this.logger.error(`Leopards booking failed: ${e.message}`);
      throw new BadRequestException('Leopards booking failed: ' + e.message);
    }
  }

  async track(tenantId: string, trackingNumber: string) {
    const integration = await this.getConfig(tenantId);
    const credentials = integration.credentials as any;

    const res = await fetch(`${this.baseUrl}/tracking/${trackingNumber}?apiKey=${credentials.apiKey}&merchantCode=${credentials.merchantCode}`);
    const data: any = await res.json();

    if (data.status === 'success') {
      const statusMap: Record<string, any> = {
        'BOOKED': 'CREATED', 'PICKED': 'PICKED_UP', 'IN_TRANSIT': 'IN_TRANSIT',
        'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY', 'DELIVERED': 'DELIVERED',
        'RETURNED': 'RETURNED', 'CANCELLED': 'CANCELLED',
      };
      const currentStatus = data.trackingInfo?.status ?? data.status;
      await this.prisma.courierShipment.updateMany({
        where: { trackingNumber, tenantId },
        data: { status: statusMap[currentStatus] ?? 'IN_TRANSIT', lastEvent: currentStatus, lastEventAt: new Date() },
      });
    }
    return data;
  }

  async cancel(tenantId: string, trackingNumber: string) {
    const integration = await this.getConfig(tenantId);
    const credentials = integration.credentials as any;

    const res = await fetch(`${this.baseUrl}/booking/cancel/${trackingNumber}`, {
      method: 'POST',
      headers: { apiKey: credentials.apiKey },
    });
    const data: any = await res.json();

    if (data.status === 'success') {
      await this.prisma.courierShipment.updateMany({
        where: { trackingNumber, tenantId },
        data: { status: 'CANCELLED' },
      });
    }
    return data;
  }
}

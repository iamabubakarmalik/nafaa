import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationService } from '../../core/integration.service';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Foodpanda Partner API Integration
 *
 * FLOW:
 * 1. Shop owner connects Foodpanda with clientId, clientSecret, vendorId
 * 2. We authenticate with Foodpanda → get access token
 * 3. We poll for new orders every 15 minutes (or receive webhooks)
 * 4. Orders are stored as ChannelOrders
 * 5. Shop owner can convert them to Nafaa sales
 *
 * API Docs: https://partner.foodpanda.com/ (requires partner account)
 */
@Injectable()
export class FoodpandaService {
  private readonly logger = new Logger(FoodpandaService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly integrationSvc: IntegrationService,
    private readonly prisma: PrismaService,
  ) {
    this.baseUrl = config.get<string>('FOODPANDA_API_URL') ?? 'https://partner-api.foodpanda.com/v1';
  }

  // ═══════════════════════════════════════════════════════════
  // AUTHENTICATE
  // ═══════════════════════════════════════════════════════════

  private async getAccessToken(credentials: any): Promise<string> {
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
    });
    const data: any = await res.json();
    if (!data.access_token) throw new Error('Foodpanda auth failed');
    return data.access_token;
  }

  // ═══════════════════════════════════════════════════════════
  // FETCH ORDERS (polling)
  // ═══════════════════════════════════════════════════════════

  async syncOrders(integrationId: string) {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });
    if (!integration) return;

    const credentials = integration.credentials as any;
    if (!credentials?.clientId || !credentials?.clientSecret) {
      this.logger.warn('Foodpanda credentials missing');
      return;
    }

    const syncLog = await this.integrationSvc.logSync({
      integrationId,
      operation: 'SYNC_ORDERS',
      direction: 'INBOUND',
      status: 'SYNCING',
    });

    try {
      const token = await this.getAccessToken(credentials);
      const lastSync = integration.lastSyncAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

      const res = await fetch(
        `${this.baseUrl}/vendors/${credentials.vendorId}/orders?since=${lastSync.toISOString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data: any = await res.json();
      const orders = data.orders ?? data.data ?? [];

      let success = 0;
      let failed = 0;

      for (const fpOrder of orders) {
        try {
          await this.integrationSvc.receiveChannelOrder(integrationId, {
            externalOrderId: String(fpOrder.id ?? fpOrder.code),
            externalOrderNumber: fpOrder.code ?? fpOrder.order_number,
            customerName: fpOrder.customer?.name ?? fpOrder.customer_name ?? 'Foodpanda Customer',
            customerPhone: fpOrder.customer?.phone ?? fpOrder.customer_phone,
            customerEmail: fpOrder.customer?.email,
            customerAddress: fpOrder.customer?.address ?? fpOrder.delivery_address,
            customerCity: fpOrder.customer?.city,
            customerLat: fpOrder.customer?.location?.lat,
            customerLng: fpOrder.customer?.location?.lng,
            items: (fpOrder.items ?? fpOrder.products ?? []).map((item: any) => ({
              name: item.name ?? item.product_name,
              sku: item.sku ?? item.product_id,
              quantity: item.quantity ?? item.qty,
              price: item.price ?? item.unit_price,
              image: item.image,
              variant: item.variant_name,
            })),
            subtotal: fpOrder.subtotal ?? fpOrder.order_value ?? 0,
            deliveryFee: fpOrder.delivery_fee ?? 0,
            discount: fpOrder.discount ?? fpOrder.voucher_amount ?? 0,
            total: fpOrder.total ?? fpOrder.grand_total ?? 0,
            paymentMethod: fpOrder.payment_method ?? (fpOrder.is_preorder ? 'PREPAID' : 'COD'),
            paymentStatus: fpOrder.payment_status ?? 'PENDING',
            orderStatus: this.mapFoodpandaStatus(fpOrder.status ?? fpOrder.order_status),
            notes: fpOrder.notes ?? fpOrder.customer_notes,
            metadata: { source: 'foodpanda', raw: fpOrder },
          });
          success++;
        } catch (e: any) {
          this.logger.error(`Failed to sync Foodpanda order: ${e.message}`);
          failed++;
        }
      }

      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date(), lastSyncStatus: 'SUCCESS' },
      });

      await this.integrationSvc.logSync({
        integrationId,
        operation: 'SYNC_ORDERS',
        direction: 'INBOUND',
        status: 'SUCCESS',
        recordsProcessed: orders.length,
        recordsSuccess: success,
        recordsFailed: failed,
        completedAt: new Date(),
      });

      this.logger.log(`🍔 Foodpanda sync: ${success}/${orders.length} orders imported`);
      return { success, failed, total: orders.length };
    } catch (e: any) {
      this.logger.error(`Foodpanda sync failed: ${e.message}`);
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date(), lastSyncStatus: 'FAILED', totalErrors: { increment: 1 } },
      });
      await this.integrationSvc.logSync({
        integrationId,
        operation: 'SYNC_ORDERS',
        direction: 'INBOUND',
        status: 'FAILED',
        errorMessage: e.message,
      });
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // WEBHOOK RECEIVER (Foodpanda pushes orders to us)
  // ═══════════════════════════════════════════════════════════

  async handleWebhook(integrationId: string, body: any) {
    const event = body.event ?? body.type;

    if (event === 'order.created' || event === 'order.create') {
      const order = body.order ?? body.data;
      return this.integrationSvc.receiveChannelOrder(integrationId, {
        externalOrderId: String(order.id ?? order.code),
        externalOrderNumber: order.code,
        customerName: order.customer?.name ?? 'Foodpanda Customer',
        customerPhone: order.customer?.phone,
        customerAddress: order.customer?.address,
        items: (order.items ?? []).map((i: any) => ({
          name: i.name, sku: i.sku, quantity: i.quantity, price: i.price,
        })),
        subtotal: order.subtotal ?? 0,
        deliveryFee: order.delivery_fee ?? 0,
        total: order.total ?? 0,
        paymentMethod: order.payment_method,
        orderStatus: this.mapFoodpandaStatus(order.status),
        metadata: { source: 'foodpanda-webhook', raw: body },
      });
    }

    if (event === 'order.status_update' || event === 'order.updated') {
      const order = body.order ?? body.data;
      const existing = await this.prisma.channelOrder.findUnique({
        where: { integrationId_externalOrderId: { integrationId, externalOrderId: String(order.id ?? order.code) } },
      });
      if (existing) {
        return this.prisma.channelOrder.update({
          where: { id: existing.id },
          data: { orderStatus: this.mapFoodpandaStatus(order.status) },
        });
      }
    }

    return { received: true };
  }

  // ═══════════════════════════════════════════════════════════
  // ACCEPT / REJECT ORDER (push to Foodpanda)
  // ═══════════════════════════════════════════════════════════

  async acceptOrder(integrationId: string, externalOrderId: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    const credentials = integration?.credentials as any;
    const token = await this.getAccessToken(credentials);

    const res = await fetch(`${this.baseUrl}/orders/${externalOrderId}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  }

  async rejectOrder(integrationId: string, externalOrderId: string, reason: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    const credentials = integration?.credentials as any;
    const token = await this.getAccessToken(credentials);

    const res = await fetch(`${this.baseUrl}/orders/${externalOrderId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return res.json();
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private mapFoodpandaStatus(fpStatus: string): string {
    const map: Record<string, string> = {
      'new': 'PENDING',
      'accepted': 'CONFIRMED',
      'confirmed': 'CONFIRMED',
      'food_preparing': 'PREPARING',
      'preparing': 'PREPARING',
      'ready_for_pickup': 'READY',
      'ready': 'READY',
      'picked_up': 'OUT_FOR_DELIVERY',
      'delivery': 'OUT_FOR_DELIVERY',
      'delivered': 'DELIVERED',
      'completed': 'DELIVERED',
      'cancelled': 'CANCELLED',
      'canceled': 'CANCELLED',
      'rejected': 'REJECTED',
    };
    return map[fpStatus?.toLowerCase()] ?? 'PENDING';
  }
}

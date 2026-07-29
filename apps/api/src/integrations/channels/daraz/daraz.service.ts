import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IntegrationService } from '../../core/integration.service';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Daraz Open Platform (Lazada Open Platform) Integration
 *
 * FLOW:
 * 1. Shop owner creates app on open.lazada.com → gets appKey + appSecret
 * 2. OAuth flow → shop owner authorizes → we get access token
 * 3. We sync orders, products, inventory bidirectionally
 *
 * API: https://open.lazada.com/
 */
@Injectable()
export class DarazService {
  private readonly logger = new Logger(DarazService.name);
  private readonly baseUrls: Record<string, string> = {
    pk: 'https://api.lazada.com.my/rest', // Pakistan uses Lazada Open Platform
    pk2: 'https://api.daraz.pk/rest',
  };

  constructor(
    private readonly integrationSvc: IntegrationService,
    private readonly prisma: PrismaService,
  ) {}

  private getBaseUrl(country: string) {
    return this.baseUrls[country] ?? 'https://api.lazada.com.my/rest';
  }

  // ═══════════════════════════════════════════════════════════
  // GENERATE AUTH URL (shop owner visits this to authorize)
  // ═══════════════════════════════════════════════════════════

  getAuthUrl(integrationId: string, credentials: any) {
    const baseUrl = this.getBaseUrl(credentials.country ?? 'pk');
    const redirectUrl = `${process.env.API_URL ?? 'http://localhost:4000/api'}/integrations/daraz/callback`;
    const authUrl = `${baseUrl}/auth/oauth?app_key=${credentials.appKey}&redirect_url=${encodeURIComponent(redirectUrl)}&state=${integrationId}`;
    return { authUrl, redirectUrl };
  }

  // ═══════════════════════════════════════════════════════════
  // HANDLE OAUTH CALLBACK
  // ═══════════════════════════════════════════════════════════

  async handleCallback(integrationId: string, code: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) throw new Error('Integration not found');

    const credentials = integration.credentials as any;
    const baseUrl = this.getBaseUrl(credentials.country ?? 'pk');

    const res = await fetch(`${baseUrl}/auth/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key: credentials.appKey,
        app_secret: credentials.appSecret,
        code,
      }),
    });
    const data: any = await res.json();

    if (data.access_token) {
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: {
          credentials: {
            ...credentials,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: new Date(Date.now() + (data.expires_in ?? 31536000) * 1000),
            sellerId: data.seller_id,
            account: data.account,
          },
          status: 'CONNECTED',
        },
      });
      return { success: true, message: 'Daraz connected successfully!' };
    }
    throw new Error('Daraz OAuth failed: ' + JSON.stringify(data));
  }

  // ═══════════════════════════════════════════════════════════
  // SYNC ORDERS
  // ═══════════════════════════════════════════════════════════

  async syncOrders(integrationId: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) return;

    const credentials = integration.credentials as any;
    if (!credentials.accessToken) throw new Error('Daraz not authorized — OAuth karein');

    const baseUrl = this.getBaseUrl(credentials.country ?? 'pk');
    const lastSync = integration.lastSyncAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

    await this.integrationSvc.logSync({
      integrationId, operation: 'SYNC_ORDERS', direction: 'INBOUND', status: 'SYNCING',
    });

    try {
      const params = new URLSearchParams({
        app_key: credentials.appKey,
        access_token: credentials.accessToken,
        sign_method: 'sha256',
        timestamp: String(Date.now()),
        created_after: lastSync.toISOString(),
        limit: '100',
        sort_direction: 'DESC',
      });

      const sign = this.generateSign(params, credentials.appSecret);
      const res = await fetch(`${baseUrl}/orders/get?${params}&sign=${sign}`);
      const data: any = await res.json();

      const orders = data.data?.orders ?? data.orders ?? [];
      let success = 0;
      let failed = 0;

      for (const dzOrder of orders) {
        try {
          await this.integrationSvc.receiveChannelOrder(integrationId, {
            externalOrderId: String(dzOrder.order_id ?? dzOrder.orderNumber),
            externalOrderNumber: dzOrder.order_number ?? dzOrder.orderNumber,
            customerName: dzOrder.customer_first_name ? `${dzOrder.customer_first_name} ${dzOrder.customer_last_name ?? ''}` : 'Daraz Customer',
            customerPhone: dzOrder.address_billing?.phone ?? dzOrder.customer_phone,
            customerEmail: dzOrder.customer_email,
            customerAddress: this.formatAddress(dzOrder.address_billing ?? dzOrder.address_shipping),
            customerCity: dzOrder.address_billing?.city ?? dzOrder.address_shipping?.city,
            items: (dzOrder.order_items ?? dzOrder.items ?? []).map((item: any) => ({
              name: item.name ?? item.product_name,
              sku: item.sku ?? item.seller_sku,
              quantity: item.quantity ?? item.qty,
              price: item.item_price ?? item.paid_price,
              image: item.product_url,
            })),
            subtotal: dzOrder.price ?? dzOrder.item_price_total ?? 0,
            deliveryFee: dzOrder.shipping_fee ?? dzOrder.shipping_cost ?? 0,
            total: dzOrder.gross_revenue ?? dzOrder.total_price ?? 0,
            paymentMethod: dzOrder.payment_method ?? 'COD',
            paymentStatus: dzOrder.statuses?.paid === 1 ? 'PAID' : 'PENDING',
            orderStatus: this.mapDarazStatus(dzOrder.statuses ?? dzOrder.status),
            metadata: { source: 'daraz', raw: dzOrder },
          });
          success++;
        } catch (e) {
          failed++;
        }
      }

      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date(), lastSyncStatus: 'SUCCESS' },
      });

      await this.integrationSvc.logSync({
        integrationId, operation: 'SYNC_ORDERS', direction: 'INBOUND', status: 'SUCCESS',
        recordsProcessed: orders.length, recordsSuccess: success, recordsFailed: failed,
      });

      this.logger.log(`🛒 Daraz sync: ${success}/${orders.length} orders`);
      return { success, failed, total: orders.length };
    } catch (e: any) {
      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date(), lastSyncStatus: 'FAILED', totalErrors: { increment: 1 } },
      });
      await this.integrationSvc.logSync({
        integrationId, operation: 'SYNC_ORDERS', direction: 'INBOUND', status: 'FAILED', errorMessage: e.message,
      });
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PUSH PRODUCT TO DARAZ
  // ═══════════════════════════════════════════════════════════

  async pushProduct(integrationId: string, productId: string) {
    const integration = await this.prisma.integration.findUnique({ where: { id: integrationId } });
    if (!integration) throw new Error('Integration not found');

    const credentials = integration.credentials as any;
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId: integration.tenantId },
      include: { images: true, category: true },
    });
    if (!product) throw new Error('Product not found');

    const baseUrl = this.getBaseUrl(credentials.country ?? 'pk');
    const payload = {
      app_key: credentials.appKey,
      access_token: credentials.accessToken,
      sign_method: 'sha256',
      timestamp: String(Date.now()),
      payload: JSON.stringify({
        products: [{
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
          quantity: product.stock ?? 0,
          description: product.description,
          images: product.images.map((i) => i.url),
          category: product.category?.name,
        }],
      }),
    };

    const params = new URLSearchParams(payload);
    const sign = this.generateSign(params, credentials.appSecret);

    const res = await fetch(`${baseUrl}/product/create?${params}&sign=${sign}`, { method: 'POST' });
    const data: any = await res.json();

    if (data.code === '0' || data.success) {
      // Create mapping
      await this.prisma.productChannelMapping.upsert({
        where: { integrationId_productId: { integrationId, productId } },
        create: {
          integrationId, productId,
          externalProductId: data.data?.product_id ?? String(data.data?.itemId),
          externalSku: product.sku,
          syncStatus: 'SUCCESS',
          lastSyncedAt: new Date(),
        },
        update: {
          externalProductId: data.data?.product_id,
          syncStatus: 'SUCCESS',
          lastSyncedAt: new Date(),
        },
      });
      return { success: true, darazProductId: data.data?.product_id };
    }
    throw new Error('Daraz product push failed: ' + JSON.stringify(data));
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════

  private generateSign(params: URLSearchParams, appSecret: string): string {
    const concat = `/rest${params.toString().split('&').sort().join('&')}`;
    return crypto.createHmac('sha256', appSecret).update(concat).digest('hex').toUpperCase();
  }

  private formatAddress(addr: any): string {
    if (!addr) return '';
    return [addr.address1, addr.address2, addr.city, addr.postCode].filter(Boolean).join(', ');
  }

  private mapDarazStatus(statuses: any): string {
    if (typeof statuses === 'string') {
      const map: Record<string, string> = {
        pending: 'PENDING', canceled: 'CANCELLED', ready_to_ship: 'READY',
        delivered: 'DELIVERED', returned: 'RETURNED', shipped: 'OUT_FOR_DELIVERY',
        failed_delivery: 'FAILED', refunded: 'REFUNDED',
      };
      return map[statuses.toLowerCase()] ?? 'PENDING';
    }
    if (statuses?.canceled) return 'CANCELLED';
    if (statuses?.delivered) return 'DELIVERED';
    if (statuses?.shipped) return 'OUT_FOR_DELIVERY';
    if (statuses?.ready_to_ship) return 'READY';
    return 'PENDING';
  }
}

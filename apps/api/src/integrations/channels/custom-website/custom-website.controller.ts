import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { IntegrationService } from '../../core/integration.service';
import { OnlineOrdersService } from '../../online-orders/online-orders.service';
import { WebsiteCatalogService } from '../../online-orders/website-catalog.service';
import { normalizeOrder } from '../../online-orders/order-normalizer';
import { readWebsiteConfig } from '../../online-orders/website-config';

/**
 * Custom Website Integration — PURANA (v0) raasta.
 *
 * Naya raasta `integrations/website/v1` hai (header key, signature,
 * WooCommerce/Shopify webhooks). Ye raaste chalti websites ke liye
 * zinda hain aur andar se wahi naya flow chalate hain — ghanti,
 * auto-accept, sahi stock sab.
 *
 * WORKFLOW:
 * 1. Shop owner creates integration → gets API key + webhook URL
 * 2. Shop owner adds webhook URL to their website
 * 3. When customer orders on their website → website calls our webhook
 * 4. Order appears in Nafaa dashboard → shop owner can convert to sale
 *
 * ALSO: Shop owner can pull products from Nafaa via GET API
 */
@ApiTags('Integrations / Custom Website')
@Controller('integrations/webhooks/custom-website')
export class CustomWebsiteController {
  constructor(
    private readonly integrationSvc: IntegrationService,
    private readonly onlineOrders: OnlineOrdersService,
    private readonly catalog: WebsiteCatalogService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // RECEIVE ORDER (Webhook — called by external website)
  // ═══════════════════════════════════════════════════════════

  @Public()
  @Post(':apiKey')
  @ApiOperation({ summary: 'Receive order from external website (webhook)' })
  async receiveOrder(
    @Param('apiKey') apiKey: string,
    @Body() body: any,
    @Headers() headers: any,
    @Req() req: Request,
  ) {
    // Verify API key
    const integration = await this.integrationSvc.verifyApiKey(apiKey);
    if (!integration) {
      return { success: false, error: 'Invalid API key' };
    }

    // Purana raasta signature nahi bhejta — "sirf signed orders" on ho to band
    if (readWebsiteConfig(integration.config).requireSignature) {
      return { success: false, error: 'Signature zaroori hai — naya API (/integrations/website/v1/orders) use karein' };
    }

    let channelOrder: any;
    try {
      const normalized = normalizeOrder(body, 'custom');
      channelOrder = await this.onlineOrders.receive(integration, normalized, { signed: false });
    } catch (e: any) {
      await this.integrationSvc.logWebhook({
        integrationId: integration.id,
        tenantId: integration.tenantId,
        source: 'custom-website',
        event: 'order.created',
        method: req.method,
        body,
        responseStatus: 400,
        processed: false,
        errorMessage: String(e?.response?.message ?? e?.message ?? 'Error'),
      }).catch(() => null);
      return { success: false, error: e?.response?.message ?? e?.message ?? 'Order save nahi hua' };
    }

    await this.integrationSvc.logWebhook({
      integrationId: integration.id,
      tenantId: integration.tenantId,
      source: 'custom-website',
      event: 'order.created',
      method: req.method,
      headers: { 'user-agent': headers['user-agent'] },
      body,
      responseStatus: 200,
      processed: true,
    }).catch(() => null);

    return {
      success: true,
      message: 'Order receive ho gaya',
      channelOrderId: channelOrder.id,
      nafaaOrderNumber: channelOrder.externalOrderNumber,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // UPDATE ORDER STATUS (external website notifies us)
  // ═══════════════════════════════════════════════════════════

  @Public()
  @Post(':apiKey/order-status')
  @ApiOperation({ summary: 'Update order status from external website' })
  async updateStatus(
    @Param('apiKey') apiKey: string,
    @Body() body: { orderId: string; status: string; paymentStatus?: string },
  ) {
    const integration = await this.integrationSvc.verifyApiKey(apiKey);
    if (!integration) return { success: false, error: 'Invalid API key' };

    // Website sirf "cancel hua" ya "paisa aa gaya" bata sakti hai — accept,
    // dispatch waghera Nafaa me hote hain taake stock ka hisaab sahi rahe.
    const status = String(body?.status ?? '').toLowerCase();
    const pay = String(body?.paymentStatus ?? '').toLowerCase();
    return this.onlineOrders.applyWebsiteUpdate(integration, String(body?.orderId ?? ''), {
      cancelled: ['cancelled', 'canceled', 'refunded', 'failed'].includes(status),
      paid: ['paid', 'completed'].includes(pay),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // GET PRODUCTS (external website pulls product catalog)
  // ═══════════════════════════════════════════════════════════

  @Public()
  @Get(':apiKey/products')
  @ApiOperation({ summary: 'Get product catalog (for external website to display)' })
  async getProducts(
    @Param('apiKey') apiKey: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const integration = await this.integrationSvc.verifyApiKey(apiKey);
    if (!integration) return { success: false, error: 'Invalid API key' };

    const lim = Math.min(+(limit ?? 50) || 50, 500);
    const off = +(offset ?? 0) || 0;
    const config = readWebsiteConfig(integration.config);
    const res = await this.catalog.exportProducts(integration.tenantId, config.shopId ?? integration.shopId, {
      page: Math.floor(off / lim) + 1,
      limit: lim,
      search: category,
    });
    return { products: res.products, total: res.total, limit: lim, offset: off };
  }

  // ═══════════════════════════════════════════════════════════
  // VERIFY CONNECTION (test endpoint)
  // ═══════════════════════════════════════════════════════════

  @Public()
  @Get(':apiKey/verify')
  @ApiOperation({ summary: 'Verify API key is valid' })
  async verify(@Param('apiKey') apiKey: string) {
    const integration = await this.integrationSvc.verifyApiKey(apiKey);
    if (!integration) return { valid: false };

    return {
      valid: true,
      tenant: integration.tenantId,
      shopId: integration.shopId,
      integrationType: integration.type,
      status: integration.status,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RECEIVE PRODUCTS (Webhook — external website pushes products)
  // ═══════════════════════════════════════════════════════════

  @Public()
  @Post(':apiKey/products-batch')
  @ApiOperation({ summary: 'Receive products batch from external website (webhook)' })
  async receiveProducts(
    @Param('apiKey') apiKey: string,
    @Body() body: { products: any[] },
  ) {
    const integration = await this.integrationSvc.verifyApiKey(apiKey);
    if (!integration) {
      return { success: false, error: 'Invalid API key' };
    }

    if (!body.products?.length) {
      return { success: false, error: 'products array zaroori hai' };
    }

    const result = await this.catalog.importProducts(integration, body.products, {
      shopId: readWebsiteConfig(integration.config).shopId ?? integration.shopId,
    });

    return {
      ...result,
      message: `${result.imported} naye, ${result.updated} update, ${result.failed} fail`,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // RECEIVE SINGLE PRODUCT (Webhook — simpler for one product)
  // ═══════════════════════════════════════════════════════════

  @Public()
  @Post(':apiKey/product')
  @ApiOperation({ summary: 'Receive single product from external website' })
  async receiveSingleProduct(
    @Param('apiKey') apiKey: string,
    @Body() body: any,
  ) {
    const integration = await this.integrationSvc.verifyApiKey(apiKey);
    if (!integration) {
      return { success: false, error: 'Invalid API key' };
    }

    const result = await this.catalog.importProducts(integration, [body], {
      shopId: readWebsiteConfig(integration.config).shopId ?? integration.shopId,
    });

    return {
      ...result,
      message: result.imported > 0 ? 'Product import ho gaya' : 'Product update ho gaya',
    };
  }
}

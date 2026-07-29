import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { IntegrationService } from '../../core/integration.service';
import { CustomWebsiteService } from './custom-website.service';

/**
 * Custom Website Integration
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
    private readonly customSvc: CustomWebsiteService,
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

    // Log webhook
    await this.integrationSvc.logWebhook({
      integrationId: integration.id,
      tenantId: integration.tenantId,
      source: 'custom-website',
      event: 'order.created',
      method: req.method,
      url: req.url,
      headers: { 'content-type': headers['content-type'], 'user-agent': headers['user-agent'] },
      body,
      responseStatus: 200,
      processed: true,
    });

    // Validate required fields
    if (!body.orderId && !body.id) {
      return { success: false, error: 'orderId (ya id) zaroori hai' };
    }
    if (!body.customer?.name && !body.customerName) {
      return { success: false, error: 'customer name zaroori hai' };
    }
    if (!body.items?.length) {
      return { success: false, error: 'items array zaroori hai' };
    }

    // Transform to standard format
    const orderData = {
      externalOrderId: String(body.orderId ?? body.id),
      externalOrderNumber: body.orderNumber ?? body.reference ?? undefined,
      customerName: body.customer?.name ?? body.customerName ?? 'Customer',
      customerPhone: body.customer?.phone ?? body.customerPhone,
      customerEmail: body.customer?.email ?? body.customerEmail,
      customerAddress: body.customer?.address ?? body.customerAddress ?? body.deliveryAddress,
      customerCity: body.customer?.city ?? body.customerCity,
      customerLat: body.customer?.lat ?? body.customerLat,
      customerLng: body.customer?.lng ?? body.customerLng,
      items: (body.items ?? []).map((item: any) => ({
        name: item.name ?? item.productName ?? 'Product',
        sku: item.sku ?? item.productId,
        quantity: item.quantity ?? item.qty ?? 1,
        price: item.price ?? item.unitPrice ?? 0,
        image: item.image ?? item.imageUrl,
        variant: item.variant ?? item.size,
      })),
      subtotal: body.subtotal ?? body.items?.reduce((s: number, i: any) => s + (i.price * (i.quantity ?? 1)), 0) ?? 0,
      deliveryFee: body.deliveryFee ?? body.shippingFee ?? 0,
      discount: body.discount ?? 0,
      total: body.total ?? body.amount ?? body.grandTotal,
      paymentMethod: body.paymentMethod ?? body.payment?.method,
      paymentStatus: body.paymentStatus ?? body.payment?.status ?? 'PENDING',
      orderStatus: body.status ?? body.orderStatus ?? 'PENDING',
      notes: body.notes ?? body.customerNotes,
      metadata: { source: body.source ?? 'website', raw: body },
    };

    const channelOrder = await this.integrationSvc.receiveChannelOrder(integration.id, orderData);

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

    return this.customSvc.updateOrderStatus(integration.id, body.orderId, body.status, body.paymentStatus);
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

    return this.customSvc.getProducts(integration, {
      category,
      limit: +(limit ?? 50),
      offset: +(offset ?? 0),
    });
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

    const result = await this.integrationSvc.receiveProductsFromWebhook(
      integration.id,
      body.products,
    );

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

    const result = await this.integrationSvc.receiveProductsFromWebhook(
      integration.id,
      [body],
    );

    return {
      ...result,
      message: result.imported > 0 ? 'Product import ho gaya' : 'Product update ho gaya',
    };
  }
}

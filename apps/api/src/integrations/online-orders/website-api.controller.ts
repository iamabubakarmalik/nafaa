import {
  BadRequestException, Body, Controller, Get, HttpCode, Param, Post, Query, Req, UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Integration } from '@prisma/client';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationService } from '../core/integration.service';
import { OnlineOrdersService } from './online-orders.service';
import { WebsiteCatalogService } from './website-catalog.service';
import { WebsiteSetupService } from './website-setup.service';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';
import { detectPlatform, isIndoljStatus, normalizeOrder } from './order-normalizer';
import { readWebsiteConfig, verifySignature } from './website-config';

/**
 * Website ⇄ Nafaa public API  (v1)
 *
 * Auth: `X-Nafaa-Key: <api key>` header (custom code / Nafaa plugin),
 * ya WooCommerce/Shopify ke built-in webhooks ke liye URL me key:
 * `POST /integrations/website/v1/hook/<api key>`.
 *
 * Signature (optional, "sirf signed orders" on ho to zaroori):
 *  - `X-Nafaa-Signature: sha256=<hex hmac(webhookSecret, body)>`
 *  - WooCommerce `X-WC-Webhook-Signature`, Shopify `X-Shopify-Hmac-Sha256`
 */
@ApiTags('Website API (public)')
@Public()
@Throttle({ default: { limit: 180, ttl: 60_000 } })
@Controller('integrations/website/v1')
export class WebsiteApiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationService,
    private readonly orders: OnlineOrdersService,
    private readonly catalog: WebsiteCatalogService,
    private readonly setup: WebsiteSetupService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
  ) {}

  // ═══ WooCommerce "Approve" ke baad keys yahan aati hain ═══
  @Post('woocommerce/callback')
  @HttpCode(200)
  @ApiOperation({ summary: 'WooCommerce wc-auth callback (keys)' })
  wooCallback(@Body() body: any) {
    return this.woo.callback(body);
  }

  // ═══ Connection check ═══
  @Get('verify')
  @ApiHeader({ name: 'X-Nafaa-Key', required: true })
  @ApiOperation({ summary: 'Key sahi hai? (plugin "Test connection" button)' })
  async verify(@Req() req: Request) {
    const integration = await this.auth(req);
    const shop = integration.shopId
      ? await this.prisma.shop.findUnique({ where: { id: integration.shopId }, select: { name: true } })
      : null;
    const tenant = await this.prisma.tenant.findUnique({ where: { id: integration.tenantId }, select: { name: true } as any });
    return {
      valid: true,
      name: integration.displayName,
      business: (tenant as any)?.name ?? null,
      branch: shop?.name ?? null,
      features: ['orders', 'status', 'products', 'stock', 'import'],
      apiVersion: 1,
    };
  }

  // ═══ New / updated order (custom code, Nafaa plugin) ═══
  @Post('orders')
  @HttpCode(200)
  @ApiHeader({ name: 'X-Nafaa-Key', required: true })
  @ApiOperation({ summary: 'Website par naya order — Nafaa me bhejein' })
  async createOrder(@Req() req: Request, @Body() body: any) {
    const integration = await this.auth(req);
    return this.handleOrder(integration, req, body);
  }

  // ═══ WooCommerce / Shopify built-in webhook (bina plugin) ═══
  @Post('hook/:key')
  @HttpCode(200)
  @ApiOperation({ summary: 'WooCommerce / Shopify ka built-in order webhook' })
  async platformHook(@Param('key') key: string, @Req() req: Request, @Body() body: any) {
    const integration = await this.auth(req, key);

    // WooCommerce webhook banate waqt ek "ping" bhejta hai: { webhook_id: 12 }
    if (body && body.webhook_id && !body.id && !body.line_items) {
      await this.markVerified(integration);
      return { success: true, ping: true, message: 'Nafaa se connection theek hai ✅' };
    }

    const topic = String(req.headers['x-wc-webhook-topic'] ?? req.headers['x-shopify-topic'] ?? '');
    if (topic === 'app/uninstalled') {
      this.checkSignature(integration, req);
      await this.shopify.onUninstalled(integration);
      return { success: true };
    }
    if (/deleted|delete/.test(topic)) {
      this.checkSignature(integration, req);
      const externalId = String(body?.id ?? '');
      if (externalId) {
        await this.orders.applyWebsiteUpdate(integration, externalId, { cancelled: true, reason: 'Website se order delete hua' }).catch(() => null);
      }
      return { success: true };
    }
    return this.handleOrder(integration, req, body);
  }

  // ═══ Website ne order ka status badla (customer ne cancel kiya, paisa aa gaya) ═══
  @Post('orders/:orderId/status')
  @HttpCode(200)
  @ApiHeader({ name: 'X-Nafaa-Key', required: true })
  async orderStatus(
    @Req() req: Request,
    @Param('orderId') orderId: string,
    @Body() body: { status?: string; paymentStatus?: string; reason?: string },
  ) {
    const integration = await this.auth(req);
    this.checkSignature(integration, req);
    const status = String(body?.status ?? '').toLowerCase();
    const pay = String(body?.paymentStatus ?? '').toLowerCase();
    return this.orders.applyWebsiteUpdate(integration, orderId, {
      cancelled: ['cancelled', 'canceled', 'refunded', 'failed'].includes(status),
      paid: ['paid', 'completed'].includes(pay),
      reason: body?.reason,
    });
  }

  // ═══ Nafaa → Website: products + asli stock ═══
  @Get('products')
  @ApiHeader({ name: 'X-Nafaa-Key', required: true })
  @ApiOperation({ summary: 'Nafaa ke products (branch stock ke saath) — website par dikhane ke liye' })
  async products(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('updatedSince') updatedSince?: string,
  ) {
    const integration = await this.auth(req);
    const config = readWebsiteConfig(integration.config);
    return this.catalog.exportProducts(integration.tenantId, config.shopId ?? integration.shopId, {
      page: page ? +page : 1,
      limit: limit ? +limit : 100,
      search,
      updatedSince: updatedSince ? new Date(updatedSince) : undefined,
    });
  }

  @Get('stock')
  @ApiHeader({ name: 'X-Nafaa-Key', required: true })
  @ApiOperation({ summary: 'SKU ke hisaab se stock (?skus=A1,B2) — website ka stock sync' })
  async stock(@Req() req: Request, @Query('skus') skus?: string) {
    const integration = await this.auth(req);
    const list = String(skus ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500);
    if (!list.length) throw new BadRequestException('?skus=A1,B2 bhejein');
    const config = readWebsiteConfig(integration.config);
    const stock = await this.catalog.stockBySku(integration.tenantId, config.shopId ?? integration.shopId, integration.id, list);
    return { stock };
  }

  // ═══ Website → Nafaa: products import ═══
  @Post('products')
  @HttpCode(200)
  @ApiHeader({ name: 'X-Nafaa-Key', required: true })
  @ApiOperation({ summary: 'Website ke products Nafaa me lao (naye ban jate hain, purane update)' })
  async importProducts(
    @Req() req: Request,
    @Body() body: { products?: any[]; updatePrice?: boolean; updateStock?: boolean },
  ) {
    const integration = await this.auth(req);
    this.checkSignature(integration, req);
    const products = Array.isArray(body) ? body : body?.products;
    if (!Array.isArray(products) || !products.length) throw new BadRequestException('products array bhejein');
    const config = readWebsiteConfig(integration.config);
    return this.catalog.importProducts(integration, products, {
      shopId: config.shopId ?? integration.shopId,
      updatePrice: !!(body as any)?.updatePrice,
      updateStock: !!(body as any)?.updateStock,
    });
  }

  // ═══ Plugin apni settings batata hai (status URL, site) ═══
  @Post('settings')
  @HttpCode(200)
  @ApiHeader({ name: 'X-Nafaa-Key', required: true })
  async pluginSettings(
    @Req() req: Request,
    @Body() body: { statusWebhookUrl?: string; siteUrl?: string; platform?: any },
  ) {
    const integration = await this.auth(req);
    this.checkSignature(integration, req);
    const next = await this.setup.applySettings(integration, {
      statusWebhookUrl: body?.statusWebhookUrl,
      siteUrl: body?.siteUrl,
      platform: body?.platform ?? 'woocommerce',
    }, integration.tenantId);
    await this.markVerified(integration);
    return { success: true, statusWebhookUrl: next.statusWebhookUrl };
  }

  // ═══════════════════════════════════════════════════════════

  private async auth(req: Request, pathKey?: string): Promise<Integration> {
    const header = (req.headers['x-nafaa-key'] as string | undefined)
      ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    const key = (pathKey ?? header ?? '').trim();
    const integration = key ? await this.integrations.verifyApiKey(key) : null;
    if (!integration) throw new UnauthorizedException('Nafaa key ghalat hai ya connection band hai');
    return integration;
  }

  private checkSignature(integration: Integration, req: Request): boolean {
    const config = readWebsiteConfig(integration.config);
    const result = verifySignature({
      rawBody: (req as any).rawBody,
      headers: req.headers as any,
      webhookSecret: integration.webhookSecret,
      // Ek-click se jura Shopify apni app ke secret se sign karta hai
      shopifySecret: this.shopify.isConnected(integration) ? process.env.SHOPIFY_CLIENT_SECRET ?? null : config.shopifySecret,
    });
    if (result === 'invalid') throw new UnauthorizedException('Signature match nahi hua — secret dobara check karein');
    if (result === 'missing' && config.requireSignature) {
      throw new UnauthorizedException('Signature zaroori hai (settings me "Sirf signed orders" on hai)');
    }
    return result === 'valid';
  }

  private async handleOrder(integration: Integration, req: Request, body: any) {
    // Indolj ka status webhook (order cancel / deliver) — naya order nahi
    if (isIndoljStatus(body)) {
      const st = String(body.status).toLowerCase();
      if (['cancelled', 'canceled'].includes(st)) {
        await this.orders.applyWebsiteUpdate(integration, String(body.order_id), { cancelled: true, reason: 'Indolj par cancel hua' }).catch(() => null);
      }
      await this.markVerified(integration);
      return { success: true, status: st };
    }
    const platform = detectPlatform(body, req.headers as any);
    const topic = String(req.headers['x-wc-webhook-topic'] ?? req.headers['x-shopify-topic'] ?? 'order');
    try {
      const signed = this.checkSignature(integration, req);
      const normalized = normalizeOrder(body, platform);
      const order = await this.orders.receive(integration, normalized, { signed });
      // Website par cancel hua aur hamara bill ban chuka tha → malik ko bata do
      if (normalized.cancelled && order.nafaaSaleId) {
        await this.orders.applyWebsiteUpdate(integration, normalized.externalOrderId, { cancelled: true, reason: 'Website par cancel hua' }).catch(() => null);
      }
      await this.markVerified(integration);
      await this.log(integration, topic, body, true);
      return {
        success: true,
        message: 'Order Nafaa me aa gaya ✅',
        nafaaOrderId: order.id,
        status: order.orderStatus,
      };
    } catch (e: any) {
      await this.log(integration, topic, body, false, e?.response?.message ?? e?.message);
      throw e;
    }
  }

  private async markVerified(integration: Integration) {
    if (integration.webhookVerified) return;
    await this.prisma.integration.update({
      where: { id: integration.id },
      data: { webhookVerified: true },
    }).catch(() => null);
  }

  private async log(integration: Integration, event: string, body: any, ok: boolean, error?: any) {
    await this.integrations.logWebhook({
      integrationId: integration.id,
      tenantId: integration.tenantId,
      source: 'website',
      event,
      method: 'POST',
      body,
      responseStatus: ok ? 200 : 400,
      processed: ok,
      errorMessage: error ? String(Array.isArray(error) ? error.join(', ') : error).slice(0, 500) : undefined,
    }).catch(() => null);
  }
}

import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { ItemMatch, OnlineOrdersService } from './online-orders.service';
import { WebsiteCatalogService } from './website-catalog.service';
import { WebsiteSetupService } from './website-setup.service';
import { StatusWebhookService } from './status-webhook.service';
import { readWebsiteConfig } from './website-config';
import { WooCommerceService } from './woocommerce.service';
import { ShopifyService } from './shopify.service';

// ═══════════════════════════════════════════════════════════════
// ONLINE ORDERS — dukandar ka order manage karne ka safha
// ═══════════════════════════════════════════════════════════════
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders')
export class OnlineOrdersController {
  constructor(private readonly svc: OnlineOrdersService) {}

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query('status') status?: string,
    @Query('integrationId') integrationId?: string,
    @Query('search') search?: string,
    @Query('payment') payment?: 'COD_DUE',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.list(user, scope, {
      status, integrationId, search, payment,
      limit: limit ? +limit : 50,
      offset: offset ? +offset : 0,
    });
  }

  @Get('live')
  @ApiOperation({ summary: 'Naye (pending) orders — sidebar badge aur popup ke liye' })
  live(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) {
    return this.svc.live(user, scope);
  }

  @Get(':id')
  detail(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.svc.detail(user, scope, id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Order accept → bill banta hai, stock kam hota hai' })
  accept(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { matches?: Record<string, ItemMatch>; shopId?: string },
  ) {
    return this.svc.accept(user, scope, id, body ?? {});
  }

  @Post(':id/status')
  status(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string; trackingNumber?: string; courierName?: string },
  ) {
    return this.svc.updateStatus(user, scope, id, body);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Order cancel — bill ban chuka ho to void, stock wapas' })
  cancel(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.svc.cancel(user, scope, id, body?.reason);
  }

  @Post(':id/payment-received')
  @ApiOperation({ summary: 'COD ka paisa mil gaya' })
  paid(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.svc.markPaid(user, scope, id);
  }
}

// ═══════════════════════════════════════════════════════════════
// Purane "Channel Orders" panel ke raste — ab naye service se chalte hain
// ═══════════════════════════════════════════════════════════════
@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations/orders')
export class LegacyChannelOrdersController {
  constructor(private readonly svc: OnlineOrdersService) {}

  @Post(':id/convert')
  async convert(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    const res = await this.svc.accept(user, scope, id, {});
    return res.sale;
  }

  @Post(':id/update-status')
  updateStatus(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
  ) {
    return this.svc.updateStatus(user, scope, id, body);
  }
}

// ═══════════════════════════════════════════════════════════════
// SALES CHANNELS — har jori hui website/store (Shopify jaisa)
// ═══════════════════════════════════════════════════════════════
@ApiTags('Online Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-store/channels')
export class ChannelsController {
  constructor(
    private readonly setup: WebsiteSetupService,
    private readonly orders: OnlineOrdersService,
    private readonly catalog: WebsiteCatalogService,
    private readonly statusHook: StatusWebhookService,
    private readonly woo: WooCommerceService,
    private readonly shopify: ShopifyService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Sab jore hue channels — sidebar aur hub ke liye' })
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) {
    return this.setup.listChannels(user, scope);
  }

  @Post()
  @ApiOperation({ summary: 'Naya website channel (custom website / Shopify / WooCommerce keys se)' })
  async create(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { type: 'CUSTOM_WEBSITE' | 'WOOCOMMERCE' | 'SHOPIFY'; displayName?: string; shopId?: string; siteUrl?: string },
  ) {
    const siteUrl = body?.siteUrl ? this.woo.normalizeSite(body.siteUrl) : undefined;
    const created = await this.setup.createChannel(user, { type: body?.type, displayName: body?.displayName, shopId: body?.shopId, siteUrl });
    return this.setup.channelOverview(user, created.id);
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Ek-click connect chal sakta hai? (API https par bahar se dikhta hai)' })
  capabilities() {
    return { publicApi: this.setup.publicApi(), shopifyOAuth: this.shopify.configured() };
  }

  // ─── WooCommerce ek click ───
  @Post('woocommerce/start')
  @ApiOperation({ summary: 'WooCommerce popup ka URL (site par Approve → khud jur jata hai)' })
  wooStart(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { siteUrl: string; displayName?: string; shopId?: string; channelId?: string; returnOrigin?: string },
  ) {
    return this.woo.start(user, body ?? ({} as any));
  }

  // ─── Shopify ek click ───
  @Post('shopify/start')
  @ApiOperation({ summary: 'Shopify popup ka URL (Install → khud jur jata hai)' })
  shopifyStart(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { shop: string; displayName?: string; shopId?: string; channelId?: string; returnOrigin?: string },
  ) {
    return this.shopify.start(user, body ?? ({} as any));
  }

  @Get(':id')
  overview(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.setup.channelOverview(user, id);
  }

  @Patch(':id/settings')
  settings(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.setup.updateSettings(user, id, body ?? {});
  }

  @Post(':id/rotate-keys')
  async rotate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    const integration = await this.setup.rotateKeys(user, id);
    // WooCommerce ke webhooks nayi key/secret wale URL par shift karo
    if (this.woo.isConnected(integration)) await this.woo.installWebhooks(integration);
    if (this.shopify.isConnected(integration)) await this.shopify.installWebhooks(integration);
    return this.setup.channelOverview(user, id);
  }

  @Post(':id/pause')
  pause(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.setup.setActive(user, id, false);
  }

  @Post(':id/resume')
  resume(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.setup.setActive(user, id, true);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.setup.removeChannel(user, id);
  }

  @Post(':id/test-order')
  @ApiOperation({ summary: 'Test order — poora flow check karne ke liye' })
  async testOrder(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, id);
    return this.orders.createTestOrder(user.tenantId, integration);
  }

  @Post(':id/test-status-webhook')
  async testStatusWebhook(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, id);
    if (this.woo.isConnected(integration)) {
      const client = this.woo.client(integration);
      try {
        await client!.ping();
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.message };
      }
    }
    if (this.shopify.isConnected(integration)) {
      try {
        await this.shopify.client(integration)!.graphql('{ shop { name } }');
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: e?.message };
      }
    }
    const url = readWebsiteConfig(integration.config).statusWebhookUrl;
    if (!url) return { ok: false, error: 'Status URL set nahi hai' };
    return this.statusHook.deliver(integration, url, {
      externalOrderId: 'TEST', externalOrderNumber: 'TEST', orderStatus: 'CONFIRMED', paymentStatus: 'PENDING',
    }, 'test');
  }

  // ─── WooCommerce: keys khud, webhooks dobara, stock, products ───
  @Post(':id/woocommerce/keys')
  wooKeys(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { consumerKey: string; consumerSecret: string; siteUrl?: string }) {
    return this.woo.connectWithKeys(user, id, body ?? ({} as any));
  }

  @Post(':id/woocommerce/repair')
  @ApiOperation({ summary: 'WooCommerce webhooks dobara lagao' })
  async wooRepair(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, id);
    const res = await this.woo.installWebhooks(integration);
    if (!res.ok) throw new BadRequestException(res.error ?? 'Webhooks nahi lage');
    return res;
  }

  @Post(':id/woocommerce/sync-stock')
  async wooStock(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, id);
    return this.woo.syncStock(integration);
  }

  @Post(':id/woocommerce/import-products')
  wooImport(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { updatePrice?: boolean; updateStock?: boolean }) {
    return this.woo.importFromWoo(user, id, body ?? {});
  }

  @Post(':id/woocommerce/export-products')
  wooExport(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { updatePrice?: boolean }) {
    return this.woo.exportToWoo(user, id, body ?? {});
  }

  // ─── Shopify: webhooks dobara, stock, products ───
  @Post(':id/shopify/repair')
  async shopifyRepair(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, id);
    await this.shopify.afterConnect(integration.id);
    const fresh = await this.setup.requireChannel(user.tenantId, id);
    return { ok: fresh.webhookVerified, installed: 0 };
  }

  @Post(':id/shopify/sync-stock')
  async shopifyStock(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, id);
    return this.shopify.syncStock(integration);
  }

  @Post(':id/shopify/import-products')
  shopifyImport(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { updatePrice?: boolean; updateStock?: boolean }) {
    return this.shopify.importFromShopify(user, id, body ?? {});
  }

  @Post(':id/shopify/export-products')
  shopifyExport(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { updatePrice?: boolean }) {
    return this.shopify.exportToShopify(user, id, body ?? {});
  }

  // ─── CSV (har platform) ───
  @Get(':id/export-products')
  @ApiOperation({ summary: 'Sab products (branch stock ke saath) — WooCommerce/Shopify CSV ke liye' })
  async exportProducts(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('shopId') shopId?: string) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, id);
    const config = readWebsiteConfig(integration.config);
    const branch = shopId ? await this.setup.validShopId(user.tenantId, shopId) : config.shopId || integration.shopId || null;
    return this.catalog.exportAll(user.tenantId, branch);
  }

  @Post(':id/import-products')
  @ApiOperation({ summary: 'Website ki CSV/list se products Nafaa me lao' })
  async importProducts(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { products: any[]; updatePrice?: boolean; updateStock?: boolean; shopId?: string },
  ) {
    this.setup.assertCanManage(user);
    const integration = await this.setup.requireChannel(user.tenantId, id);
    const config = readWebsiteConfig(integration.config);
    const shopId = body?.shopId
      ? await this.setup.validShopId(user.tenantId, body.shopId)
      : config.shopId || integration.shopId;
    return this.catalog.importProducts(integration, body?.products ?? [], {
      shopId,
      updatePrice: !!body?.updatePrice,
      updateStock: !!body?.updateStock,
    });
  }
}

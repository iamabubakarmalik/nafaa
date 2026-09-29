import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
import { ChannelCatalogService } from './channel-catalog.service';
import { CourierAccountsService } from './courier-accounts.service';
import { CourierSettings } from './courier-api/types';

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

  @Get('cod-summary')
  @ApiOperation({ summary: 'COD ka hisaab courier-wise — raste me, courier ke paas, mila, RTO %' })
  codSummary(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) {
    return this.svc.codSummary(user, scope);
  }

  @Post('cod/settle')
  @ApiOperation({ summary: 'Courier ne COD jama karwaya — chune orders paid' })
  settle(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { orderIds: string[]; reference?: string }) {
    return this.svc.settleCod(user, scope, body ?? ({} as any));
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Kai orders ek saath: accept / next / cancel / confirm' })
  bulk(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { action?: string; ids?: string[]; reason?: string }) {
    return this.svc.bulk(user, scope, body ?? {});
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

  @Post(':id/confirmation')
  @ApiOperation({ summary: 'COD confirm: customer ne haan / jawab nahi / mana' })
  confirmation(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { result?: string; note?: string },
  ) {
    return this.svc.setConfirmation(user, scope, id, body ?? {});
  }

  @Post(':id/status')
  status(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string; trackingNumber?: string; courierName?: string; courierCode?: string },
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

  @Post(':id/returned')
  @ApiOperation({ summary: 'RTO — parcel wapas aaya: bill void, stock wapas' })
  returned(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.markReturned(user, scope, id, body?.reason);
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
    private readonly channelCatalog: ChannelCatalogService,
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

  /** Shopify admin se app khuli → is dukaan ka wo store pehle se jura hai? */
  @Get('shopify/lookup')
  async shopifyLookup(@GetUser() user: AuthenticatedUser, @Query('shop') shop: string) {
    const domain = this.shopify.normalizeShop(shop);
    const list = await this.setup.listChannels(user, new ShopScope(null, true));
    const hit = list.find((c) => c.type === 'SHOPIFY' && c.siteUrl === `https://${domain}`);
    return { shop: domain, channelId: hit?.id ?? null, connected: !!hit?.oneClick };
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
        const c = await this.shopify.client(integration);
        if (!c) return { ok: false, error: 'Shopify jura nahi — Dobara install' };
        await c.graphql('{ shop { name } }');
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

  // ─── Products: website ⇄ Nafaa linking (variant tak) ───
  @Get(':id/catalog')
  @ApiOperation({ summary: 'Website ke products + variants, har ek ka Nafaa link ya salah' })
  channelProducts(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('refresh') refresh?: string) {
    return this.channelCatalog.catalog(user, id, refresh === '1');
  }

  @Get(':id/catalog/unlisted')
  @ApiOperation({ summary: 'Nafaa ke products jo is website par nahi' })
  unlisted(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('search') search?: string) {
    return this.channelCatalog.nafaaUnlisted(user, id, search);
  }

  @Post(':id/links')
  saveLinks(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { links: any[] }) {
    return this.channelCatalog.saveLinks(user, id, body?.links ?? []);
  }

  @Delete(':id/links/:mappingId')
  removeLink(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('mappingId') mappingId: string) {
    return this.channelCatalog.removeLink(user, id, mappingId);
  }

  @Post(':id/catalog/import')
  @ApiOperation({ summary: 'Chune hue website products Nafaa me (variants ke saath)' })
  importSelected(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { externalProductIds: string[] }) {
    return this.channelCatalog.importSelected(user, id, body?.externalProductIds ?? []);
  }

  @Post(':id/catalog/export')
  @ApiOperation({ summary: 'Chune hue Nafaa products website par (variants ke saath)' })
  exportSelected(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { productIds: string[] }) {
    this.setup.assertCanManage(user);
    return this.channelCatalog.exportSelected(user, id, body?.productIds ?? []);
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

// ═══════════════════════════════════════════════════════════════
// COURIERS — PostEx / Leopards ek click connect, order se booking,
// label, tracking. Baqi couriers "manual" (CN khud likho).
// ═══════════════════════════════════════════════════════════════
@ApiTags('Couriers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-store/couriers')
export class CouriersController {
  constructor(private readonly svc: CourierAccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Sab couriers — kaun jura hai, kaise jorna hai' })
  list(@GetUser() user: AuthenticatedUser) {
    return this.svc.list(user);
  }

  @Post(':code/connect')
  @ApiOperation({ summary: 'Key paste → courier se check → save (encrypted)' })
  connect(@GetUser() user: AuthenticatedUser, @Param('code') code: string, @Body() body: { credentials?: Record<string, string>; apiKey?: string; apiSecret?: string; settings?: CourierSettings }) {
    return this.svc.connect(user, code.toUpperCase(), body ?? {});
  }

  @Post(':code/test')
  test(@GetUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.svc.test(user, code.toUpperCase());
  }

  @Patch(':code')
  settings(@GetUser() user: AuthenticatedUser, @Param('code') code: string, @Body() body: { settings?: CourierSettings; active?: boolean }) {
    return this.svc.updateSettings(user, code.toUpperCase(), body ?? {});
  }

  @Delete(':code')
  disconnect(@GetUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.svc.disconnect(user, code.toUpperCase());
  }

  @Get(':code/options')
  @ApiOperation({ summary: 'Booking form: courier ke shehar + pickup address + services' })
  options(@GetUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.svc.options(user, code.toUpperCase());
  }

  @Get(':code/shipments')
  @ApiOperation({ summary: 'Courier ke parcels — filter: active/booked/attempted/returning/delivered/cod/returned/all' })
  shipments(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('code') code: string,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.shipments(user, scope, code.toUpperCase(), { filter, search, limit: limit ? +limit : 50, offset: offset ? +offset : 0 });
  }

  @Post(':code/bulk-book')
  @ApiOperation({ summary: 'Kai orders ek saath book' })
  bulkBook(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('code') code: string,
    @Body() body: { orderIds?: string[]; weightKg?: number; serviceType?: string },
  ) {
    return this.svc.bulkBook(user, scope, code.toUpperCase(), body ?? {});
  }

  @Get(':code/portal-parcels')
  @ApiOperation({ summary: 'Courier portal ke saare parcels (Nafaa ke bahar book hue bhi)' })
  portalParcels(
    @GetUser() user: AuthenticatedUser,
    @Param('code') code: string,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.portalParcels(user, code.toUpperCase(), { filter, search, limit: limit ? +limit : 50, offset: offset ? +offset : 0 });
  }

  @Post(':code/labels')
  @ApiOperation({ summary: 'Kai CN ka ek label PDF' })
  async labels(@GetUser() user: AuthenticatedUser, @Param('code') code: string, @Body() body: { trackingNumbers?: string[] }, @Res() res: Response) {
    const r = await this.svc.bulkLabels(user, code.toUpperCase(), body?.trackingNumbers ?? []);
    if (r.pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="labels.pdf"');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(r.pdf);
      return;
    }
    res.json({ url: r.url });
  }

  @Post(':code/sync')
  @ApiOperation({ summary: 'Abhi courier se sab parcels ka status lo' })
  sync(@GetUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.svc.syncNow(user, code.toUpperCase());
  }
}

/** Order par courier booking — online-orders/:id/courier/* */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/:id/courier')
export class OrderCourierController {
  constructor(private readonly svc: CourierAccountsService) {}

  @Post('book')
  @ApiOperation({ summary: 'Courier par book → CN + label khud' })
  book(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { courier: string; cityId?: string; weightKg?: number; pieces?: number; codAmount?: number; notes?: string; serviceType?: string },
  ) {
    return this.svc.book(user, scope, id, body ?? ({} as any));
  }

  @Post('cancel')
  cancel(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.svc.cancelBooking(user, scope, id);
  }

  @Post('refresh')
  refresh(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.svc.refresh(user, scope, id);
  }

  @Get('label')
  @ApiOperation({ summary: 'Label: PDF (PostEx) ya link (Leopards)' })
  async label(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Res() res: Response) {
    const r = await this.svc.label(user, scope, id);
    if (r.pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="label.pdf"');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(r.pdf);
      return;
    }
    res.json({ url: r.url });
  }
}

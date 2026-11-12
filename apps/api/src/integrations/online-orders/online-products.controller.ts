import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { BulkAction, GridFilter, OnlineProductsService, Selection, SettingsBody } from './online-products.service';
import type { LinkInput } from './channel-catalog.service';
import { BackorderSaveBody, BackorderService } from './backorder-stock';
import { StockHandoverService } from './stock-handover.service';
import { PriceRecoveryChoice, PriceSourceService } from './price-source.service';
import { ChannelSyncService } from './channel-sync.service';

/**
 * Online products: one place for linking, channel prices and stock across
 * Daraz, WooCommerce and Shopify. Reading needs `online_products.view`,
 * every change `online_products.manage` (permission-routes).
 */
@ApiTags('Online Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-products')
export class OnlineProductsController {
  constructor(
    private readonly svc: OnlineProductsService,
    private readonly backorders: BackorderService,
    private readonly handover: StockHandoverService,
    private readonly prices: PriceSourceService,
    private readonly sync: ChannelSyncService,
  ) {}

  @Get('channels')
  @ApiOperation({ summary: 'Connected product channels with price rule, stock buffer and link counts' })
  channels(@GetUser() user: AuthenticatedUser) {
    return this.svc.channels(user);
  }

  @Get('grid')
  @ApiOperation({ summary: 'Nafaa products and sizes against every channel (paginated)' })
  grid(
    @GetUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filter') filter?: GridFilter,
    @Query('channelId') channelId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.svc.grid(user, {
      page: Number(page) || 1, limit: Number(limit) || 30, search, filter, channelId: channelId || undefined,
      categoryId: categoryId || undefined, brandId: brandId || undefined, productId: productId || undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Counts for the filters (not linked, errors, price differs, out of stock)' })
  summary(@GetUser() user: AuthenticatedUser, @Query('channelId') channelId?: string, @Query('categoryId') categoryId?: string, @Query('brandId') brandId?: string) {
    return this.svc.summary(user, channelId || undefined, { categoryId: categoryId || undefined, brandId: brandId || undefined });
  }

  @Get('issues')
  @ApiOperation({ summary: 'What needs attention per channel, each with one fix (Masle panel)' })
  issues(@GetUser() user: AuthenticatedUser) {
    return this.svc.issues(user);
  }

  @Post('channels/:id/link-sure')
  @ApiOperation({ summary: 'Link every exact SKU/barcode match on this channel' })
  linkSure(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.linkSure(user, id);
  }

  @Post('channels/:id/fix-size-less')
  @ApiOperation({ summary: 'Remove links made without a size on products that have sizes' })
  fixSizeLess(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.fixSizeLess(user, id);
  }

  @Get('channels/:id/suggestions')
  @ApiOperation({ summary: 'Channel list with suggested Nafaa matches (SKU, name, similar name)' })
  suggestions(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('refresh') refresh?: string) {
    return this.svc.suggestions(user, id, refresh === '1');
  }

  @Post('channels/:id/links')
  @ApiOperation({ summary: 'Link channel items to Nafaa products/sizes' })
  link(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { links?: LinkInput[] }) {
    return this.svc.link(user, id, body?.links ?? []);
  }

  @Post('channels/:id/import')
  @ApiOperation({ summary: 'Create channel items in Nafaa (with sizes) and link them' })
  importItems(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { externalProductIds?: string[] }) {
    return this.svc.importItems(user, id, body?.externalProductIds ?? []);
  }

  @Get('channels/:id/link-plan')
  @ApiOperation({ summary: 'Which Nafaa size each channel SKU of one product would link to (SKU, options, name)' })
  linkPlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('externalProductId') externalProductId: string, @Query('productId') productId: string) {
    return this.svc.linkPlan(user, id, externalProductId, productId);
  }

  @Post('channels/:id/link-into')
  @ApiOperation({ summary: 'Link a channel product per SKU into an existing Nafaa product; missing sizes are made' })
  linkInto(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { externalProductId?: string; productId?: string; variants?: Array<{ externalVariantId: string | null; variantId: string | null }>; confirm?: boolean }) {
    return this.svc.linkInto(user, id, body ?? {});
  }

  @Get('channels/:id/stock-holds')
  @ApiOperation({ summary: 'Links waiting for the merchant to pick Nafaa or channel stock' })
  stockHolds(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.handover.holds(user, id, { page: Number(page) || 1, limit: Number(limit) || 50 });
  }

  @Post('channels/:id/stock-holds/resolve')
  @ApiOperation({ summary: 'Take the channel stock into Nafaa, or send Nafaa stock, for held links (owner/manager)' })
  resolveHolds(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { action?: string; mappingIds?: string[]; all?: boolean }) {
    return this.handover.resolve(user, id, body ?? {});
  }

  @Post('links/counting')
  @ApiOperation({ summary: 'Start (or stop) Nafaa counting stock on the channel for items the channel does not count (owner/manager)' })
  counting(@GetUser() user: AuthenticatedUser, @Body() body: { mappingIds?: string[]; on?: boolean }) {
    return this.handover.setCounting(user, body ?? {});
  }

  @Get('channels/:id/stock-recovery')
  @ApiOperation({ summary: 'Import fix preview: items the import left at 0 that were switched to counted, and wiped stock found (read only)' })
  stockRecovery(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.handover.recoveryPreview(user, id);
  }

  @Post('channels/:id/stock-recovery/apply')
  @ApiOperation({ summary: 'Import fix: tracking off again on Shopify for picked items, old stock back in Nafaa (owner/manager)' })
  applyRecovery(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { mappingIds?: string[] }) {
    return this.handover.recoveryApply(user, id, body?.mappingIds ?? []);
  }

  @Get('channels/:id/price-holds')
  @ApiOperation({ summary: 'Links whose price changed on the channel after Nafaa\'s last push, waiting for a decision' })
  priceHolds(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('reason') reason?: string) {
    return this.prices.holds(user, id, { page: Number(page) || 1, limit: Number(limit) || 50, reason });
  }

  @Post('channels/:id/price-holds/resolve')
  @ApiOperation({ summary: 'Send Nafaa\'s price ("nafaa"), take the channel price into Nafaa ("website") or leave the channel price as it is ("keep", big price jumps) for held links (owner/manager)' })
  resolvePriceHolds(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { action?: string; mappingIds?: string[]; all?: boolean; reason?: string }) {
    return this.prices.resolve(user, id, body ?? {});
  }

  @Get('channels/:id/price-recovery')
  @ApiOperation({ summary: 'Price recovery preview: links where Nafaa re-sent its price over a channel price (read only)' })
  priceRecovery(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.prices.recoveryPreview(user, id);
  }

  @Post('channels/:id/price-recovery/apply')
  @ApiOperation({ summary: 'Price recovery: channel price back (Nafaa and channel) or keep Nafaa\'s price, per picked link (owner/manager)' })
  applyPriceRecovery(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { items?: Array<{ mappingId: string; choice: PriceRecoveryChoice }> }) {
    return this.prices.recoveryApply(user, id, body?.items ?? []);
  }

  @Get('sync-history')
  @ApiOperation({ summary: 'Channel sync history (price, name, description, pictures, stock, publish) for a product or a channel' })
  syncHistory(@GetUser() user: AuthenticatedUser, @Query('productId') productId?: string, @Query('channelId') channelId?: string, @Query('limit') limit?: string) {
    return this.prices.history(user, { productId, channelId, limit: Number(limit) || 50 });
  }

  @Post('publish-marks')
  @ApiOperation({ summary: 'Mark (on) or unmark (off) Nafaa products to be made on channels (all Shopify/Woo channels when none given)' })
  publishMarks(@GetUser() user: AuthenticatedUser, @Body() body: { productIds?: string[]; channelIds?: string[]; on?: boolean }) {
    return this.sync.mark(user, body ?? {});
  }

  @Get('channels/:id/publish-marks')
  @ApiOperation({ summary: 'Products marked to be made on this channel' })
  channelPublishMarks(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sync.marks(user, id);
  }

  @Get('price-history')
  @ApiOperation({ summary: 'Channel price history for a product or a channel' })
  priceHistory(@GetUser() user: AuthenticatedUser, @Query('productId') productId?: string, @Query('channelId') channelId?: string, @Query('limit') limit?: string) {
    return this.prices.history(user, { productId, channelId, limit: Number(limit) || 50 });
  }

  @Post('channels/:id/import-new')
  @ApiOperation({ summary: 'Bring every new channel product with no Nafaa match into Nafaa (background job)' })
  importNew(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.importNew(user, id);
  }

  @Put('channels/:id/settings')
  @ApiOperation({ summary: 'Channel price rule, price push and stock buffer' })
  settings(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: SettingsBody) {
    return this.svc.saveSettings(user, id, body ?? {});
  }

  @Post('channels/:id/sync')
  @ApiOperation({ summary: 'Send stock and prices to one channel now' })
  syncChannel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.syncChannel(user, id);
  }

  @Post('items/:productId/sync')
  @ApiOperation({ summary: 'Send one product\'s stock and prices to every linked channel now' })
  syncProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string, @Query('content') content?: string) {
    return this.svc.syncProduct(user, productId, { content: content === '1' });
  }

  @Put('links/:mappingId')
  @ApiOperation({ summary: 'Listed, own stock share, own price and sale price for one link' })
  updateLink(@GetUser() user: AuthenticatedUser, @Param('mappingId') mappingId: string, @Body() body: { listed?: boolean; allocQty?: number | null; priceOverride?: number | null; compareAtPrice?: number | null }) {
    return this.svc.updateLink(user, mappingId, body ?? {});
  }

  @Post('channels/:id/website-visibility')
  @ApiOperation({ summary: 'Nafaa Store column: show or hide picked products on the website' })
  websiteVisibility(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { selection?: Selection; productIds?: string[]; visible?: boolean }) {
    return this.svc.setStoreVisible(user, id, body ?? {});
  }

  @Post('bulk')
  @ApiOperation({ summary: 'One action on picked products (or all matching): listed, stock share, price, sale price, push, publish' })
  async bulk(@GetUser() user: AuthenticatedUser, @Body() body: { selection?: Selection; action?: BulkAction | 'backorder'; channelId?: string | null; value?: unknown }) {
    // Sell when out of stock is a product setting, so it is set here for every channel at once.
    if (body?.action === 'backorder') {
      const ids = await this.svc.selectionIds(user, body.selection);
      if (!ids.length) throw new BadRequestException('Koi product nahi chuna');
      return { updated: await this.backorders.bulk(user, ids, body.value === null ? null : body.value !== false) };
    }
    return this.svc.bulk(user, (body ?? {}) as { selection?: Selection; action?: BulkAction; channelId?: string | null; value?: unknown });
  }

  @Get('items/:productId/backorder')
  @ApiOperation({ summary: 'Sell when out of stock: product, size and channel settings, owed units and waiting orders' })
  backorder(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.backorders.get(user, productId);
  }

  @Put('items/:productId/backorder')
  @ApiOperation({ summary: 'Save sell-when-out-of-stock settings and send them to the channels' })
  saveBackorder(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string, @Body() body: BackorderSaveBody) {
    return this.backorders.save(user, productId, body ?? {});
  }

  @Get('backorders')
  @ApiOperation({ summary: 'Accepted orders waiting for stock (backorder lines), oldest first' })
  waiting(@GetUser() user: AuthenticatedUser, @Query('productId') productId?: string) {
    return this.backorders.waiting(user.tenantId, productId ? productId.split(',').slice(0, 200) : undefined);
  }

  @Post('channels/:id/import-all')
  @ApiOperation({ summary: 'Make every unmatched channel item in Nafaa (background job)' })
  importAll(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.importAll(user, id);
  }

  @Post('channels/:id/link-all')
  @ApiOperation({ summary: 'Link every SKU/barcode match (background job)' })
  linkAll(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.linkAll(user, id);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Running and recent catalog jobs with progress' })
  jobs(@GetUser() user: AuthenticatedUser) {
    return this.svc.jobsList(user);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'One catalog job with progress' })
  job(@GetUser() user: AuthenticatedUser, @Param('jobId') jobId: string) {
    return this.svc.job(user, jobId);
  }

  @Post('jobs/:jobId/cancel')
  @ApiOperation({ summary: 'Stop a running catalog job' })
  cancelJob(@GetUser() user: AuthenticatedUser, @Param('jobId') jobId: string) {
    return this.svc.cancelJob(user, jobId);
  }

  @Put('links/:mappingId/price')
  @ApiOperation({ summary: 'Own price for one link (null = channel rule)' })
  setPrice(@GetUser() user: AuthenticatedUser, @Param('mappingId') mappingId: string, @Body() body: { priceOverride?: number | null }) {
    return this.svc.setPrice(user, mappingId, body?.priceOverride ?? null);
  }

  @Get('suspect-links')
  @ApiOperation({ summary: 'Links that look like two different items (no shared name word and no code match, or prices more than 3x apart)' })
  suspectLinks(@GetUser() user: AuthenticatedUser, @Query('channelId') channelId?: string) {
    return this.svc.suspectLinks(user, channelId || undefined);
  }

  @Post('suspect-links/ok')
  @ApiOperation({ summary: 'Mark flagged links as checked ("Theek hai")' })
  markLinksOk(@GetUser() user: AuthenticatedUser, @Body() body: { mappingIds?: string[] }) {
    return this.svc.markLinksOk(user, body?.mappingIds ?? []);
  }

  @Delete('links/:mappingId')
  @ApiOperation({ summary: 'Remove a link' })
  unlink(@GetUser() user: AuthenticatedUser, @Param('mappingId') mappingId: string) {
    return this.svc.unlink(user, mappingId);
  }
}

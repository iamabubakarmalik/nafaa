import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { GridFilter, OnlineProductsService } from './online-products.service';
import type { LinkInput } from './channel-catalog.service';
import type { PriceRule } from './channel-price';

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
  constructor(private readonly svc: OnlineProductsService) {}

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
  ) {
    return this.svc.grid(user, { page: Number(page) || 1, limit: Number(limit) || 30, search, filter, channelId: channelId || undefined });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Counts for the filters (not linked, errors, price differs, out of stock)' })
  summary(@GetUser() user: AuthenticatedUser, @Query('channelId') channelId?: string) {
    return this.svc.summary(user, channelId || undefined);
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

  @Put('channels/:id/settings')
  @ApiOperation({ summary: 'Channel price rule, price push and stock buffer' })
  settings(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { priceRule?: Partial<PriceRule>; pushPrice?: boolean; stockBuffer?: number }) {
    return this.svc.saveSettings(user, id, body ?? {});
  }

  @Post('channels/:id/sync')
  @ApiOperation({ summary: 'Send stock and prices to one channel now' })
  syncChannel(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.syncChannel(user, id);
  }

  @Post('items/:productId/sync')
  @ApiOperation({ summary: 'Send one product\'s stock and prices to every linked channel now' })
  syncProduct(@GetUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.svc.syncProduct(user, productId);
  }

  @Put('links/:mappingId/price')
  @ApiOperation({ summary: 'Own price for one link (null = channel rule)' })
  setPrice(@GetUser() user: AuthenticatedUser, @Param('mappingId') mappingId: string, @Body() body: { priceOverride?: number | null }) {
    return this.svc.setPrice(user, mappingId, body?.priceOverride ?? null);
  }

  @Delete('links/:mappingId')
  @ApiOperation({ summary: 'Remove a link' })
  unlink(@GetUser() user: AuthenticatedUser, @Param('mappingId') mappingId: string) {
    return this.svc.unlink(user, mappingId);
  }
}

import { Body, Controller, Get, Param, Post, Put, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { IntegrationService } from '../../core/integration.service';
import { readWebsiteConfig } from '../website-config';
import { assertManager } from '../order-costs.service';
import { ConversionService } from './conversion.service';

/**
 * Merchant side of the conversion tools. Under `online-orders`, so reading
 * needs online_orders.view and writes online_orders.manage
 * (permission-routes); coupon rules are saved by the owner or a manager.
 */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/conversion')
export class ConversionController {
  constructor(private readonly svc: ConversionService) {}

  @Get('together')
  @ApiOperation({ summary: 'Strongest bought-together pairs (all products) or ?productId= for one product' })
  together(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('productId') productId?: string) {
    return productId ? this.svc.together(user.tenantId, scope.shopId ?? null, { productId }, 8) : this.svc.overview(user, scope);
  }

  @Get('free-shipping')
  @ApiOperation({ summary: 'Free-delivery threshold advice from the last 90 days of online orders' })
  freeShipping(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope) {
    return this.svc.freeShipping(user, scope);
  }

  @Get('coupons')
  @ApiOperation({ summary: 'Automatic coupon codes with status and totals (?kind, ?status=OPEN|SENT|USED|EXPIRED)' })
  coupons(@GetUser() user: AuthenticatedUser, @Query('kind') kind?: string, @Query('status') status?: string) {
    return this.svc.coupons(user, { kind, status });
  }

  @Put('coupons/settings')
  saveSettings(@GetUser() user: AuthenticatedUser, @Body() body: unknown) {
    assertManager(user);
    return this.svc.saveSettings(user, body);
  }

  @Post('coupons/run')
  @ApiOperation({ summary: 'Make codes now for the rules that are on' })
  run(@GetUser() user: AuthenticatedUser) {
    assertManager(user);
    return this.svc.runNow(user);
  }

  @Post('coupons/:id/sent')
  sent(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.markSent(user, id);
  }
}

/** Website side: bought-together for the order-form snippet and the website API. */
@ApiTags('Website API (public)')
@Public()
@Controller('integrations/website/v1')
export class ConversionPublicController {
  constructor(private readonly svc: ConversionService, private readonly integrations: IntegrationService) {}

  @Get('form/:key/together')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: 'Order form: products bought together with ?sku= or ?product= (id)' })
  formTogether(@Param('key') key: string, @Query('sku') sku?: string, @Query('product') product?: string, @Query('limit') limit?: string) {
    return this.svc.formTogether(key, { sku, productId: product }, Math.min(8, Number(limit) || 4));
  }

  @Get('recommendations')
  @Throttle({ default: { limit: 180, ttl: 60_000 } })
  @ApiHeader({ name: 'X-Nafaa-Key', required: true })
  @ApiOperation({ summary: 'Frequently bought together / upsell for a product: ?sku= or ?productId=, &limit= (max 12)' })
  async recommendations(@Req() req: Request, @Query('sku') sku?: string, @Query('productId') productId?: string, @Query('limit') limit?: string) {
    const key = String(req.headers['x-nafaa-key'] ?? '').trim();
    const integration = key ? await this.integrations.verifyApiKey(key) : null;
    if (!integration) throw new UnauthorizedException('Nafaa key ghalat hai ya connection band hai');
    const shopId = readWebsiteConfig(integration.config).shopId ?? integration.shopId;
    const r = await this.svc.together(integration.tenantId, shopId, { sku, productId }, Math.min(12, Number(limit) || 4));
    return { product: r.product, items: r.items.map((i) => ({ id: i.id, sku: i.sku, name: i.name, price: i.price, image: i.image, inStock: i.inStock, boughtTogether: i.together })) };
  }
}

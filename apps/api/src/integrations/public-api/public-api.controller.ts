import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ApiKeysService } from './api-keys.service';
import { ListQuery, PublicApiService } from './public-api.service';
import { WebhooksService } from './webhooks.service';
import { WEBHOOK_EVENTS } from './events';

/**
 * NAFAA PUBLIC API v1 — `https://api.nafaa.pk/api/v1/...`
 * Auth: `Authorization: Bearer nfk_…` (Settings → Developer se key).
 * Zapier / Make: POST /v1/webhooks (subscribe), DELETE /v1/webhooks/:id.
 */
@ApiTags('Nafaa Public API v1')
@Public()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('v1')
export class PublicApiController {
  constructor(
    private readonly keys: ApiKeysService,
    private readonly api: PublicApiService,
    private readonly hooks: WebhooksService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Key kis business ki hai (connection test)' })
  async me(@Req() req: Request) {
    return this.api.me(await this.keys.authenticate(req));
  }

  @Get('products')
  async products(@Req() req: Request, @Query() q: ListQuery) {
    return this.api.products(await this.keys.authenticate(req), q);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'id, SKU ya barcode se' })
  async product(@Req() req: Request, @Param('id') id: string) {
    return this.api.product(await this.keys.authenticate(req), id);
  }

  @Get('stock')
  async stock(@Req() req: Request, @Query() q: ListQuery) {
    return this.api.stock(await this.keys.authenticate(req), q);
  }

  @Get('customers')
  async customers(@Req() req: Request, @Query() q: ListQuery) {
    return this.api.customers(await this.keys.authenticate(req), q);
  }

  @Get('customers/:id')
  async customer(@Req() req: Request, @Param('id') id: string) {
    return this.api.customer(await this.keys.authenticate(req), id);
  }

  @Post('customers')
  @HttpCode(200)
  @ApiOperation({ summary: 'Naya customer (same phone ho to wahi wapas) — write key' })
  async createCustomer(@Req() req: Request, @Body() body: any) {
    return this.api.createCustomer(await this.keys.authenticate(req, 'write'), body ?? {});
  }

  @Get('sales')
  async sales(@Req() req: Request, @Query() q: ListQuery) {
    return this.api.sales(await this.keys.authenticate(req), q);
  }

  @Get('sales/:id')
  @ApiOperation({ summary: 'id ya sale number se' })
  async sale(@Req() req: Request, @Param('id') id: string) {
    return this.api.sale(await this.keys.authenticate(req), id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Online orders (website, Daraz, Shopify…)' })
  async orders(@Req() req: Request, @Query() q: ListQuery) {
    return this.api.orders(await this.keys.authenticate(req), q);
  }

  @Get('orders/:id')
  async order(@Req() req: Request, @Param('id') id: string) {
    return this.api.order(await this.keys.authenticate(req), id);
  }

  /* ─── Webhooks (Zapier / Make "REST hooks") ─── */

  @Get('webhooks/events')
  events() {
    return WEBHOOK_EVENTS;
  }

  @Get('webhooks/sample/:type')
  @ApiOperation({ summary: 'Event ki asli misaal (Zapier sample data)' })
  async sample(@Req() req: Request, @Param('type') type: string) {
    const c = await this.keys.authenticate(req);
    return this.hooks.sample(c.tenantId, type);
  }

  @Post('webhooks')
  @HttpCode(201)
  @ApiOperation({ summary: 'Subscribe — { url, events: ["sale.created"] }' })
  async subscribe(@Req() req: Request, @Body() body: { url?: string; events?: string[]; event?: string; description?: string }) {
    const c = await this.keys.authenticate(req);
    const events = body?.events ?? (body?.event ? [body.event] : undefined);
    return this.hooks.create(c.tenantId, { url: body?.url, events, description: body?.description }, 'api', { keyId: c.keyId, shopId: c.shopId });
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: 'Unsubscribe' })
  async unsubscribe(@Req() req: Request, @Param('id') id: string) {
    const c = await this.keys.authenticate(req);
    return this.hooks.remove(c.tenantId, id, c.keyId);
  }
}

/** Settings → Developer (dukaan-daar ka apna safha) */
@ApiTags('Developer settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('developer')
export class DeveloperController {
  constructor(private readonly keys: ApiKeysService, private readonly hooks: WebhooksService) {}

  @Get()
  async overview(@GetUser() user: AuthenticatedUser) {
    this.keys.assertManager(user);
    const [keys, hooks] = await Promise.all([this.keys.list(user.tenantId), this.hooks.overview(user.tenantId)]);
    return { keys, ...hooks, events: WEBHOOK_EVENTS };
  }

  @Post('keys')
  createKey(@GetUser() user: AuthenticatedUser, @Body() body: { name?: string; scope?: string; shopId?: string | null }) {
    return this.keys.create(user, body ?? {});
  }

  @Delete('keys/:id')
  revokeKey(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.keys.revoke(user, id);
  }

  @Post('webhooks')
  createHook(@GetUser() user: AuthenticatedUser, @Body() body: { url?: string; events?: string[]; description?: string }) {
    this.keys.assertManager(user);
    return this.hooks.create(user.tenantId, body ?? {});
  }

  @Patch('webhooks/:id')
  updateHook(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { url?: string; events?: string[]; description?: string; active?: boolean }) {
    this.keys.assertManager(user);
    return this.hooks.update(user.tenantId, id, body ?? {});
  }

  @Delete('webhooks/:id')
  removeHook(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.keys.assertManager(user);
    return this.hooks.remove(user.tenantId, id);
  }

  @Post('webhooks/:id/test')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  testHook(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.keys.assertManager(user);
    return this.hooks.test(user.tenantId, id);
  }

  @Post('webhooks/:id/secret')
  rotate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.keys.assertManager(user);
    return this.hooks.rotateSecret(user.tenantId, id);
  }
}

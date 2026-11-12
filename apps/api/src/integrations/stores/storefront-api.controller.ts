/**
 * Public storefront API (`/api/storefront/v1`) used by apps/storefront.
 * No login. A preview token (`?preview=`) opens the draft theme; the
 * `x-store-access` header opens a password-protected store; the
 * `x-store-customer` header carries a shopper session.
 */
import { Body, Controller, Delete, Get, Header, Headers, HttpCode, Ip, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { ConversionService } from '../online-orders/conversion/conversion.service';
import { PublicAccess, StoreAccessService } from './store-access.service';
import { ListQuery, StoreCatalogService } from './store-catalog.service';
import { StoreCheckoutService } from './store-checkout.service';
import { StoreCustomersService } from './store-customers.service';
import { StoreAnalyticsService } from './store-analytics.service';
import { StoreDomainsService } from './store-domains.service';
import { StorePublicService } from './store-public.service';
import { StoreThemeService } from './store-theme.service';
import { pkCityList } from './lib/shipping';

const CACHE = 'public, s-maxage=60, stale-while-revalidate=600';
const NO_STORE = 'no-store';

@ApiTags('Nafaa Stores (storefront)')
@Public()
@Controller('storefront/v1')
export class StorefrontApiController {
  constructor(
    private readonly access: StoreAccessService,
    private readonly catalog: StoreCatalogService,
    private readonly checkout: StoreCheckoutService,
    private readonly customers: StoreCustomersService,
    private readonly analytics: StoreAnalyticsService,
    private readonly domains: StoreDomainsService,
    private readonly content: StorePublicService,
    private readonly theme: StoreThemeService,
    private readonly conversion: ConversionService,
  ) {}

  private acc(preview?: string, access?: string): PublicAccess {
    return { preview: preview || null, access: access || null };
  }

  private async base(storeId: string, a: PublicAccess) {
    const ctx = await this.access.publicStore(storeId, a);
    return { ctx, base: await this.access.storeBase(ctx.store) };
  }

  @Get('resolve') @Header('Cache-Control', CACHE) @Throttle({ default: { limit: 300, ttl: 60_000 } })
  resolve(@Query('host') host?: string, @Query('slug') slug?: string) { return this.domains.resolve({ host, slug }); }

  @Get('pk-cities') @Header('Cache-Control', 'public, max-age=86400')
  cities() { return pkCityList(); }

  @Get('s/:storeId/bootstrap') @Header('Cache-Control', CACHE) @Throttle({ default: { limit: 300, ttl: 60_000 } })
  bootstrap(@Param('storeId') id: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.content.bootstrap(id, this.acc(p, a)); }

  @Post('s/:storeId/unlock') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  unlock(@Param('storeId') id: string, @Body() b: { password?: string }) { return this.content.unlock(id, b?.password ?? ''); }

  @Get('s/:storeId/theme') @Header('Cache-Control', NO_STORE)
  async themeDoc(@Param('storeId') id: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) {
    return this.theme.publicTheme(await this.access.publicStore(id, this.acc(p, a)));
  }

  // ─── products & collections ───

  @Get('s/:storeId/products') @Header('Cache-Control', CACHE) @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async products(@Param('storeId') id: string, @Query() q: ListQuery & { collection?: string; preview?: string }, @Headers('x-store-access') a?: string) {
    const { ctx, base } = await this.base(id, this.acc(q.preview, a));
    if (q.collection) return (await this.catalog.collection(ctx, q.collection, q, base)).products;
    return this.catalog.list(ctx, q);
  }

  @Get('s/:storeId/products/by-ids') @Header('Cache-Control', CACHE)
  async byIds(@Param('storeId') id: string, @Query('ids') ids?: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) {
    const ctx = await this.access.publicStore(id, this.acc(p, a));
    return { items: await this.catalog.cards(ctx, String(ids ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 50)) };
  }

  @Get('s/:storeId/products/:handle') @Header('Cache-Control', CACHE) @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async product(@Param('storeId') id: string, @Param('handle') h: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) {
    const { ctx, base } = await this.base(id, this.acc(p, a));
    return this.catalog.product(ctx, h, base);
  }

  @Get('s/:storeId/products/:handle/reviews') @Header('Cache-Control', CACHE)
  async reviews(@Param('storeId') id: string, @Param('handle') h: string, @Query('page') page?: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) {
    return this.catalog.reviews(await this.access.publicStore(id, this.acc(p, a)), h, page);
  }

  @Get('s/:storeId/products/:handle/together') @Header('Cache-Control', CACHE)
  async together(@Param('storeId') id: string, @Param('handle') h: string, @Query('limit') limit?: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) {
    const ctx = await this.access.publicStore(id, this.acc(p, a));
    const productId = await this.catalog.productIdByHandle(ctx, h);
    if (!productId) return { items: [] };
    const n = Math.max(1, Math.min(8, Number(limit) || 4));
    const r = await this.conversion.together(ctx.tenantId, ctx.shopId, { productId }, n + 4).catch(() => ({ items: [] as Array<{ id: string }> }));
    return { items: (await this.catalog.cards(ctx, (r.items as Array<{ id: string }>).map((i) => i.id))).slice(0, n) };
  }

  @Get('s/:storeId/collections') @Header('Cache-Control', CACHE)
  async collections(@Param('storeId') id: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) {
    return this.catalog.collections(await this.access.publicStore(id, this.acc(p, a)));
  }

  @Get('s/:storeId/collections/:handle') @Header('Cache-Control', CACHE) @Throttle({ default: { limit: 300, ttl: 60_000 } })
  async collection(@Param('storeId') id: string, @Param('handle') h: string, @Query() q: ListQuery & { preview?: string }, @Headers('x-store-access') a?: string) {
    const { ctx, base } = await this.base(id, this.acc(q.preview, a));
    return this.catalog.collection(ctx, h, q, base);
  }

  @Get('s/:storeId/search/suggest') @Header('Cache-Control', CACHE) @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async suggest(@Param('storeId') id: string, @Query('q') q?: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) {
    return this.catalog.suggest(await this.access.publicStore(id, this.acc(p, a)), q ?? '');
  }

  // ─── content ───

  @Get('s/:storeId/pages/:handle') @Header('Cache-Control', CACHE)
  page(@Param('storeId') id: string, @Param('handle') h: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.content.page(id, this.acc(p, a), h); }

  @Get('s/:storeId/policies/:kind') @Header('Cache-Control', CACHE)
  policy(@Param('storeId') id: string, @Param('kind') k: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.content.policy(id, this.acc(p, a), k); }

  @Get('s/:storeId/blogs/:blog') @Header('Cache-Control', CACHE)
  blog(@Param('storeId') id: string, @Param('blog') b: string, @Query('page') page?: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.content.blog(id, this.acc(p, a), b, page); }

  @Get('s/:storeId/blogs/:blog/:post') @Header('Cache-Control', CACHE)
  post(@Param('storeId') id: string, @Param('blog') b: string, @Param('post') h: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.content.post(id, this.acc(p, a), b, h); }

  @Get('s/:storeId/redirect') @Header('Cache-Control', CACHE)
  redirect(@Param('storeId') id: string, @Query('path') path?: string) { return this.content.redirect(id, path ?? ''); }

  @Get('s/:storeId/sitemap') @Header('Cache-Control', 'public, s-maxage=3600')
  async sitemap(@Param('storeId') id: string) {
    const { ctx, base } = await this.base(id, {});
    return this.catalog.sitemap(ctx, base);
  }

  // ─── cart & checkout ───

  @Post('s/:storeId/carts') @Header('Cache-Control', NO_STORE) @Throttle({ default: { limit: 30, ttl: 60_000 } })
  createCart(@Param('storeId') id: string, @Body() b: any, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.createCart(id, this.acc(p, a), b ?? {}); }

  @Get('s/:storeId/carts/:token') @Header('Cache-Control', NO_STORE)
  cart(@Param('storeId') id: string, @Param('token') t: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.getCart(id, this.acc(p, a), t); }

  @Post('s/:storeId/carts/:token/lines') @HttpCode(200) @Header('Cache-Control', NO_STORE) @Throttle({ default: { limit: 60, ttl: 60_000 } })
  addLine(@Param('storeId') id: string, @Param('token') t: string, @Body() b: any, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.addLine(id, this.acc(p, a), t, b ?? {}); }

  @Patch('s/:storeId/carts/:token/lines/:lineId') @Header('Cache-Control', NO_STORE)
  setLine(@Param('storeId') id: string, @Param('token') t: string, @Param('lineId') l: string, @Body() b: any, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.setLine(id, this.acc(p, a), t, l, b?.quantity); }

  @Delete('s/:storeId/carts/:token/lines/:lineId') @Header('Cache-Control', NO_STORE)
  removeLine(@Param('storeId') id: string, @Param('token') t: string, @Param('lineId') l: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.setLine(id, this.acc(p, a), t, l, 0); }

  @Patch('s/:storeId/carts/:token') @Header('Cache-Control', NO_STORE)
  updateCart(@Param('storeId') id: string, @Param('token') t: string, @Body() b: any, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.updateCart(id, this.acc(p, a), t, b ?? {}); }

  @Get('s/:storeId/carts/:token/shipping-rates') @Header('Cache-Control', NO_STORE)
  rates(@Param('storeId') id: string, @Param('token') t: string, @Query() q: { city?: string; province?: string; preview?: string }, @Headers('x-store-access') a?: string) { return this.checkout.rates(id, this.acc(q.preview, a), t, q); }

  @Post('s/:storeId/carts/:token/coupon') @HttpCode(200) @Header('Cache-Control', NO_STORE) @Throttle({ default: { limit: 20, ttl: 60_000 } })
  coupon(@Param('storeId') id: string, @Param('token') t: string, @Body() b: any, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.applyCoupon(id, this.acc(p, a), t, b?.code ?? ''); }

  @Get('s/:storeId/delivery-quote') @Header('Cache-Control', NO_STORE) @Throttle({ default: { limit: 60, ttl: 60_000 } })
  deliveryQuote(@Param('storeId') id: string, @Query() q: { city?: string; province?: string; productId?: string; variantId?: string; qty?: string; preview?: string }, @Headers('x-store-access') a?: string) {
    return this.checkout.quote(id, this.acc(q.preview, a), q);
  }

  @Post('s/:storeId/checkout') @HttpCode(200) @Header('Cache-Control', NO_STORE) @Throttle({ default: { limit: 5, ttl: 60_000 } })
  placeOrder(@Param('storeId') id: string, @Body() b: any, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.checkout(id, this.acc(p, a), b ?? {}); }

  @Get('s/:storeId/orders/:orderToken') @Header('Cache-Control', NO_STORE)
  order(@Param('storeId') id: string, @Param('orderToken') t: string, @Query('preview') p?: string, @Headers('x-store-access') a?: string) { return this.checkout.orderByToken(id, this.acc(p, a), t); }

  @Get('s/:storeId/track') @Header('Cache-Control', NO_STORE) @Throttle({ default: { limit: 20, ttl: 60_000 } })
  track(@Param('storeId') id: string, @Query() q: { no?: string; phone?: string; preview?: string }, @Headers('x-store-access') a?: string) { return this.checkout.track(id, this.acc(q.preview, a), q); }

  // ─── customers ───

  @Post('s/:storeId/auth/otp') @HttpCode(200) @Throttle({ default: { limit: 3, ttl: 60_000 } })
  otp(@Param('storeId') id: string, @Body() b: any, @Headers('x-store-access') a?: string) { return this.customers.sendOtp(id, this.acc(undefined, a), b ?? {}); }

  @Post('s/:storeId/auth/verify') @HttpCode(200) @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verify(@Param('storeId') id: string, @Body() b: any, @Headers('x-store-access') a?: string) { return this.customers.verifyOtp(id, this.acc(undefined, a), b ?? {}); }

  @Get('s/:storeId/account') @Header('Cache-Control', NO_STORE)
  account(@Param('storeId') id: string, @Headers('x-store-customer') c?: string, @Headers('x-store-access') a?: string) { return this.customers.account(id, this.acc(undefined, a), c); }

  @Put('s/:storeId/account') @Header('Cache-Control', NO_STORE)
  updateAccount(@Param('storeId') id: string, @Body() b: any, @Headers('x-store-customer') c?: string, @Headers('x-store-access') a?: string) { return this.customers.updateAccount(id, this.acc(undefined, a), c, b ?? {}); }

  @Put('s/:storeId/account/addresses') @Header('Cache-Control', NO_STORE)
  addresses(@Param('storeId') id: string, @Body() b: any, @Headers('x-store-customer') c?: string, @Headers('x-store-access') a?: string) { return this.customers.saveAddresses(id, this.acc(undefined, a), c, b ?? {}); }

  @Get('s/:storeId/account/orders') @Header('Cache-Control', NO_STORE)
  myOrders(@Param('storeId') id: string, @Query('page') page?: string, @Headers('x-store-customer') c?: string, @Headers('x-store-access') a?: string) { return this.customers.orders(id, this.acc(undefined, a), c, page); }

  @Get('s/:storeId/account/orders/:orderToken/portal') @Header('Cache-Control', NO_STORE)
  portal(@Param('storeId') id: string, @Param('orderToken') t: string, @Headers('x-store-customer') c?: string, @Headers('x-store-access') a?: string) { return this.customers.orderPortal(id, this.acc(undefined, a), c, t); }

  // ─── newsletter, events, report ───

  @Post('s/:storeId/subscribe') @HttpCode(200) @Throttle({ default: { limit: 5, ttl: 60_000 } })
  subscribe(@Param('storeId') id: string, @Body() b: any, @Headers('x-store-access') a?: string) { return this.customers.subscribe(id, this.acc(undefined, a), b ?? {}); }

  @Post('s/:storeId/events') @HttpCode(200) @Throttle({ default: { limit: 120, ttl: 60_000 } })
  events(@Param('storeId') id: string, @Body() b: unknown) { return this.analytics.ingest(id, b); }

  @Post('s/:storeId/report') @HttpCode(200) @Throttle({ default: { limit: 3, ttl: 60_000 } })
  report(@Param('storeId') id: string, @Body() b: any, @Ip() ip: string) { return this.customers.report(id, b ?? {}, ip); }
}

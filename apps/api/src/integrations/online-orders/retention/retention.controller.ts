import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { AffiliateBody, AffiliatesService } from './affiliates.service';
import { CampaignsService, CreateCampaignBody } from './campaigns.service';
import { OnlineLoyaltyService } from './online-loyalty.service';
import { ReviewsService } from './reviews.service';

/**
 * Retention and affiliates: WhatsApp campaigns, review requests, online
 * loyalty and referral, influencers and affiliates. Under `online-orders`, so
 * reading needs online_orders.view and every write online_orders.manage
 * (permission-routes). Settings are saved by the owner or a manager; paying a
 * commission also needs expenses.create. Registered before the main orders
 * controller so `online-orders/:id` never takes these paths.
 */
@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders')
export class RetentionController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly reviews: ReviewsService,
    private readonly loyalty: OnlineLoyaltyService,
    private readonly affiliates: AffiliatesService,
  ) {}

  // ─── campaigns ─────────────────────────────────────────────

  @Get('campaigns')
  @ApiOperation({ summary: 'WhatsApp campaigns with sent, replied and converted counts' })
  listCampaigns(@GetUser() user: AuthenticatedUser) {
    return this.campaigns.list(user);
  }

  @Post('campaigns')
  @ApiOperation({ summary: 'New campaign: a segment and a message; builds the one-by-one queue' })
  createCampaign(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: CreateCampaignBody) {
    return this.campaigns.create(user, scope, body ?? {});
  }

  @Get('campaigns/:id')
  getCampaign(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaigns.get(user, id);
  }

  @Post('campaigns/:id/recipients/:rid')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one chat sent / skipped / pending, or that the customer replied' })
  markRecipient(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('rid') rid: string, @Body() body: { status?: string; replied?: boolean }) {
    return this.campaigns.mark(user, id, rid, body ?? {});
  }

  @Delete('campaigns/:id')
  removeCampaign(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.campaigns.remove(user, id);
  }

  // ─── reviews ───────────────────────────────────────────────

  @Get('reviews')
  @ApiOperation({ summary: 'Review requests and ratings with a summary' })
  listReviews(@GetUser() user: AuthenticatedUser, @Query() q: { filter?: string; days?: string; search?: string }) {
    return this.reviews.list(user, q ?? {});
  }

  @Post('reviews/request-recent')
  @HttpCode(200)
  @ApiOperation({ summary: 'Make review requests for recently delivered orders that have none' })
  requestRecent(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { days?: number }) {
    return this.reviews.requestRecent(user, scope, Number(body?.days) || 14);
  }

  @Post('reviews/order/:orderId')
  @HttpCode(200)
  requestForOrder(@GetUser() user: AuthenticatedUser, @Param('orderId') orderId: string) {
    return this.reviews.requestOne(user, orderId);
  }

  @Post('reviews/:id/sent')
  @HttpCode(200)
  reviewSent(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { undo?: boolean }) {
    return this.reviews.markSent(user, id, !!body?.undo);
  }

  // ─── settings (loyalty, referral, review links) ────────────

  @Get('retention/settings')
  retentionSettings(@GetUser() user: AuthenticatedUser) {
    return this.reviews.settings(user.tenantId);
  }

  @Put('retention/settings')
  @ApiOperation({ summary: 'Online loyalty, referral reward and review links (owner or manager)' })
  saveRetentionSettings(@GetUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.reviews.saveSettings(user, body);
  }

  // ─── loyalty and referral ──────────────────────────────────

  @Get('loyalty')
  @ApiOperation({ summary: 'Online loyalty: points given on delivery, referrals, top referrers' })
  loyaltyOverview(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.loyalty.overview(user, Number(days) || 90);
  }

  @Get('loyalty/customers')
  loyaltyCustomers(@GetUser() user: AuthenticatedUser, @Query('search') search?: string) {
    return this.loyalty.customers(user, { search });
  }

  @Post('loyalty/customers/:id/code')
  @HttpCode(200)
  @ApiOperation({ summary: 'The customer\'s referral code (made on first use)' })
  referralCode(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.loyalty.codeFor(user, id);
  }

  @Get('loyalty/referral/:code')
  lookupReferral(@GetUser() user: AuthenticatedUser, @Param('code') code: string, @Query('value') value?: string) {
    return this.loyalty.lookup(user, code, Number(value) || 0);
  }

  @Post('loyalty/referrals')
  @HttpCode(200)
  @ApiOperation({ summary: 'Link a friend\'s order to a referral code; the referrer gets points when it is delivered' })
  linkReferral(@GetUser() user: AuthenticatedUser, @Body() body: { orderId?: string; code?: string }) {
    return this.loyalty.link(user, body ?? {});
  }

  @Delete('loyalty/referrals/:id')
  unlinkReferral(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.loyalty.unlink(user, id);
  }

  // ─── influencers and affiliates ────────────────────────────

  @Get('affiliates')
  @ApiOperation({ summary: 'Influencers and affiliates with orders, sales, commission due and ROI for a period' })
  listAffiliates(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.affiliates.list(user, { from, to });
  }

  @Post('affiliates')
  createAffiliate(@GetUser() user: AuthenticatedUser, @Body() body: AffiliateBody) {
    return this.affiliates.create(user, body ?? {});
  }

  @Put('affiliates/:id')
  updateAffiliate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AffiliateBody) {
    return this.affiliates.update(user, id, body ?? {});
  }

  @Delete('affiliates/:id')
  removeAffiliate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.affiliates.remove(user, id);
  }

  @Get('affiliates/:id/statement')
  @ApiOperation({ summary: 'Orders, commission, paid and due for a period' })
  affiliateStatement(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.affiliates.statement(user, id, { from, to });
  }

  @Post('affiliates/:id/orders')
  @HttpCode(200)
  linkAffiliateOrder(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { orderId?: string; orderNo?: string }) {
    return this.affiliates.linkOrder(user, id, body ?? {});
  }

  @Delete('affiliates/:id/orders/:orderId')
  unlinkAffiliateOrder(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Param('orderId') orderId: string) {
    return this.affiliates.unlinkOrder(user, id, orderId);
  }

  @Post('affiliates/:id/pay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pay the due commission of a period; written to accounts as an Expense' })
  payAffiliate(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { from?: string; to?: string; paymentMethod?: string; note?: string },
  ) {
    return this.affiliates.pay(user, scope, id, body ?? {});
  }
}

/** The customer's rating page behind /rate/<token> (no login). */
@ApiTags('Reviews (public)')
@Public()
@Controller('integrations/reviews/v1')
export class ReviewsPublicController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':token')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  info(@Param('token') token: string) {
    return this.reviews.publicInfo(token);
  }

  @Post(':token')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  rate(@Param('token') token: string, @Body() body: { rating?: number; comment?: string }) {
    return this.reviews.publicRate(token, body ?? {});
  }
}

import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { BillingPricingService } from './billing-pricing.service';

/** Public price list (website pricing page and the apps' plan chooser). */
@ApiTags('Pricing')
@Controller('plans')
export class PricingCatalogController {
  constructor(private readonly pricing: BillingPricingService) {}

  @Public()
  @Get('catalog')
  catalog() {
    return this.pricing.catalog();
  }
}

/**
 * What the shop may use. Open to every signed-in user of the shop (cashiers
 * too): the apps build their menus and upgrade prompts from it.
 */
@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('plan-usage')
export class EntitlementsController {
  constructor(private readonly entitlements: EntitlementsService) {}

  @Get('entitlements')
  async mine(@GetUser() user: AuthenticatedUser) {
    const e = await this.entitlements.get(user.tenantId);
    return { state: e.state, plan: e.plan, trialEndsAt: e.trialEndsAt, periodEnd: e.periodEnd, blocksAt: e.blocksAt, graceDaysLeft: e.graceDaysLeft, grandfatheredUntil: e.grandfatheredUntil, features: e.features, limits: e.limits, apps: e.apps, paused: e.paused, pausedUntil: e.pausedUntil, pauseReason: e.pauseReason, addOns: e.addOns.map((a) => ({ key: a.key, status: a.status, free: a.free })) };
  }
}

/** "My plan" and buying add-ons: shop billing permission (owner by default). */
@ApiTags('Pricing')
@ApiBearerAuth()
@Controller('billing')
export class BillingPricingController {
  constructor(private readonly pricing: BillingPricingService) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser) {
    return this.pricing.overview(user.tenantId);
  }

  @Post('addons')
  turnOn(@GetUser() user: AuthenticatedUser, @Body() body: { key?: string; quantity?: number }) {
    return this.pricing.turnOn(user.tenantId, user.id, String(body?.key ?? ''), Number(body?.quantity ?? 1));
  }

  @Delete('addons/:key')
  turnOff(@GetUser() user: AuthenticatedUser, @Param('key') key: string) {
    return this.pricing.turnOff(user.tenantId, key);
  }

  @Post('free')
  free(@GetUser() user: AuthenticatedUser) {
    return this.pricing.switchToFree(user.tenantId);
  }
}

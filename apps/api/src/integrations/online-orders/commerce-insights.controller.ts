import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { TrackingMapService } from './tracking-map.service';
import { CourierScoreService } from './courier-score.service';
import { AutomationService } from './automation.service';
import { CommerceSetupService } from './commerce-setup.service';

/*
 * Commerce phase 6: parcel map and journey, courier scorecard, automation
 * rules and the seller setup. Registered before OnlineOrdersController so
 * `online-orders/:id` never takes these paths.
 */

@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/tracking')
export class TrackingMapController {
  constructor(private readonly svc: TrackingMapService) {}

  @Get('map')
  @ApiOperation({ summary: 'Parcels by city (destination or last seen), counts per state, attention lists' })
  map(
    @GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope,
    @Query('courier') courier?: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string,
    @Query('integrationId') integrationId?: string, @Query('by') by?: string,
  ) {
    return this.svc.map(user, scope, { courier, status, from, to, integrationId, by });
  }

  @Get('order/:id')
  @ApiOperation({ summary: 'One order\'s journey: steps, cities passed, rider when sent' })
  journey(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string) {
    return this.svc.journey(user, scope, id);
  }

  @Post('order/:id/reattempt')
  @ApiOperation({ summary: 'Note a re-attempt request (text for the courier) on the order' })
  reattempt(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() body: { note?: string }) {
    return this.svc.reattempt(user, scope, id, body ?? {});
  }
}

@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/couriers-score')
export class CourierScoreController {
  constructor(private readonly svc: CourierScoreService) {}

  @Get()
  score(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.score(user, scope, { from, to });
  }

  @Post('apply-best')
  @ApiOperation({ summary: 'Write "city → best courier" auto-booking rules' })
  applyBest(@GetUser() user: AuthenticatedUser, @Body() body: { cities?: string[] }) {
    return this.svc.applyBest(user, body ?? {});
  }
}

@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/automation')
export class AutomationController {
  constructor(private readonly svc: AutomationService) {}

  @Get()
  overview(@GetUser() user: AuthenticatedUser) {
    return this.svc.overview(user);
  }

  @Get('runs')
  runs(@GetUser() user: AuthenticatedUser, @Query('ruleId') ruleId?: string, @Query('orderId') orderId?: string, @Query('limit') limit?: string) {
    return this.svc.runs(user, { ruleId, orderId, limit: Number(limit) || undefined });
  }

  @Post('rules')
  create(@GetUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.svc.create(user, body);
  }

  @Put('rules/:id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    return this.svc.update(user, id, body);
  }

  @Post('rules/:id/enabled')
  setEnabled(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { enabled?: boolean }) {
    return this.svc.setEnabled(user, id, body?.enabled !== false);
  }

  @Delete('rules/:id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }

  @Post('recipes/:key')
  recipe(@GetUser() user: AuthenticatedUser, @Param('key') key: string, @Body() body: { enabled?: boolean; params?: Record<string, unknown> }) {
    return this.svc.recipe(user, key, body ?? {});
  }

  @Post('dry-run')
  @ApiOperation({ summary: 'What a rule would do on one order or the last 30, without doing it' })
  dryRun(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() body: { rule?: unknown; ruleId?: string; orderId?: string }) {
    return this.svc.dryRun(user, scope, body ?? {});
  }
}

@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-orders/setup')
export class CommerceSetupController {
  constructor(private readonly svc: CommerceSetupService) {}

  @Get()
  get(@GetUser() user: AuthenticatedUser) {
    return this.svc.get(user);
  }

  @Post('preview')
  preview(@GetUser() user: AuthenticatedUser, @Body() body: { answers?: unknown }) {
    return this.svc.preview(user, body ?? {});
  }

  @Post()
  finish(@GetUser() user: AuthenticatedUser, @Body() body: { answers?: unknown; recipes?: string[]; autoBooking?: boolean }) {
    return this.svc.finish(user, body ?? {});
  }

  @Post('skip')
  skip(@GetUser() user: AuthenticatedUser) {
    return this.svc.skip(user);
  }

  @Put('prefs')
  savePrefs(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.svc.savePrefs(user, body as any);
  }
}

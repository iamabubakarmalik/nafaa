import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { BoostInput, MetaAdsService } from './meta-ads.service';
import { AdRulesService } from './ad-rules.service';

/**
 * Meta ads in the Marketing hub. Under `ads/` so the ads permissions apply
 * (permission-routes): reading needs `ads.view`, every write `ads.manage`.
 * Settings, rules, the Boost wizard and applying rule changes are also
 * limited to owners and managers in the services.
 */
@ApiTags('Marketing hub · Meta ads')
@ApiBearerAuth()
@Controller('ads/meta')
export class MetaAdsController {
  constructor(private readonly meta: MetaAdsService, private readonly rules: AdRulesService) {}

  @Get('status')
  status(@GetUser() user: AuthenticatedUser) {
    return this.meta.status(user);
  }

  @Put('settings')
  saveSettings(@GetUser() user: AuthenticatedUser, @Body() body: Parameters<MetaAdsService['saveSettings']>[1]) {
    return this.meta.saveSettings(user, body ?? {});
  }

  @Get('overview')
  @ApiOperation({ summary: 'Campaigns, ad sets and ads with status, budget and Meta results for a period' })
  overview(@GetUser() user: AuthenticatedUser, @Query() q: { from?: string; to?: string; fresh?: string }) {
    return this.meta.overview(user, q);
  }

  @Post('pull')
  @ApiOperation({ summary: 'Pull spend and results from Meta into the ads spend log now' })
  pull(@GetUser() user: AuthenticatedUser, @Body() body: { days?: number }) {
    return this.meta.pullNow(user, body ?? {});
  }

  @Patch('objects/:id/status')
  setStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status?: string }) {
    return this.meta.setStatus(user, id, body ?? {});
  }

  @Patch('objects/:id/budget')
  setBudget(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { dailyBudget?: number; pct?: number }) {
    return this.meta.setBudget(user, id, body ?? {});
  }

  @Post('objects/:id/duplicate')
  duplicate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.meta.duplicate(user, id);
  }

  @Get('boost/options')
  boostOptions(@GetUser() user: AuthenticatedUser) {
    return this.meta.boostOptions(user);
  }

  @Post('boost')
  @ApiOperation({ summary: 'Create a PAUSED campaign, ad set and ad for one product' })
  boost(@GetUser() user: AuthenticatedUser, @Body() body: BoostInput) {
    return this.meta.boost(user, body ?? {});
  }

  @Post('boost/:actionId/launch')
  launch(@GetUser() user: AuthenticatedUser, @Param('actionId') actionId: string) {
    return this.meta.launch(user, actionId);
  }

  @Get('rules')
  listRules(@GetUser() user: AuthenticatedUser) {
    return this.rules.list(user);
  }

  @Post('rules')
  createRule(@GetUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.rules.create(user, body ?? {});
  }

  @Patch('rules/:id')
  updateRule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: unknown) {
    return this.rules.update(user, id, body ?? {});
  }

  @Delete('rules/:id')
  removeRule(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.remove(user, id);
  }

  @Post('rules/dry-run')
  @ApiOperation({ summary: 'What the rules would change now, without changing anything' })
  dryRun(@GetUser() user: AuthenticatedUser, @Body() body: { rule?: unknown }) {
    return this.rules.dryRun(user, body ?? {});
  }

  @Post('rules/run')
  runRules(@GetUser() user: AuthenticatedUser) {
    return this.rules.runNow(user);
  }

  @Get('actions')
  actions(@GetUser() user: AuthenticatedUser, @Query() q: { status?: string; limit?: string }) {
    return this.rules.actions(user, q);
  }

  @Post('actions/:id/apply')
  apply(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.apply(user, id);
  }

  @Post('actions/:id/dismiss')
  dismiss(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.dismiss(user, id);
  }

  @Post('actions/:id/undo')
  undo(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.rules.undo(user, id);
  }
}

/**
 * /shops: branch list and editing (ShopsService) and branch figures
 * (ShopsAnalyticsService). `overview` and `analytics` keep the shapes the
 * web dashboard and the mobile app read; `compare` serves Branch analytics.
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopsAnalyticsService } from './shops-analytics.service';
import { ShopsService } from './shops.service';
import { StockReconcileService } from './stock-reconcile.service';

@ApiTags('Shops')
@ApiBearerAuth()
@Controller('shops')
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly figures: ShopsAnalyticsService,
    private readonly reconcile: StockReconcileService,
  ) {}

  /**
   * Re-derive every product's stock from the per-branch rows.
   * `?dryRun=true` reports what would change without touching anything.
   */
  @Post('reconcile-stock')
  reconcileStock(
    @GetUser() user: AuthenticatedUser,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.reconcile.run(user, dryRun === 'true' || dryRun === '1');
  }

  @Get()
  list(@GetUser() user: AuthenticatedUser) {
    return this.shopsService.list(user);
  }

  /** Per-branch rows only (array), as the mobile app reads them. */
  @Get('overview')
  async overview(@GetUser() user: AuthenticatedUser) {
    return (await this.figures.analytics(user)).shops;
  }

  /** Every branch today, this week and this month, with the combined totals. */
  @Get('analytics')
  analytics(@GetUser() user: AuthenticatedUser) {
    return this.figures.analytics(user);
  }

  /** Branches side by side for a period (`from`/`to` as business-day keys). */
  @Get('compare')
  compare(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.figures.compare(user, from, to);
  }

  @Get(':id')
  findOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.findOne(user, id);
  }

  @Post()
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user, dto);
  }

  @Patch(':id')
  update(
    @GetUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopsService.update(user, id, dto);
  }

  @Patch(':id/toggle')
  toggleActive(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.toggleActive(user, id);
  }

  @Delete(':id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.shopsService.remove(user, id);
  }
}

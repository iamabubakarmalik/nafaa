import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CuttingJobsService } from './cutting-jobs.service';

/** Cutting turns one item's stock into others, so writes need the stock-change right. */
@ApiTags('Meat - Cutting Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/cutting-jobs')
export class CuttingJobsController {
  constructor(private readonly service: CuttingJobsService) {}

  @Post() @RequirePermissions(P.STOCK_ADJUSTMENTS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Body() dto: unknown) { return this.service.create(user, scope, dto); }

  @Get() @RequirePermissions(P.PRODUCTS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('butcherId') butcherId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, butcherId, from, to, search });
  }

  @Get(':id') @RequirePermissions(P.PRODUCTS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/complete') @RequirePermissions(P.STOCK_ADJUSTMENTS_MANAGE)
  complete(@GetUser() user: AuthenticatedUser, @CurrentShop() scope: ShopScope, @Param('id') id: string, @Body() dto: unknown) { return this.service.complete(user, scope, id, dto); }

  @Post(':id/cancel') @RequirePermissions(P.STOCK_ADJUSTMENTS_MANAGE)
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(user, id, body?.reason); }
}

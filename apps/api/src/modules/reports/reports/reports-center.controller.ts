/**
 * Report centre endpoints: one per section, all taking `from` and `to` as
 * business-day keys (`from=all` for all time) and the branch from the shop
 * header.
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { ReportsCenterService } from './reports-center.service';
import { ReportsIndustryService } from './reports-industry.service';
import { ReportQueryDto } from './dto/report-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.REPORTS_VIEW)
@Controller('reports/center')
export class ReportsCenterController {
  constructor(
    private readonly center: ReportsCenterService,
    private readonly industry: ReportsIndustryService,
  ) {}

  @Get('sales')
  sales(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return this.center.sales(user, shop, q);
  }

  @Get('items')
  items(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return this.center.items(user, shop, q);
  }

  @Get('customers')
  customers(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return this.center.customers(user, shop, q);
  }

  @Get('purchases')
  purchases(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return this.center.purchases(user, shop, q);
  }

  @Get('expenses')
  expenses(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return this.center.expenses(user, shop, q);
  }

  @Get('profit')
  profit(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return this.center.profit(user, shop, q);
  }

  @Get('tax')
  tax(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return this.center.tax(user, shop, q);
  }

  @Get('returns')
  returns(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ReportQueryDto) {
    return this.center.returns(user, shop, q);
  }

  /** Industry section: restaurant, clinic, gym, jewelry, mobile, … */
  @Get('industry/:kind')
  industryBlock(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('kind') kind: string, @Query() q: ReportQueryDto) {
    return this.industry.block(user, shop, kind, q);
  }
}

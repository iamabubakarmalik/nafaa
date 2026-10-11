import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ShopIdParam } from '../../common/shop-scope';
import { DashboardService } from './dashboard.service';
import { DayReportService } from './day-report.service';
import { InsightsService, toPeriod } from './insights.service';
import { DashboardListsService, type ListQuery } from './lists.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dayReport: DayReportService,
    private readonly insightsService: InsightsService,
    private readonly lists: DashboardListsService,
  ) {}

  @Get('overview')
  getOverview(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    // ShopIdParam already applied the rules: an explicit ?shopId= wins, then
    // the active branch, and a non-owner is locked to their own shop whatever
    // the query string says. `undefined` means every branch.
    return this.dashboardService.getOverview(user.tenantId, shopId);
  }

  /** End-of-day sheet: opening cash, items sold, cash vs online, expenses, closing. */
  @Get('day-report')
  getDayReport(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
    @Query('date') date?: string,
  ) {
    return this.dayReport.report(user, shopId, date);
  }

  /** Category, staff, weekday, customer and six-month figures for 7, 30 or 90 days. */
  @Get('insights')
  getInsights(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
    @Query('days') days?: string,
  ) {
    return this.insightsService.insights(user, shopId, toPeriod(days));
  }

  /** Widget lists: ?kind=top|slow|low|recent with days, sort, limit, categoryId, filter, method. */
  @Get('lists')
  getList(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId: string | undefined,
    @Query() query: ListQuery,
  ) {
    return this.lists.list(user, shopId, query);
  }
}

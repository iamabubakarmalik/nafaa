import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CustomerCohortDto, CustomerPeriodDto, CustomerSegmentDto } from './dto/customers-report.dto';
import { CustomerInsightsService } from './customer-insights.service';
import { CustomerCreditService } from './customer-credit.service';
import { ReportFiguresInterceptor } from '../../../common/interceptors/report-figures.interceptor';

/**
 * Customers report. Read only; needs both `reports.view` and `customers.view`.
 * Profit fields are removed for users without cost access.
 */
@ApiTags('Customers Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.CUSTOMERS_VIEW)
@UseInterceptors(ReportFiguresInterceptor)
@Controller('reports/customer-insights')
export class CustomersReportController {
  constructor(
    private readonly insights: CustomerInsightsService,
    private readonly credit: CustomerCreditService,
  ) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: CustomerPeriodDto) {
    return this.insights.overview(user, shop, q);
  }

  @Get('segments')
  segments(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: CustomerSegmentDto) {
    return this.insights.segments(user, shop, q);
  }

  @Get('cohorts')
  cohorts(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: CustomerCohortDto) {
    return this.insights.cohorts(user, shop, q);
  }

  @Get('khata')
  khata(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: CustomerPeriodDto) {
    return this.credit.khata(user, shop, q);
  }

  @Get('loyalty')
  loyalty(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: CustomerPeriodDto) {
    return this.credit.loyalty(user, shop, q);
  }
}

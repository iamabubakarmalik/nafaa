import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import {
  ProfitReportService,
  type ProfitFilters,
  type ProfitPeriod,
  type ProfitSortBy,
} from './profit-report.service';
import { ProfitAnalysisService } from './profit-analysis.service';
import { ProfitItemsDto, ProfitRangeDto, ProfitUnitsDto } from './dto/profit-analysis.dto';
import { ReportFiguresInterceptor } from '../../../common/interceptors/report-figures.interceptor';

@ApiTags('Profit Report')
@ApiBearerAuth()
@UseInterceptors(ReportFiguresInterceptor)
@Controller('profit-report')
export class ProfitReportController {
  constructor(
    private readonly service: ProfitReportService,
    private readonly analysis: ProfitAnalysisService,
  ) {}

  /** Totals, previous period, net profit, breakdowns and top lists for the shared page. */
  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ProfitRangeDto) {
    return this.analysis.overview(user, shop, q);
  }

  /** Products with their variants; searched, sorted and paged. */
  @Get('items')
  items(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ProfitItemsDto) {
    return this.analysis.items(user, shop, q);
  }

  /** Profit per IMEI or serial unit, and the period split by line kind. */
  @Get('units')
  units(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: ProfitUnitsDto) {
    return this.analysis.units(user, shop, q);
  }

  @Get('by-product')
  byProduct(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('period') period?: ProfitPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('sortBy') sortBy?: ProfitSortBy,
  ) {
    const filters: ProfitFilters = {
      period,
      startDate,
      endDate,
      categoryId,
      brandId,
      sortBy,
    };
    return this.service.byProduct(user, shop, filters);
  }

  @Get('summary')
  summary(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('period') period?: ProfitPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
  ) {
    const filters: ProfitFilters = {
      period,
      startDate,
      endDate,
      categoryId,
      brandId,
    };
    return this.service.summary(user, shop, filters);
  }
}

import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { PnlService } from './pnl.service';
import { PnlDetailDto, PnlMonthlyDto, PnlQueryDto } from './dto/pnl-query.dto';
import { ReportFiguresInterceptor } from '../../../common/interceptors/report-figures.interceptor';

/**
 * Profit and loss statement. Every read needs `profit_report.view` (see
 * permission-routes); cost, profit and write-offs also need `cost.view`.
 */
@ApiTags('Profit and loss')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ReportFiguresInterceptor)
@Controller('reports/pnl')
export class PnlController {
  constructor(private readonly service: PnlService) {}

  @Get()
  @ApiOperation({ summary: 'Statement for a period against the comparison period, with channels and categories' })
  report(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: PnlQueryDto) {
    return this.service.report(user, shop, q);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'One statement per business month' })
  monthly(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: PnlMonthlyDto) {
    return this.service.monthly(user, shop, q);
  }

  @Get('branches')
  @ApiOperation({ summary: 'Statement per branch for a period' })
  branches(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: PnlQueryDto) {
    return this.service.branches(user, shop, q);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Money in and out for the period, by day or month, source and account' })
  cashFlow(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: PnlQueryDto) {
    return this.service.cashFlow(user, shop, q);
  }

  @Get('detail')
  @ApiOperation({ summary: 'Records behind one statement line' })
  detail(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: PnlDetailDto) {
    return this.service.detail(user, shop, q);
  }
}

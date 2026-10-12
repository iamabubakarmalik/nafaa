import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopIdParam, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { StockFilterDto, StockLedgerDto, StockListDto } from './dto/stock-report.dto';
import { StockAnalysisService } from './stock-analysis.service';
import { StockReportService } from './stock-report.service';

@ApiTags('Stock Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports/stock')
export class StockReportController {
  constructor(
    private readonly service: StockReportService,
    private readonly analysis: StockAnalysisService,
  ) {}

  @Get()
  generate(
    @GetUser() user: AuthenticatedUser,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('stockStatus') stockStatus?: 'all' | 'in' | 'low' | 'out',
    @Query('isActive') isActive?: string,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.generate(user, {
      categoryId,
      brandId,
      stockStatus,
      isActive: isActive === undefined ? undefined : isActive === 'true',
      // Explicit ?shopId= wins for drill-downs; otherwise the active branch.
      shopId,
    });
  }

  /** Shared stock report: paged lines with value, age and status for the active branch. */
  @Get('list')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  list(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: StockListDto) {
    return this.analysis.list(user, shop, q);
  }

  @Get('analytics')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: StockFilterDto) {
    return this.analysis.analytics(user, shop, q);
  }

  @Get('branches')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  branches(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: StockFilterDto) {
    return this.analysis.branches(user, shop, q);
  }

  /** Opening and closing stock for a period from the stock ledger. */
  @Get('ledger')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  ledger(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: StockLedgerDto) {
    return this.analysis.ledger(user, shop, q);
  }

  @Get('item/:productId')
  @RequirePermissions(PERMISSIONS.REPORTS_VIEW)
  item(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('productId') productId: string, @Query() q: StockFilterDto) {
    return this.analysis.item(user, shop, productId, q);
  }

  @Get(':productId/detail')
  getProductDetail(
    @GetUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.service.getProductDetail(user, productId);
  }
}

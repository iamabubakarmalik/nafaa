import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SportsDashboardService } from './sports-dashboard.service';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';

@ApiTags('Sports - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sports/dashboard')
export class SportsDashboardController {
  constructor(private readonly service: SportsDashboardService) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.overview(user, shop);
  }

  @Get('sales-report')
  sales(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.salesReport(user, from, to, shop);
  }

  @Get('category-performance')
  categoryPerformance(@GetUser() user: AuthenticatedUser) {
    return this.service.categoryPerformance(user);
  }
}

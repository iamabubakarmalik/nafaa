import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RestaurantDashboardService } from './restaurant-dashboard.service';

@ApiTags('Restaurant - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurant/dashboard')
export class RestaurantDashboardController {
  constructor(private readonly service: RestaurantDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) { return this.service.overview(user, shopId); }
  @Get('orders-by-hour') ordersByHour(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) { return this.service.ordersByHour(user, shopId); }
  @Get('kitchen-performance') kitchenPerf(@GetUser() user: AuthenticatedUser) { return this.service.kitchenPerformance(user); }
}

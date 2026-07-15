import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { RetailDashboardService } from './retail-dashboard.service';

@ApiTags('Retail - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('retail/dashboard')
export class RetailDashboardController {
  constructor(private readonly service: RetailDashboardService) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) {
    return this.service.overview(user, shopId);
  }

  @Get('sales-by-hour')
  salesByHour(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) {
    return this.service.salesByHour(user, shopId);
  }

  @Get('slow-movers')
  slowMovers(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.slowMovers(user, days ? parseInt(days) : 30);
  }
}

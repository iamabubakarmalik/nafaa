import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SportsDashboardService } from './sports-dashboard.service';

@ApiTags('Sports - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sports/dashboard')
export class SportsDashboardController {
  constructor(private readonly service: SportsDashboardService) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser) {
    return this.service.overview(user);
  }

  @Get('sales-report')
  sales(
    @GetUser() user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.salesReport(user, from, to);
  }

  @Get('category-performance')
  categoryPerformance(@GetUser() user: AuthenticatedUser) {
    return this.service.categoryPerformance(user);
  }
}

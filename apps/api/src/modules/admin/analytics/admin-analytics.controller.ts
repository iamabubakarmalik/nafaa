import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminAnalyticsService } from './admin-analytics.service';

@ApiTags('Admin - Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly service: AdminAnalyticsService) {}

  @Get('mrr-arr')
  mrrArr() {
    return this.service.mrrArr();
  }

  @Get('monthly-revenue')
  monthlyRevenue(@Query('months') months?: string) {
    return this.service.monthlyRevenue(months ? Number(months) : 12);
  }

  @Get('churn')
  churn(@Query('months') months?: string) {
    return this.service.churn(months ? Number(months) : 6);
  }

  @Get('top-tenants')
  topTenants() {
    return this.service.topRevenueTenants();
  }
}

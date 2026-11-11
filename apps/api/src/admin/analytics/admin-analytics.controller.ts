import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('dashboard')
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
  topTenants(@Query('limit') limit?: string) {
    return this.service.topRevenueTenants(limit ? Number(limit) : 10);
  }

  @Get('plan-mix')
  planMix() {
    return this.service.planMix();
  }
}

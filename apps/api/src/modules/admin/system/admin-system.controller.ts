import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminSystemService } from './admin-system.service';

@ApiTags('Admin - System')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/system')
export class AdminSystemController {
  constructor(private readonly service: AdminSystemService) {}

  @Get('overview')
  overview() {
    return this.service.overview();
  }

  @Get('signup-trend')
  signupTrend(@Query('days') days?: string) {
    return this.service.signupTrend(days ? Number(days) : 30);
  }

  @Get('revenue-trend')
  revenueTrend(@Query('days') days?: string) {
    return this.service.revenueTrend(days ? Number(days) : 30);
  }

  @Get('plan-distribution')
  planDistribution() {
    return this.service.planDistribution();
  }

  @Get('recent-activity')
  recentActivity() {
    return this.service.recentActivity();
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('dashboard')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  /** Platform KPIs, daily trend, signup funnel, industries and alerts for 7/14/30/90 days. */
  @Get()
  summary(@Query('days') days?: string) {
    return this.service.summary(days ? Number(days) : 30);
  }
}

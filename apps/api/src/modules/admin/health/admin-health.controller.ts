import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminHealthService } from './admin-health.service';

@ApiTags('Admin - System Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/health')
export class AdminHealthController {
  constructor(private readonly service: AdminHealthService) {}

  @Get()
  check() {
    return this.service.check();
  }

  @Get('db-stats')
  dbStats() {
    return this.service.dbStats();
  }
}

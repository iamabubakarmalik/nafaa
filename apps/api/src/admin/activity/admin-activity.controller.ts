import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminActivityService } from './admin-activity.service';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('system')
@Controller('admin/activity')
export class AdminActivityController {
  constructor(private readonly service: AdminActivityService) {}

  @Get()
  list(
    @Query('tenantId') tenantId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('paged') paged?: string,
    @Query('search') search?: string,
    @Query('entityType') entityType?: string,
    @Query('adminOnly') adminOnly?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list({
      tenantId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      paged: paged === '1' || paged === 'true',
      search,
      entityType: entityType || undefined,
      adminOnly: adminOnly === '1' || adminOnly === 'true',
      from,
      to,
    });
  }
}

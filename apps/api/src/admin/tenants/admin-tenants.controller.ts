import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { BUSINESS_MODELS } from '../../modules/onboarding/constants/business-models';
import { AdminTenantsService } from './admin-tenants.service';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { AdminArea, AdminPermission } from '../access/admin-access.decorators';

@ApiTags('Admin - Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('tenants')
@Controller('admin/tenants')
export class AdminTenantsController {
  constructor(private readonly service: AdminTenantsService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('status') status?: TenantStatus,
    @Query('model') model?: string,
    @Query('industry') industry?: string,
    @Query('sort') sort?: 'newest' | 'oldest' | 'name' | 'active',
    @Query('activity') activity?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      search,
      status,
      model: model && BUSINESS_MODELS.includes(model.toUpperCase() as never) ? model.toUpperCase() : undefined,
      industry: industry?.trim() || undefined,
      sort: sort === 'oldest' || sort === 'name' || sort === 'active' ? sort : 'newest',
      activity: activity || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Patch(':id/profile')
  updateProfile(@Param('id') id: string, @Body() dto: { name?: string; phone?: string | null; businessType?: string | null; businessModels?: string[] }) {
    return this.service.updateProfile(id, dto);
  }

  @Post(':id/sign-out-all')
  signOutAll(@Param('id') id: string) {
    return this.service.signOutAll(id);
  }

  @Get(':id/insights')
  insights(@Param('id') id: string) {
    return this.service.insights(id);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTenantStatusDto) {
    return this.service.updateStatus(id, dto.status, dto.reason);
  }

  @AdminPermission('tenants.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

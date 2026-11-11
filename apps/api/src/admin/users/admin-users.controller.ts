import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminUsersService } from './admin-users.service';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('users')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.list({
      search,
      role,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggleActive(id);
  }
}

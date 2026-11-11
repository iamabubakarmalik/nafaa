import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminReferralsService } from './admin-referrals.service';
import { AdminArea } from '../access/admin-access.decorators';

@ApiTags('Admin - Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('promos')
@Controller('admin/referrals')
export class AdminReferralsController {
  constructor(private readonly service: AdminReferralsService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
  }

  /** Same as the plain list, but returns { items, meta } with filters. */
  @Get('paged')
  listPaged(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listPaged({ status, search, from, to, page: page ? Number(page) : 1, limit: limit ? Number(limit) : 25 });
  }

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 30,
    });
  }

  @Get('leaderboard')
  leaderboard() {
    return this.service.leaderboard();
  }
}

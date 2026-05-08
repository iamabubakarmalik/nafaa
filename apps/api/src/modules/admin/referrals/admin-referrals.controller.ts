import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminReferralsService } from './admin-referrals.service';

@ApiTags('Admin - Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/referrals')
export class AdminReferralsController {
  constructor(private readonly service: AdminReferralsService) {}

  @Get('stats')
  stats() {
    return this.service.stats();
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

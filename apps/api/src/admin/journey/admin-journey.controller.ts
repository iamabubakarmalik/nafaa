import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/super-admin.guard';
import { AdminArea } from '../access/admin-access.decorators';
import { AdminJourneyService } from './admin-journey.service';

const text = (v?: string, max = 80) => (v && v.trim() ? v.trim().slice(0, max) : undefined);

@ApiTags('Admin - Merchant journey')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('tenants')
@Controller('admin/journey')
export class AdminJourneyController {
  constructor(private readonly service: AdminJourneyService) {}

  /** Signups by day, the step funnel per platform and source, web vs mobile. */
  @Get('funnel')
  funnel(@Query('from') from?: string, @Query('to') to?: string, @Query('platform') platform?: string, @Query('source') source?: string) {
    return this.service.funnel({ from: text(from, 10), to: text(to, 10), platform: text(platform, 20), source: text(source) });
  }

  /** Shops with their journey state (stuck step, health), filterable. */
  @Get('shops')
  shops(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('platform') platform?: string,
    @Query('source') source?: string,
    @Query('stuck') stuck?: string,
    @Query('health') health?: string,
    @Query('uses') uses?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.shops({
      from: text(from, 10), to: text(to, 10), platform: text(platform, 20), source: text(source), stuck: text(stuck, 20),
      health: text(health, 20), uses: text(uses, 20), search: text(search, 100),
      page: page ? Number(page) || 1 : 1, limit: limit ? Number(limit) || 25 : 25,
    });
  }

  /** One shop's journey: source, platforms, milestones, stuck step, health and timeline. */
  @Get('tenants/:id')
  tenant(@Param('id') id: string) {
    return this.service.tenantJourney(id);
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @GetUser() user: AuthenticatedUser,
    @Query('shopId') shopId?: string,
  ) {
    // Non-owner can only see their own shop
    if (user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' && user.shopId) {
      shopId = user.shopId;
    }
    return this.dashboardService.getOverview(user.tenantId, shopId);
  }
}

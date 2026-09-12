import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ShopIdParam } from '../../common/shop-scope';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    // ShopIdParam already applied the rules: an explicit ?shopId= wins, then
    // the active branch, and a non-owner is locked to their own shop whatever
    // the query string says. `undefined` means every branch.
    return this.dashboardService.getOverview(user.tenantId, shopId);
  }
}

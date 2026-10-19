import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS as P } from '../../../common/constants/permissions.constants';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MeatDashboardService } from './meat-dashboard.service';

@ApiTags('Meat - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/dashboard')
export class MeatDashboardController {
  constructor(private readonly service: MeatDashboardService) {}

  @Get('overview') @RequirePermissions(P.DASHBOARD_VIEW) overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

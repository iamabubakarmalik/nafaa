import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FloristDashboardService } from './florist-dashboard.service';

@ApiTags('Florist - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('florist/dashboard')
export class FloristDashboardController {
  constructor(private readonly service: FloristDashboardService) {}
  @Get('overview') overview(@GetUser() u: AuthenticatedUser) { return this.service.overview(u); }
  @Get('delivery-report') delivery(@GetUser() u: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.deliveryReport(u, from, to);
  }
}

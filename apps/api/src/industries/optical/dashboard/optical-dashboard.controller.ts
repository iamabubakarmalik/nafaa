import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { OpticalDashboardService } from './optical-dashboard.service';

@ApiTags('Optical - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optical/dashboard')
export class OpticalDashboardController {
  constructor(private readonly service: OpticalDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
  @Get('sales-report') sales(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.salesReport(user, from, to);
  }
  @Get('optometrist-performance') optometrists(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.optometristPerformance(user, from, to);
  }
  @Get('prescription-analytics') rxAnalytics(@GetUser() user: AuthenticatedUser) { return this.service.prescriptionAnalytics(user); }
}

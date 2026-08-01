import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AppliancesDashboardService } from './appliances-dashboard.service';

@ApiTags('Appliances - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('appliances/dashboard')
export class AppliancesDashboardController {
  constructor(private readonly service: AppliancesDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
  @Get('sales-report') sales(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.salesReport(user, from, to);
  }
  @Get('technician-performance') technicians(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.technicianPerformance(user, from, to);
  }
}

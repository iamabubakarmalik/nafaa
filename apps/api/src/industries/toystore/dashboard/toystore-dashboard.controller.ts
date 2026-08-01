import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ToystoreDashboardService } from './toystore-dashboard.service';

@ApiTags('Toy Store - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('toystore/dashboard')
export class ToystoreDashboardController {
  constructor(private readonly service: ToystoreDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
  @Get('age-analytics') age(@GetUser() user: AuthenticatedUser) { return this.service.ageAnalytics(user); }
  @Get('sales-report') sales(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.salesReport(user, from, to);
  }
}

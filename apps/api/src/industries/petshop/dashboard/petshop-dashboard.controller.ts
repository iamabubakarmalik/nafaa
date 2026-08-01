import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PetshopDashboardService } from './petshop-dashboard.service';

@ApiTags('Pet Shop - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('petshop/dashboard')
export class PetshopDashboardController {
  constructor(private readonly service: PetshopDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
  @Get('sales-report') sales(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.salesReport(user, from, to);
  }
  @Get('groomer-performance') groomers(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.groomerPerformance(user, from, to);
  }
  @Get('species-analytics') species(@GetUser() user: AuthenticatedUser) { return this.service.speciesAnalytics(user); }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { FurnitureDashboardService } from './furniture-dashboard.service';

@ApiTags('Furniture - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('furniture/dashboard')
export class FurnitureDashboardController {
  constructor(private readonly service: FurnitureDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
  @Get('sales-report') sales(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.salesReport(user, from, to);
  }
  @Get('carpenter-performance') carpenters(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    return this.service.carpenterPerformance(user, from, to);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalonDashboardService } from './salon-dashboard.service';

@ApiTags('Salon - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/dashboard')
export class SalonDashboardController {
  constructor(private readonly service: SalonDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

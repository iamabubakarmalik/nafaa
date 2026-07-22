import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { GymDashboardService } from './gym-dashboard.service';

@ApiTags('Gym - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/dashboard')
export class GymDashboardController {
  constructor(private readonly service: GymDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { GamingDashboardService } from './gaming-dashboard.service';

@ApiTags('Gaming - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gaming/dashboard')
export class GamingDashboardController {
  constructor(private readonly service: GamingDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

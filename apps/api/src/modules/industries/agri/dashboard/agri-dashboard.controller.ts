import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { AgriDashboardService } from './agri-dashboard.service';

@ApiTags('Agri - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agri/dashboard')
export class AgriDashboardController {
  constructor(private readonly service: AgriDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

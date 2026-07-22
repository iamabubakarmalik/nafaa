import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DairyDashboardService } from './dairy-dashboard.service';

@ApiTags('Dairy - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/dashboard')
export class DairyDashboardController {
  constructor(private readonly service: DairyDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ClinicDashboardService } from './clinic-dashboard.service';

@ApiTags('Clinic - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clinic/dashboard')
export class ClinicDashboardController {
  constructor(private readonly service: ClinicDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

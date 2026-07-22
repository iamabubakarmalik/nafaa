import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ServicesDashboardService } from './services-dashboard.service';

@ApiTags('Service Business - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services-biz/dashboard')
export class ServicesDashboardController {
  constructor(private readonly service: ServicesDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { AutoPartsDashboardService } from './autoparts-dashboard.service';

@ApiTags('Auto Parts - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/dashboard')
export class AutoPartsDashboardController {
  constructor(private readonly service: AutoPartsDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

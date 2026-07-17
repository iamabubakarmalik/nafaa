import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MeatDashboardService } from './meat-dashboard.service';

@ApiTags('Meat - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/dashboard')
export class MeatDashboardController {
  constructor(private readonly service: MeatDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

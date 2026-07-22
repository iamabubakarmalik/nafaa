import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { BakeryDashboardService } from './bakery-dashboard.service';

@ApiTags('Bakery - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bakery/dashboard')
export class BakeryDashboardController {
  constructor(private readonly service: BakeryDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

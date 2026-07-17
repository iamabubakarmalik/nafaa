import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { JewelryDashboardService } from './jewelry-dashboard.service';

@ApiTags('Jewelry - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/dashboard')
export class JewelryDashboardController {
  constructor(private readonly service: JewelryDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

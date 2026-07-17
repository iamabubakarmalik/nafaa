import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { HotelDashboardService } from './hotel-dashboard.service';

@ApiTags('Hotel - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/dashboard')
export class HotelDashboardController {
  constructor(private readonly service: HotelDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser) { return this.service.overview(user); }
}

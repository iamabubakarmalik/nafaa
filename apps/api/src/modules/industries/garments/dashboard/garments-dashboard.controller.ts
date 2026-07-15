import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { GarmentsDashboardService } from './garments-dashboard.service';

@ApiTags('Garments - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/dashboard')
export class GarmentsDashboardController {
  constructor(private readonly service: GarmentsDashboardService) {}

  @Get('overview') overview(@GetUser() user: AuthenticatedUser, @Query('shopId') shopId?: string) { return this.service.overview(user, shopId); }
}

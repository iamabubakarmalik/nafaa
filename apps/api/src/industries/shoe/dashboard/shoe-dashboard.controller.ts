import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShoeDashboardService } from './shoe-dashboard.service';

@ApiTags('Shoe - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/dashboard')
export class ShoeDashboardController {
  constructor(private readonly service: ShoeDashboardService) {}
  @Get('overview') overview(@GetUser() u: AuthenticatedUser) { return this.service.overview(u); }
  @Get('size-popularity') sizes(@GetUser() u: AuthenticatedUser) { return this.service.sizePopularity(u); }
}

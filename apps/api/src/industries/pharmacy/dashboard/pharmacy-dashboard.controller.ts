import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PharmacyDashboardService } from './pharmacy-dashboard.service';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';

@ApiTags('Pharmacy - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/dashboard')
export class PharmacyDashboardController {
  constructor(private readonly service: PharmacyDashboardService) {}

  @Get('overview')
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.service.overview(user, shop);
  }
  @Get('expiring') expiring(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.expiringMedicines(user, days ? parseInt(days) : 90);
  }
}

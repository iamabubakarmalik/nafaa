import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ShoeDashboardService } from './shoe-dashboard.service';

@ApiTags('Shoe - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shoe/dashboard')
export class ShoeDashboardController {
  constructor(private readonly service: ShoeDashboardService) {}
  @Get('overview') overview(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.overview(u, shop); }
  @Get('size-popularity') sizes(@GetUser() u: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.sizePopularity(u, shop); }
}

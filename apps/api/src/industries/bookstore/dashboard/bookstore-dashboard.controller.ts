import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { BookstoreDashboardService } from './bookstore-dashboard.service';

/** Bookstore dashboard numbers. */
@ApiTags('Bookstore - Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookstore/dashboard')
export class BookstoreDashboardController {
  constructor(private readonly service: BookstoreDashboardService) {}

  @Get('overview') @RequirePermissions(PERMISSIONS.DASHBOARD_VIEW) overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) { return this.service.overview(user, shop); }
}

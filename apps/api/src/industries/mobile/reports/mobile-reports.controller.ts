import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MobileReportsService } from './mobile-reports.service';
import { ShopIdParam } from '../../../common/shop-scope';

@ApiTags('Mobile Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile-reports')
export class MobileReportsController {
  constructor(private readonly service: MobileReportsService) {}

  @Get('dashboard')
  dashboard(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.dashboard(user, shopId);
  }

  /** Kamai 4 raston me tori hui — naya phone, used phone, accessory, repair. */
  @Get('profit-by-source')
  profitBySource(
    @GetUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.profitBySource(user, { from, to, shopId });
  }

  /** Phone models aur accessories jo khatam ho rahe hain. */
  @Get('low-stock')
  lowStock(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.lowStock(user, shopId);
  }

  /** Kaunsa maal kitna purana pada hai — dead stock nikalne ke liye. */
  @Get('stock-aging')
  stockAging(
    @GetUser() user: AuthenticatedUser,
    @ShopIdParam() shopId?: string,
  ) {
    return this.service.stockAging(user, shopId);
  }

  @Get('pta-breakdown')
  ptaBreakdown(@GetUser() user: AuthenticatedUser) {
    return this.service.ptaBreakdown(user);
  }

  @Get('top-brands')
  topBrands(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.service.topBrands(user, days ? Number(days) : 30);
  }

  @Get('repair-analytics')
  repairAnalytics(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.service.repairAnalytics(user, days ? Number(days) : 30);
  }

  @Get('emi-analytics')
  emiAnalytics(@GetUser() user: AuthenticatedUser) {
    return this.service.emiAnalytics(user);
  }

  @Get('used-phone-analytics')
  usedPhoneAnalytics(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.service.usedPhoneAnalytics(user, days ? Number(days) : 30);
  }
}

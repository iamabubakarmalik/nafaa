import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-trend')
  salesTrend(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('days') days?: string) {
    return this.reportsService.salesTrend(user, shop, days ? Number(days) : 14);
  }

  @Get('top-products')
  topProducts(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('limit') limit?: string) {
    return this.reportsService.topProducts(user, shop, limit ? Number(limit) : 10);
  }

  @Get('category-breakdown')
  categoryBreakdown(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.reportsService.categoryBreakdown(user, shop);
  }

  @Get('payment-methods')
  paymentMethods(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.reportsService.paymentMethods(user, shop);
  }

  @Get('hourly-today')
  hourlyToday(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.reportsService.hourlySalesToday(user, shop);
  }

  @Get('cashier-performance')
  cashierPerformance(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('days') days?: string) {
    return this.reportsService.cashierPerformance(user, shop, days ? Number(days) : 30);
  }

  @Get('top-customers')
  topCustomers(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('limit') limit?: string) {
    return this.reportsService.topCustomers(user, shop, limit ? Number(limit) : 10);
  }

  @Get('inventory-value')
  inventoryValue(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.reportsService.inventoryValue(user, shop);
  }

  @Get('expense-breakdown')
  expenseBreakdown(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('days') days?: string) {
    return this.reportsService.expenseBreakdown(user, shop, days ? Number(days) : 30);
  }

  @Get('profit-loss')
  profitAndLoss(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('days') days?: string) {
    return this.reportsService.profitAndLoss(user, shop, days ? Number(days) : 30);
  }

  @Get('weekday-pattern')
  weekdayPattern(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('days') days?: string) {
    return this.reportsService.weekdayPattern(user, shop, days ? Number(days) : 90);
  }

  @Get('monthly-comparison')
  monthlyComparison(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope) {
    return this.reportsService.monthlyComparison(user, shop);
  }

  @Get('sales-vs-expenses')
  salesVsExpenses(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('days') days?: string) {
    return this.reportsService.salesVsExpenses(user, shop, days ? Number(days) : 30);
  }

  @Get('customer-acquisition')
  customerAcquisition(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('days') days?: string) {
    return this.reportsService.customerAcquisition(user, shop, days ? Number(days) : 30);
  }
}

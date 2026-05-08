import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-trend')
  salesTrend(
    @GetUser() user: AuthenticatedUser,
    @Query('days') days?: string,
  ) {
    return this.reportsService.salesTrend(user, days ? Number(days) : 14);
  }

  @Get('top-products')
  topProducts(
    @GetUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.topProducts(user, limit ? Number(limit) : 10);
  }

  @Get('category-breakdown')
  categoryBreakdown(@GetUser() user: AuthenticatedUser) {
    return this.reportsService.categoryBreakdown(user);
  }

  @Get('payment-methods')
  paymentMethods(@GetUser() user: AuthenticatedUser) {
    return this.reportsService.paymentMethods(user);
  }
}

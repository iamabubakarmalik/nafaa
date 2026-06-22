import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  ProfitReportService,
  type ProfitFilters,
  type ProfitPeriod,
  type ProfitSortBy,
} from './profit-report.service';

@ApiTags('Profit Report')
@ApiBearerAuth()
@Controller('profit-report')
export class ProfitReportController {
  constructor(private readonly service: ProfitReportService) {}

  @Get('by-product')
  byProduct(
    @GetUser() user: AuthenticatedUser,
    @Query('period') period?: ProfitPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('sortBy') sortBy?: ProfitSortBy,
  ) {
    const filters: ProfitFilters = {
      period,
      startDate,
      endDate,
      categoryId,
      brandId,
      sortBy,
    };
    return this.service.byProduct(user, filters);
  }

  @Get('summary')
  summary(
    @GetUser() user: AuthenticatedUser,
    @Query('period') period?: ProfitPeriod,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
  ) {
    const filters: ProfitFilters = {
      period,
      startDate,
      endDate,
      categoryId,
      brandId,
    };
    return this.service.summary(user, filters);
  }
}

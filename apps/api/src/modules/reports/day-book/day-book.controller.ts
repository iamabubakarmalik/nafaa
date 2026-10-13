import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { DayBookQueryDto } from './dto/day-book-query.dto';
import { DayBookService } from './day-book.service';
import { ReportFiguresInterceptor } from '../../../common/interceptors/report-figures.interceptor';

@ApiTags('Day book')
@ApiBearerAuth()
@UseInterceptors(ReportFiguresInterceptor)
@Controller('day-book')
export class DayBookController {
  constructor(private readonly service: DayBookService) {}

  /** End-of-day (Z) report for one business day: sales, drawers, money in and out, items, staff. */
  @Get()
  get(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Query() query: DayBookQueryDto,
  ) {
    return this.service.report(user, scope, query.date, query.shopId);
  }
}

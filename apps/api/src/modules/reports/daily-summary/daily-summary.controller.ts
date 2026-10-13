import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { DailySummaryService } from './daily-summary.service';
import { DailySummaryDayDto } from './dto/daily-summary.dto';
import { ReportFiguresInterceptor } from '../../../common/interceptors/report-figures.interceptor';

/**
 * Daily closing summary. Reading needs `reports.view`; sending now needs
 * `settings.edit` (see permission-routes).
 */
@ApiTags('Daily summary')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(ReportFiguresInterceptor)
@Controller('reports/daily-summary')
export class DailySummaryController {
  constructor(private readonly service: DailySummaryService) {}

  @Get()
  @ApiOperation({ summary: 'Schedule, recipients and recent sends' })
  status(@GetUser() user: AuthenticatedUser) {
    return this.service.status(user);
  }

  @Get('preview')
  @ApiOperation({ summary: 'Summary figures and message for one business day' })
  preview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: DailySummaryDayDto) {
    return this.service.preview(user, shop, q.date);
  }

  @Post('send')
  @ApiOperation({ summary: 'Send the summary to every recipient now' })
  send(@GetUser() user: AuthenticatedUser, @Body() body: DailySummaryDayDto) {
    return this.service.sendNow(user, body.date);
  }
}

import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { StaffBillsDto, StaffPeriodDto, StaffShiftsDto } from './dto/staff-report.dto';
import { StaffReportService } from './staff-report.service';
import { StaffShiftsService } from './staff-shifts.service';
import { ReportFiguresInterceptor } from '../../../common/interceptors/report-figures.interceptor';

/**
 * Staff and counter report for the active branch (or all branches for the owner).
 * Needs both `reports.view` and `staff.view`.
 */
@ApiTags('Staff Report')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.STAFF_VIEW)
@UseInterceptors(ReportFiguresInterceptor)
@Controller('reports/staff')
export class StaffReportController {
  constructor(
    private readonly service: StaffReportService,
    private readonly shiftsService: StaffShiftsService,
  ) {}

  /** Every person's sales, discounts, voids, returns, drawer results and hours, with alerts and charts. */
  @Get()
  overview(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: StaffPeriodDto) {
    return this.service.overview(user, shop, q);
  }

  /** Counter shifts: paged list and shorts/overs by person, branch and day. */
  @Get('shifts')
  shifts(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: StaffShiftsDto) {
    return this.shiftsService.shifts(user, shop, q);
  }

  /** A person's bills for the period, filtered by kind. */
  @Get('bills')
  bills(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: StaffBillsDto) {
    return this.service.bills(user, shop, q);
  }

  /** One person's detail: trend, busy hours, payments, top items, shifts, returns, voids, PIN log, attendance, commission. */
  @Get('person/:userId')
  person(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('userId') userId: string, @Query() q: StaffPeriodDto) {
    return this.service.person(user, shop, userId, q);
  }
}

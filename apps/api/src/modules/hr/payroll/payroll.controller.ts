import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { PayrollService } from './payroll.service';
import {
  AnalyticsQueryDto, CancelDto, CreateAdvanceDto, HistoryQueryDto, MonthQueryDto, PayBalanceDto, RunPayrollDto,
} from './dto/payroll.dto';

/**
 * Payroll under `staff/payroll`, so the `staff` route rule applies:
 * reading needs `staff.view`, every write `staff.manage`. Paying from the
 * drawer also needs `cash_register.open`, from an account `expenses.create`
 * (the same rights as moving that money on the Cash register and Shop
 * accounts pages); the service checks those per request. Commission is shown
 * only with `commission.view` / `commission.manage` and paid with the salary
 * only with `commission.manage`.
 */
@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('staff/payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get('run')
  @ApiOperation({ summary: 'Run sheet of a month: every staff member with pay worked out or the saved record' })
  run(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: MonthQueryDto) {
    return this.service.run(user, shop, q);
  }

  @Post('run')
  @ApiOperation({ summary: 'Save the salaries of the chosen staff for a month and pay them (or keep them due)' })
  process(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: RunPayrollDto) {
    return this.service.process(user, shop, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Salaries and advances, paged, with totals' })
  history(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: HistoryQueryDto) {
    return this.service.history(user, shop, q);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Salary cost by month, branch, staff and as a share of sales' })
  analytics(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: AnalyticsQueryDto) {
    return this.service.analytics(user, shop, q);
  }

  @Get('advances')
  @ApiOperation({ summary: 'Advances and loans with what is still to be cut' })
  advances(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('shopId') shopId?: string, @Query('staffId') staffId?: string) {
    return this.service.advances(user, shop, { shopId, staffId });
  }

  @Post('advances')
  @ApiOperation({ summary: 'Give an advance or a loan, cut from one or more salaries' })
  createAdvance(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: CreateAdvanceDto) {
    return this.service.createAdvance(user, shop, dto);
  }

  @Get('records/:id')
  @ApiOperation({ summary: 'One salary or advance with its money movements (payslip)' })
  record(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.record(user, id);
  }

  @Post('records/:id/pay')
  @ApiOperation({ summary: 'Pay what is still due on a salary' })
  pay(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: PayBalanceDto) {
    return this.service.payBalance(user, shop, id, dto);
  }

  @Post('records/:id/cancel')
  @ApiOperation({ summary: 'Cancel a salary or a whole advance; money paid goes back where it came from' })
  cancel(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Param('id') id: string, @Body() dto: CancelDto) {
    return this.service.cancel(user, shop, id, dto);
  }
}

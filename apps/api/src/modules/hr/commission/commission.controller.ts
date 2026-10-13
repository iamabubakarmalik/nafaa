import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { CommissionService } from './commission.service';
import { UpsertRuleDto } from './dto/upsert-rule.dto';
import { EnrollDto } from './dto/enroll.dto';
import { PayoutDto } from './dto/payout.dto';

@ApiTags('Commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commission')
export class CommissionController {
  constructor(private readonly service: CommissionService) {}

  /* Rules */
  @Get('rules') @ApiOperation({ summary: 'All rules' })
  listRules(@GetUser() user: AuthenticatedUser) {
    return this.service.listRules(user);
  }

  @Post('rules') @ApiOperation({ summary: 'New rule' })
  createRule(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertRuleDto) {
    return this.service.upsertRule(user, dto);
  }

  @Patch('rules/:id') @ApiOperation({ summary: 'Change a rule' })
  updateRule(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertRuleDto) {
    return this.service.upsertRule(user, dto, id);
  }

  @Delete('rules/:id')
  removeRule(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.removeRule(user, id);
  }

  /* People */
  @Get('people') @ApiOperation({ summary: 'Logins with their HR record, and HR records without a login' })
  people(@GetUser() user: AuthenticatedUser) {
    return this.service.listPeople(user);
  }

  @Get('sellers') @ApiOperation({ summary: 'Enrolled sellers for the POS "sold by" picker' })
  sellers(@GetUser() user: AuthenticatedUser) {
    return this.service.sellers(user);
  }

  @Post('enroll') @ApiOperation({ summary: 'Turn commission on or off for a person' })
  enroll(@GetUser() user: AuthenticatedUser, @Body() dto: EnrollDto) {
    return this.service.setEnrolled(user, dto);
  }

  /* Figures */
  @Get('summary') @ApiOperation({ summary: 'One month for everyone the caller may see' })
  summary(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query('period') period: string) {
    return this.service.summary(user, period, { shop });
  }

  @Get('detail/:userId') @ApiOperation({ summary: 'One person\'s statement for a month' })
  detail(@GetUser() user: AuthenticatedUser, @Param('userId') userId: string, @Query('period') period: string) {
    return this.service.detail(user, userId, period);
  }

  @Get('analytics') @ApiOperation({ summary: 'Month by month figures up to a month' })
  analytics(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('period') period: string,
    @Query('months') months?: string,
  ) {
    return this.service.analytics(user, period, Number(months) || 12, { shop });
  }

  /* Payouts */
  @Get('payouts') @ApiOperation({ summary: 'Payout history' })
  payouts(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() shop: ShopScope,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.payouts(user, from, to, { shop });
  }

  @Post('pay') @ApiOperation({ summary: 'Record the total paid for a month' })
  pay(@GetUser() user: AuthenticatedUser, @Body() dto: PayoutDto) {
    return this.service.pay(user, dto);
  }

  @Delete('pay/:userId')
  undoPay(@GetUser() user: AuthenticatedUser, @Param('userId') userId: string, @Query('period') period: string) {
    return this.service.undoPay(user, userId, period);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { CreditAccountsService } from './credit-accounts.service';
import { UpsertCreditAccountDto } from './dto/upsert-credit-account.dto';

@ApiTags('Hardware - Credit Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/credit-accounts')
export class CreditAccountsController {
  constructor(private readonly service: CreditAccountsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCreditAccountDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('search') search?: string, @Query('hasBalance') hasBalance?: string, @Query('overdue') overdue?: string) {
    return this.service.list(user, {
      status, search,
      hasBalance: hasBalance === 'true',
      overdue: overdue === 'true',
    });
  }
  @Get('aging-report') aging(@GetUser() user: AuthenticatedUser) { return this.service.agingReport(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCreditAccountDto) { return this.service.update(user, id, dto); }
  @Post(':id/suspend') suspend(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.suspend(user, id, body.reason); }
  @Post(':id/reactivate') reactivate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.reactivate(user, id); }
  @Post(':id/close') close(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.close(user, id, body.reason); }
  @Post(':id/recalculate-aging') recalc(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.recalculateAging(user, id); }
}

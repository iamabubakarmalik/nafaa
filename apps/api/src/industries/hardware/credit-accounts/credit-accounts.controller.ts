import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { CreditAccountsService } from './credit-accounts.service';
import { UpsertCreditAccountDto } from './dto/upsert-credit-account.dto';

/** Contractor credit accounts: reading is khata.view, changing terms is khata.manage. */
@ApiTags('Hardware - Credit Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware/credit-accounts')
export class CreditAccountsController {
  constructor(private readonly service: CreditAccountsService) {}

  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCreditAccountDto) { return this.service.create(user, dto); }
  @RequirePermissions(PERMISSIONS.KHATA_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('search') search?: string, @Query('hasBalance') hasBalance?: string, @Query('overdue') overdue?: string) {
    return this.service.list(user, {
      status, search,
      hasBalance: hasBalance === 'true',
      overdue: overdue === 'true',
    });
  }
  @RequirePermissions(PERMISSIONS.KHATA_VIEW)
  @Get('aging-report') aging(@GetUser() user: AuthenticatedUser) { return this.service.agingReport(user); }
  @RequirePermissions(PERMISSIONS.KHATA_VIEW)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCreditAccountDto) { return this.service.update(user, id, dto); }
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  @Post(':id/suspend') suspend(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.suspend(user, id, body.reason); }
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  @Post(':id/reactivate') reactivate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.reactivate(user, id); }
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  @Post(':id/close') close(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.close(user, id, body.reason); }
  @RequirePermissions(PERMISSIONS.KHATA_MANAGE)
  @Post(':id/recalculate-aging') recalc(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.recalculateAging(user, id); }
}

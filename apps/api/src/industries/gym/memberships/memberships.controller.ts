import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CancelMembershipDto, FreezeDto, MembershipPaymentDto, RenewDto, SubscribeDto } from './dto/membership.dto';
import { MembershipsService } from './memberships.service';

const P = PERMISSIONS;

/** Selling, renewing and taking fees is counter work (pos.use); pausing and stopping is the member's record (customers.edit). */
@ApiTags('Gym - Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Post('subscribe') @RequirePermissions(P.POS_USE)
  subscribe(@GetUser() user: AuthenticatedUser, @Body() dto: SubscribeDto) { return this.service.subscribe(user, dto); }

  @Get() @RequirePermissions(P.CUSTOMERS_VIEW)
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string, @Query('memberId') memberId?: string, @Query('planId') planId?: string,
    @Query('expiringDays') expiringDays?: string, @Query('view') view?: string, @Query('search') search?: string,
    @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.service.list(user, { status, memberId, planId, view, search, page, limit, expiringDays: expiringDays ? Number(expiringDays) : undefined });
  }

  @Post('expire-old') @RequirePermissions(P.CUSTOMERS_EDIT)
  expireOld(@GetUser() user: AuthenticatedUser) { return this.service.expireOldOnes(user); }

  @Get(':id') @RequirePermissions(P.CUSTOMERS_VIEW)
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/payment') @RequirePermissions(P.POS_USE)
  payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: MembershipPaymentDto) { return this.service.addPayment(user, id, body.amount, body.paymentMethod); }

  @Post(':id/renew') @RequirePermissions(P.POS_USE)
  renew(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: RenewDto) { return this.service.renew(user, id, body); }

  @Post(':id/freeze') @RequirePermissions(P.CUSTOMERS_EDIT)
  freeze(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: FreezeDto) { return this.service.freeze(user, id, body); }

  @Post(':id/unfreeze') @RequirePermissions(P.CUSTOMERS_EDIT)
  unfreeze(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.unfreeze(user, id); }

  @Post(':id/cancel') @RequirePermissions(P.CUSTOMERS_EDIT)
  cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CancelMembershipDto) { return this.service.cancel(user, id, body); }

  @Post(':id/reminded') @RequirePermissions(P.CUSTOMERS_EDIT)
  reminded(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.markReminded(user, id); }
}

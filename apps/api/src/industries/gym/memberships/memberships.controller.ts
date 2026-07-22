import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { MembershipsService } from './memberships.service';

@ApiTags('Gym - Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Post('subscribe') subscribe(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.subscribe(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('memberId') memberId?: string, @Query('planId') planId?: string, @Query('expiringDays') expiringDays?: string) {
    return this.service.list(user, { status, memberId, planId, expiringDays: expiringDays ? Number(expiringDays) : undefined });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) { return this.service.addPayment(user, id, body.amount); }
  @Post(':id/freeze') freeze(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { days: number; reason?: string }) { return this.service.freeze(user, id, body.days, body.reason); }
  @Post(':id/unfreeze') unfreeze(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.unfreeze(user, id); }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string; refundAmount?: number }) { return this.service.cancel(user, id, body.reason, body.refundAmount); }
  @Post(':id/renew') renew(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { paidAmount?: number }) { return this.service.renew(user, id, body.paidAmount); }
  @Post('expire-old') expireOld(@GetUser() user: AuthenticatedUser) { return this.service.expireOldOnes(user); }
}

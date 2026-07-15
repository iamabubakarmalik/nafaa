import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { MembershipsService } from './memberships.service';

@ApiTags('Salon - Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Post('plans') createPlan(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.createPlan(user, dto); }
  @Get('plans') listPlans(@GetUser() user: AuthenticatedUser, @Query('active') active?: string) {
    return this.service.listPlans(user, { active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Patch('plans/:id') updatePlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.updatePlan(user, id, dto); }
  @Delete('plans/:id') removePlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.removePlan(user, id); }

  @Post('subscribe') subscribe(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.subscribe(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('planId') planId?: string) {
    return this.service.listMemberships(user, { status, customerId, planId });
  }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.cancel(user, id, body.reason); }
  @Post('expire-old') expireOld(@GetUser() user: AuthenticatedUser) { return this.service.expireOldOnes(user); }
}

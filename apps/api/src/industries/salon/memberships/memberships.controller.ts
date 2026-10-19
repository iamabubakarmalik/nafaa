import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { MembershipsService } from './memberships.service';
import { CancelDto, CreatePlanDto, SubscribeDto, UpdatePlanDto } from './dto/membership.dto';

@ApiTags('Salon - Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Post('plans') createPlan(@GetUser() user: AuthenticatedUser, @Body() dto: CreatePlanDto) { return this.service.createPlan(user, dto); }
  @Get('plans') listPlans(@GetUser() user: AuthenticatedUser, @Query('active') active?: string) {
    return this.service.listPlans(user, { active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Patch('plans/:id') updatePlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePlanDto) { return this.service.updatePlan(user, id, dto); }
  @Delete('plans/:id') removePlan(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.removePlan(user, id); }

  @Post('subscribe') subscribe(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Body() dto: SubscribeDto) {
    return this.service.subscribe(user, { ...dto, shopId: dto.shopId ?? shop.shopId ?? undefined });
  }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('planId') planId?: string, @Query('search') search?: string) {
    return this.service.listMemberships(user, { status, customerId, planId, search });
  }
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: CancelDto) { return this.service.cancel(user, id, body.reason); }
  @Post('expire-old') expireOld(@GetUser() user: AuthenticatedUser) { return this.service.expireOldOnes(user); }
}

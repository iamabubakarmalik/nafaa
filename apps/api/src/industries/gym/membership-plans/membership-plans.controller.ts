import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { MembershipPlansService } from './membership-plans.service';

const P = PERMISSIONS;

@ApiTags('Gym - Membership Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/membership-plans')
export class MembershipPlansController {
  constructor(private readonly service: MembershipPlansService) {}

  @Post() @RequirePermissions(P.PRODUCTS_CREATE) create(@GetUser() user: AuthenticatedUser, @Body() dto: CreatePlanDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('planType') planType?: string, @Query('active') active?: string, @Query('featured') featured?: string) {
    return this.service.list(user, {
      planType,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      featured: featured === 'true' ? true : undefined,
    });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') @RequirePermissions(P.PRODUCTS_EDIT) update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePlanDto) { return this.service.update(user, id, dto); }
  @Delete(':id') @RequirePermissions(P.PRODUCTS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

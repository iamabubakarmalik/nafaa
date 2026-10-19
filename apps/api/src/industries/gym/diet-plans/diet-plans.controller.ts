import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DietPlansService } from './diet-plans.service';
import { CreateDietPlanDto, UpdateDietPlanDto } from './dto/diet-plan.dto';

const P = PERMISSIONS;

/** A member's progress record: reading follows customers.view, writing customers.edit. */
@ApiTags('Gym - Diet Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/diet-plans')
export class DietPlansController {
  constructor(private readonly service: DietPlansService) {}

  @Post() @RequirePermissions(P.CUSTOMERS_EDIT) create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateDietPlanDto) { return this.service.create(user, dto); }
  @Get() @RequirePermissions(P.CUSTOMERS_VIEW) list(@GetUser() user: AuthenticatedUser, @Query('memberId') memberId?: string, @Query('trainerId') trainerId?: string, @Query('active') active?: string) {
    return this.service.list(user, { memberId, trainerId, active: active === 'true' ? true : active === 'false' ? false : undefined });
  }
  @Get(':id') @RequirePermissions(P.CUSTOMERS_VIEW) getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') @RequirePermissions(P.CUSTOMERS_EDIT) update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDietPlanDto) { return this.service.update(user, id, dto); }
  @Delete(':id') @RequirePermissions(P.CUSTOMERS_EDIT) remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

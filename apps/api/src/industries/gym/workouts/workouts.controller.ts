import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { WorkoutsService } from './workouts.service';
import { CreateWorkoutDto, UpdateWorkoutDto } from './dto/workout.dto';

const P = PERMISSIONS;

/** A member's progress record: reading follows customers.view, writing customers.edit. */
@ApiTags('Gym - Workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/workouts')
export class WorkoutsController {
  constructor(private readonly service: WorkoutsService) {}

  @Post() @RequirePermissions(P.CUSTOMERS_EDIT) create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateWorkoutDto) { return this.service.create(user, dto); }
  @Get('by-member/:memberId') @RequirePermissions(P.CUSTOMERS_VIEW) list(@GetUser() user: AuthenticatedUser, @Param('memberId') memberId: string) { return this.service.list(user, memberId); }
  @Get('summary/:memberId') @RequirePermissions(P.CUSTOMERS_VIEW) summary(@GetUser() user: AuthenticatedUser, @Param('memberId') memberId: string) { return this.service.summary(user, memberId); }
  @Get(':id') @RequirePermissions(P.CUSTOMERS_VIEW) getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') @RequirePermissions(P.CUSTOMERS_EDIT) update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateWorkoutDto) { return this.service.update(user, id, dto); }
  @Delete(':id') @RequirePermissions(P.CUSTOMERS_EDIT) remove() { return this.service.remove(); }
}

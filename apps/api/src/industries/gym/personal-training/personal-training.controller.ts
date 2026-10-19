import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { assertCan } from '../common/gym-common';
import { CreatePtDto, PtRateDto, PtStatusDto, PtWorkoutLogDto } from './dto/pt.dto';
import { PersonalTrainingService } from './personal-training.service';

const P = PERMISSIONS;
const SEE = [P.SERVICE_BOOKINGS_VIEW, P.SERVICE_BOOKINGS_MANAGE, P.CUSTOMERS_VIEW];

/**
 * PT sessions are bookings (service.bookings.manage); completing a paid
 * single session also bills it, which the service checks against pos.use.
 */
@ApiTags('Gym - Personal Training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/personal-training')
export class PersonalTrainingController {
  constructor(private readonly service: PersonalTrainingService) {}

  @Post() @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreatePtDto) { return this.service.create(user, dto); }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('memberId') memberId?: string, @Query('trainerId') trainerId?: string, @Query('status') status?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string,
  ) {
    assertCan(user, SEE, 'PT sessions dekhne');
    return this.service.list(user, { memberId, trainerId, status, from, to, search });
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertCan(user, SEE, 'PT session dekhne');
    return this.service.getOne(user, id);
  }

  @Post(':id/status') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PtStatusDto) { return this.service.updateStatus(user, id, dto); }

  @Post(':id/rate') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PtRateDto) { return this.service.rate(user, id, dto); }

  @Post(':id/workout-log') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  log(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PtWorkoutLogDto) { return this.service.logWorkout(user, id, dto); }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { assertCan } from '../common/gym-common';
import { ClassesService } from './classes.service';
import { BookClassDto, CancelBookingDto, ClassStatusDto, CreateClassDto, UpdateClassDto } from './dto/class.dto';

const P = PERMISSIONS;
const SEE = [P.SERVICE_BOOKINGS_VIEW, P.SERVICE_BOOKINGS_MANAGE, P.CUSTOMERS_VIEW];

/** Group classes are bookings: reading needs bookings or members view, any change needs service.bookings.manage. */
@ApiTags('Gym - Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Post() @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateClassDto) { return this.service.create(user, dto); }

  @Get()
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('classType') classType?: string, @Query('status') status?: string, @Query('trainerId') trainerId?: string,
    @Query('from') from?: string, @Query('to') to?: string,
  ) {
    assertCan(user, SEE, 'Classes dekhne');
    return this.service.list(user, { classType, status, trainerId, from, to });
  }

  @Get('calendar')
  calendar(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) {
    assertCan(user, SEE, 'Classes dekhne');
    return this.service.calendar(user, from, to);
  }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertCan(user, SEE, 'Classes dekhne');
    return this.service.getOne(user, id);
  }

  @Patch(':id') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateClassDto) { return this.service.update(user, id, dto); }

  @Post(':id/status') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  status(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ClassStatusDto) { return this.service.updateStatus(user, id, body.status, body.cancelledReason); }

  @Post(':id/book') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  book(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: BookClassDto) { return this.service.book(user, id, body.memberId); }

  @Post('bookings/:bookingId/cancel') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  cancelBooking(@GetUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string, @Body() body: CancelBookingDto) { return this.service.cancelBooking(user, bookingId, body.reason); }

  @Post('bookings/:bookingId/checkin') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  checkIn(@GetUser() user: AuthenticatedUser, @Param('bookingId') bookingId: string) { return this.service.checkIn(user, bookingId); }
}

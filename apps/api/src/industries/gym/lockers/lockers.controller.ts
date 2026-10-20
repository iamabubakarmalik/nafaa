import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { assertCan } from '../common/gym-common';
import { AssignLockerDto, CreateLockerDto, LockerRentDto, ReleaseLockerDto, UpdateLockerDto } from './dto/locker.dto';
import { LockersService } from './lockers.service';

const P = PERMISSIONS;
const SEE = [P.SERVICE_BOOKINGS_VIEW, P.SERVICE_BOOKINGS_MANAGE, P.CUSTOMERS_VIEW];

/**
 * Lockers are a gym service (service.bookings.manage); rent bills also
 * need pos.use, which the service checks.
 */
@ApiTags('Gym - Lockers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/lockers')
export class LockersController {
  constructor(private readonly service: LockersService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query('view') view?: string, @Query('search') search?: string, @Query('memberId') memberId?: string) {
    assertCan(user, SEE, 'Lockers dekhne');
    return this.service.list(user, { view, search, memberId });
  }

  @Post() @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateLockerDto) { return this.service.create(user, dto); }

  @Post('bill-due') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  billDue(@GetUser() user: AuthenticatedUser) { return this.service.billDue(user); }

  @Get(':id')
  getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    assertCan(user, SEE, 'Locker dekhne');
    return this.service.getOne(user, id);
  }

  @Patch(':id') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLockerDto) { return this.service.update(user, id, dto); }

  @Post(':id/assign') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignLockerDto) { return this.service.assign(user, id, dto); }

  @Post(':id/rent') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  rent(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LockerRentDto) { return this.service.rent(user, id, dto); }

  @Post(':id/release') @RequirePermissions(P.SERVICE_BOOKINGS_MANAGE)
  release(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ReleaseLockerDto) { return this.service.release(user, id, dto); }
}

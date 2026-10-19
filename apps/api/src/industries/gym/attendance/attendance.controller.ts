import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';

const P = PERMISSIONS;

/** The door is front-desk work: reading members (customers.view) is enough to check them in and out. */
@ApiTags('Gym - Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('check-in') @RequirePermissions(P.CUSTOMERS_VIEW)
  checkIn(@GetUser() user: AuthenticatedUser, @Body() dto: CheckInDto) { return this.service.checkIn(user, dto); }

  @Post('check-out-all') @RequirePermissions(P.CUSTOMERS_VIEW)
  checkOutAll(@GetUser() user: AuthenticatedUser) { return this.service.checkOutAll(user); }

  @Post(':id/check-out') @RequirePermissions(P.CUSTOMERS_VIEW)
  checkOut(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.checkOut(user, id); }

  @Get('lookup') @RequirePermissions(P.CUSTOMERS_VIEW)
  lookup(@GetUser() user: AuthenticatedUser, @Query('code') code: string) { return this.service.lookup(user, code ?? ''); }

  @Get() @RequirePermissions(P.CUSTOMERS_VIEW)
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('memberId') memberId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('isGuest') isGuest?: string,
    @Query('search') search?: string, @Query('method') method?: string, @Query('page') page?: string, @Query('limit') limit?: string,
  ) {
    return this.service.list(user, { memberId, from, to, search, method, page, limit, isGuest: isGuest === 'true' ? true : isGuest === 'false' ? false : undefined });
  }

  @Get('currently-inside') @RequirePermissions(P.CUSTOMERS_VIEW)
  currentlyInside(@GetUser() user: AuthenticatedUser) { return this.service.currentlyInside(user); }

  @Get('daily-stats') @RequirePermissions(P.CUSTOMERS_VIEW)
  stats(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.dailyStats(user, from, to); }
}

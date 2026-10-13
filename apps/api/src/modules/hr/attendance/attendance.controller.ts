import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../../common/shop-scope';
import { AttendanceService } from './attendance.service';
import {
  CorrectAttendanceDto, CreateLeaveRequestDto, DecideLeaveDto, LeaveQueryDto, PunchDto, SheetQueryDto,
} from './dto/attendance.dto';

/**
 * Attendance board, sheet and leaves. Lives under `staff/` so the staff
 * permissions apply (read: staff.view, write: staff.manage); every path
 * has two segments so it never meets the `staff/:id` routes.
 */
@ApiTags('Staff attendance')
@ApiBearerAuth()
@Controller('staff/timesheet')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get('today')
  today(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: SheetQueryDto) {
    return this.service.board(user, shop, q);
  }

  @Get('sheet')
  sheet(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: SheetQueryDto) {
    return this.service.sheet(user, shop, q);
  }

  @Post('check-in')
  checkIn(@GetUser() user: AuthenticatedUser, @Body() dto: PunchDto) {
    return this.service.checkIn(user, dto);
  }

  @Post('check-out')
  checkOut(@GetUser() user: AuthenticatedUser, @Body() dto: PunchDto) {
    return this.service.checkOut(user, dto);
  }

  /** Owner or manager only; the reason goes to the activity log. */
  @Post('correct')
  correct(@GetUser() user: AuthenticatedUser, @Body() dto: CorrectAttendanceDto) {
    return this.service.correct(user, dto);
  }

  @Get('leaves')
  leaves(@GetUser() user: AuthenticatedUser, @CurrentShop() shop: ShopScope, @Query() q: LeaveQueryDto) {
    return this.service.leaves(user, shop, q);
  }

  @Post('leaves')
  createLeave(@GetUser() user: AuthenticatedUser, @Body() dto: CreateLeaveRequestDto) {
    return this.service.createLeave(user, dto);
  }

  @Post('leaves/:id/decide')
  decideLeave(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DecideLeaveDto) {
    return this.service.decideLeave(user, id, dto);
  }
}

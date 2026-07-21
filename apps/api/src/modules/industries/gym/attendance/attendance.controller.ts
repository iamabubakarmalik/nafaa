import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';

@ApiTags('Gym - Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gym/attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('check-in') checkIn(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.checkIn(user, dto); }
  @Post(':id/check-out') checkOut(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.checkOut(user, id); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('memberId') memberId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('isGuest') isGuest?: string) {
    return this.service.list(user, { memberId, from, to, isGuest: isGuest === 'true' ? true : isGuest === 'false' ? false : undefined });
  }
  @Get('currently-inside') currentlyInside(@GetUser() user: AuthenticatedUser) { return this.service.currentlyInside(user); }
  @Get('daily-stats') stats(@GetUser() user: AuthenticatedUser, @Query('from') from: string, @Query('to') to: string) { return this.service.dailyStats(user, from, to); }
}

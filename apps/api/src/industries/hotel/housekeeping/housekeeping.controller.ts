import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { AssignTaskDto, CompleteTaskDto, HousekeepingTaskDto, ReasonDto } from '../common/hotel.dto';
import { HousekeepingService } from './housekeeping.service';

/** Room work is front-desk work: bookings view to read, bookings manage to change. */
@ApiTags('Hotel - Housekeeping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/housekeeping')
export class HousekeepingController {
  constructor(private readonly service: HousekeepingService) {}

  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: HousekeepingTaskDto) { return this.service.create(user, dto); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW)
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: Record<string, string | undefined>) {
    return this.service.list(user, { status: q.status, assignedTo: q.assignedTo, priority: q.priority, roomId: q.roomId, view: q.view, search: q.search });
  }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW)
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW)
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Post(':id/assign') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: AssignTaskDto) { return this.service.assign(user, id, body); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Post(':id/start') start(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.start(user, id); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CompleteTaskDto) { return this.service.complete(user, id, dto ?? {}); }
  @RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_MANAGE)
  @Post(':id/cancel') cancel(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: ReasonDto) { return this.service.cancel(user, id, body.reason); }
}

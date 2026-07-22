import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { HousekeepingService } from './housekeeping.service';

@ApiTags('Hotel - Housekeeping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotel/housekeeping')
export class HousekeepingController {
  constructor(private readonly service: HousekeepingService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { status: q.status, assignedTo: q.assignedTo, priority: q.priority, roomId: q.roomId });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/assign') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { assignedTo: string; assignedName: string }) {
    return this.service.assign(user, id, body.assignedTo, body.assignedName);
  }
  @Post(':id/start') start(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.start(user, id); }
  @Post(':id/complete') complete(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.complete(user, id, dto); }
}

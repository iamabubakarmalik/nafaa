import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ServiceRemindersService } from './service-reminders.service';

@ApiTags('Auto Parts - Service Reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('autoparts/service-reminders')
export class ServiceRemindersController {
  constructor(private readonly service: ServiceRemindersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('vehicleId') vehicleId?: string, @Query('upcoming') upcoming?: string, @Query('overdue') overdue?: string) {
    return this.service.list(user, { status, vehicleId, upcoming: upcoming === 'true', overdue: overdue === 'true' });
  }
  @Get('by-vehicle/:vehicleId') byVehicle(@GetUser() user: AuthenticatedUser, @Param('vehicleId') vehicleId: string) { return this.service.byVehicle(user, vehicleId); }
  @Post(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string }) { return this.service.updateStatus(user, id, body.status); }
  @Post('auto-generate/:vehicleId') autoGen(@GetUser() user: AuthenticatedUser, @Param('vehicleId') vehicleId: string) { return this.service.autoGenerate(user, vehicleId); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

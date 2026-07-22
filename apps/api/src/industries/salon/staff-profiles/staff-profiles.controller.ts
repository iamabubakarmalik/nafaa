import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { StaffProfilesService } from './staff-profiles.service';
import { UpsertStaffProfileDto } from './dto/upsert-staff-profile.dto';

@ApiTags('Salon - Staff Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('salon/staff-profiles')
export class StaffProfilesController {
  constructor(private readonly service: StaffProfilesService) {}

  @Post() upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertStaffProfileDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('role') role?: string, @Query('bookable') bookable?: string, @Query('search') search?: string) {
    return this.service.list(user, { role, bookable: bookable === 'true' ? true : bookable === 'false' ? false : undefined, search });
  }
  @Get('by-staff/:staffId') byStaff(@GetUser() user: AuthenticatedUser, @Param('staffId') staffId: string) { return this.service.byStaffId(user, staffId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/services') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { services: any[] }) { return this.service.assignServices(user, id, body.services); }
  @Get(':id/availability') availability(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('date') date: string) { return this.service.availability(user, id, date); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

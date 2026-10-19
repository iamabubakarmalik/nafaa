import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { DoctorsService } from './doctors.service';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

/** The doctor list is needed at reception (bookings view); adding or switching off a doctor is staff management. */
@ApiTags('Clinic - Doctors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@RequirePermissions(PERMISSIONS.SERVICE_BOOKINGS_VIEW)
@Controller('clinic/doctors')
export class DoctorsController {
  constructor(private readonly service: DoctorsService) {}

  @Post() @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  upsert(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertDoctorDto) { return this.service.upsert(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('specialty') specialty?: string, @Query('search') search?: string, @Query('featured') featured?: string, @Query('active') active?: string) {
    return this.service.list(user, {
      specialty, search,
      featured: featured === 'true' ? true : undefined,
      active: active === 'false' ? false : active === 'true' ? true : undefined,
    });
  }
  @Get('by-staff/:staffId') byStaff(@GetUser() user: AuthenticatedUser, @Param('staffId') staffId: string) { return this.service.byStaffId(user, staffId); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Get(':id/availability') availability(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('date') date: string) { return this.service.availability(user, id, date); }
  @Delete(':id') @RequirePermissions(PERMISSIONS.STAFF_MANAGE)
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

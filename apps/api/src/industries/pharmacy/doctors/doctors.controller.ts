import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { DoctorsService } from './doctors.service';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

@ApiTags('Pharmacy - Doctors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
/**
 * Doctor directory. Counter staff add and correct doctors while taking a
 * prescription (pos.use); verifying or switching a doctor off is a customer
 * records change (customers.edit).
 */
@Controller('pharmacy/doctors')
export class DoctorsController {
  constructor(private readonly service: DoctorsService) {}

  @RequirePermissions(PERMISSIONS.POS_USE)
  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertDoctorDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('specialization') specialization?: string, @Query('isActive') isActive?: string) {
    return this.service.list(user, { search, specialization, isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @RequirePermissions(PERMISSIONS.POS_USE)
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertDoctorDto) { return this.service.update(user, id, dto); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Post(':id/verify') verify(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.verify(user, id); }
  @RequirePermissions(PERMISSIONS.CUSTOMERS_EDIT)
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

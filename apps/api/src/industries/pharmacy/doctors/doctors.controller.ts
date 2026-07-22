import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DoctorsService } from './doctors.service';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

@ApiTags('Pharmacy - Doctors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/doctors')
export class DoctorsController {
  constructor(private readonly service: DoctorsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertDoctorDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('search') search?: string, @Query('specialization') specialization?: string, @Query('isActive') isActive?: string) {
    return this.service.list(user, { search, specialization, isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertDoctorDto) { return this.service.update(user, id, dto); }
  @Post(':id/verify') verify(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.verify(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

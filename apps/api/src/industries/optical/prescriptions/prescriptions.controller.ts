import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { PrescriptionsService } from './prescriptions.service';
import { UpsertPrescriptionDto } from './dto/upsert-prescription.dto';

@ApiTags('Optical - Prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optical/prescriptions')
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertPrescriptionDto) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('customerId') customerId?: string,
    @Query('active') active?: string,
    @Query('expiringSoon') expiringSoon?: string,
    @Query('expired') expired?: string,
    @Query('prescriptionType') prescriptionType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      customerId, prescriptionType, from, to, search,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      expiringSoon: expiringSoon === 'true',
      expired: expired === 'true',
    });
  }

  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('expiring-soon') expiring(@GetUser() user: AuthenticatedUser, @Query('days') days?: string) {
    return this.service.expiringSoon(user, days ? Number(days) : 60);
  }
  @Get('by-customer/:customerId') byCustomer(@GetUser() user: AuthenticatedUser, @Param('customerId') customerId: string) {
    return this.service.byCustomer(user, customerId);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertPrescriptionDto) { return this.service.update(user, id, dto); }
  @Post(':id/renew') renew(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() overrides: Partial<UpsertPrescriptionDto>) {
    return this.service.renew(user, id, overrides);
  }
  @Post(':id/deactivate') deactivate(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.deactivate(user, id); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

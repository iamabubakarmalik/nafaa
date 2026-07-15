import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto, DispenseDto } from './dto/create-prescription.dto';

@ApiTags('Pharmacy - Prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pharmacy/prescriptions')
export class PrescriptionsController {
  constructor(private readonly service: PrescriptionsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreatePrescriptionDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('doctorId') doctorId?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, customerId, doctorId, from, to, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, { from, to });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/verify') verify(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { notes?: string }) {
    return this.service.verify(user, id, body.notes);
  }
  @Post(':id/reject') reject(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) {
    return this.service.reject(user, id, body.reason);
  }
  @Post(':id/dispense') dispense(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DispenseDto) {
    return this.service.dispense(user, id, dto);
  }
  @Post(':id/refill') refill(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.refill(user, id);
  }
}

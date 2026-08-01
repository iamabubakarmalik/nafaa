import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { EyeTestsService } from './eye-tests.service';
import { CreateEyeTestDto, RecordTestPaymentDto, RecordTestResultsDto, UpdateTestStatusDto } from './dto/create-eye-test.dto';

@ApiTags('Optical - Eye Tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optical/eye-tests')
export class EyeTestsController {
  constructor(private readonly service: EyeTestsService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateEyeTestDto) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('optometristId') optometristId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('today') today?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, { status, customerId, optometristId, from, to, search, today: today === 'true' });
  }

  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('today') today(@GetUser() user: AuthenticatedUser) { return this.service.todaySchedule(user); }
  @Get('available-slots') slots(@GetUser() user: AuthenticatedUser, @Query('optometristId') optometristId: string, @Query('date') date: string) {
    return this.service.availableSlots(user, optometristId, date);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/assign-optometrist') assign(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { optometristId: string }) {
    return this.service.assignOptometrist(user, id, body.optometristId);
  }
  @Post(':id/start') start(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.startTest(user, id); }
  @Post(':id/results') results(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordTestResultsDto) {
    return this.service.recordResults(user, id, dto);
  }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordTestPaymentDto) {
    return this.service.recordPayment(user, id, dto);
  }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTestStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

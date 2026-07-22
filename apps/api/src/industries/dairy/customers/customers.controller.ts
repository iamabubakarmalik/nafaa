import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { DairyCustomersService } from './customers.service';
import { PauseDeliveryDto, UpsertCustomerDto } from './dto/upsert-customer.dto';

@ApiTags('Dairy - Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dairy/customers')
export class DairyCustomersController {
  constructor(private readonly service: DairyCustomersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: UpsertCustomerDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('routeId') routeId?: string, @Query('status') status?: string, @Query('area') area?: string, @Query('search') search?: string) {
    return this.service.list(user, { routeId, status, area, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('outstanding') outstanding(@GetUser() user: AuthenticatedUser) { return this.service.withOutstandingBalance(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id') update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCustomerDto) { return this.service.update(user, id, dto); }
  @Post(':id/payments') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: any) { return this.service.recordPayment(user, id, dto); }
  @Post(':id/pause') pause(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PauseDeliveryDto) { return this.service.pauseDelivery(user, id, dto); }
  @Post(':id/resume') resume(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.resumeDelivery(user, id); }
  @Post(':id/close') close(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason?: string }) { return this.service.close(user, id, body.reason); }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

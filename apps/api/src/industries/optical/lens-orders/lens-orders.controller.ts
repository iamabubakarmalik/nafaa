import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { LensOrdersService } from './lens-orders.service';
import { CreateLensOrderDto, LensOrderPaymentDto, UpdateLensOrderStatusDto } from './dto/create-lens-order.dto';

@ApiTags('Optical - Lens Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('optical/lens-orders')
export class LensOrdersController {
  constructor(private readonly service: LensOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateLensOrderDto) { return this.service.create(user, dto); }

  @Get() list(@GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('labName') labName?: string,
    @Query('pendingPayment') pendingPayment?: string,
    @Query('overdue') overdue?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list(user, {
      status, customerId, labName, from, to, search,
      pendingPayment: pendingPayment === 'true',
      overdue: overdue === 'true',
    });
  }

  @Get('summary') summary(@GetUser() user: AuthenticatedUser) { return this.service.summary(user); }
  @Get('lab-performance') labs(@GetUser() user: AuthenticatedUser) { return this.service.labPerformance(user); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }

  @Post(':id/send-to-lab') sendToLab(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.service.sendToLab(user, id, body);
  }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateLensOrderStatusDto) {
    return this.service.updateStatus(user, id, dto);
  }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LensOrderPaymentDto) {
    return this.service.recordPayment(user, id, dto);
  }
  @Post(':id/deliver') deliver(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { fittingNotes?: string }) {
    return this.service.deliver(user, id, body);
  }
  @Delete(':id') remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.remove(user, id); }
}

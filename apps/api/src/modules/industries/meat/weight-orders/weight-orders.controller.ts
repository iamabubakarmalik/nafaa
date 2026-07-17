import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { WeightOrdersService } from './weight-orders.service';

@ApiTags('Meat - Weight Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meat/weight-orders')
export class WeightOrdersController {
  constructor(private readonly service: WeightOrdersService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('customerId') customerId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, customerId, from, to, search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status: string; cancellationReason?: string }) {
    return this.service.updateStatus(user, id, body.status, body.cancellationReason);
  }
  @Patch(':id/actual-weights') actualWeights(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { items: any[] }) {
    return this.service.updateActualWeights(user, id, body.items);
  }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { amount: number }) {
    return this.service.addPayment(user, id, body.amount);
  }
}

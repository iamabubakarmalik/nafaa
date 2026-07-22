import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { TailoringService } from './tailoring.service';
import { AddPaymentDto, CreateTailoringOrderDto, UpdateOrderStatusDto } from './dto/create-tailoring-order.dto';

@ApiTags('Garments - Tailoring Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('garments/tailoring')
export class TailoringController {
  constructor(private readonly service: TailoringService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateTailoringOrderDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('priority') priority?: string, @Query('customerId') customerId?: string, @Query('tailorId') tailorId?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('search') search?: string) {
    return this.service.list(user, { status, priority, customerId, tailorId, from, to, search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) { return this.service.summary(user, { from, to }); }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/payments') addPayment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) { return this.service.addPayment(user, id, dto); }
}

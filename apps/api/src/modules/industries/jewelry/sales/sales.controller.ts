import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { SalesService } from './sales.service';
import { AddPaymentDto, CreateJewelrySaleDto, UpdateSaleStatusDto } from './dto/create-sale.dto';

@ApiTags('Jewelry - Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: CreateJewelrySaleDto) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { status: q.status, customerId: q.customerId, from: q.from, to: q.to, search: q.search });
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Patch(':id/status') updateStatus(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSaleStatusDto) { return this.service.updateStatus(user, id, dto); }
  @Post(':id/payment') payment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddPaymentDto) { return this.service.addPayment(user, id, dto); }
  @Post(':id/return') markReturned(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { reason: string }) { return this.service.markReturned(user, id, body.reason); }
  @Post(':id/exchange') markExchanged(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { exchangeType: string }) { return this.service.markExchanged(user, id, body.exchangeType); }
}

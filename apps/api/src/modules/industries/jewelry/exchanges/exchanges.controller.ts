import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { ExchangesService } from './exchanges.service';

@ApiTags('Jewelry - Exchanges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jewelry/exchanges')
export class ExchangesController {
  constructor(private readonly service: ExchangesService) {}

  @Post() create(@GetUser() user: AuthenticatedUser, @Body() dto: any) { return this.service.create(user, dto); }
  @Get() list(@GetUser() user: AuthenticatedUser, @Query() q: any) {
    return this.service.list(user, { customerId: q.customerId, exchangeType: q.exchangeType, from: q.from, to: q.to, search: q.search });
  }
  @Get('summary') summary(@GetUser() user: AuthenticatedUser, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(user, from, to);
  }
  @Get(':id') getOne(@GetUser() user: AuthenticatedUser, @Param('id') id: string) { return this.service.getOne(user, id); }
  @Post(':id/link-sale') linkSale(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { saleId: string }) {
    return this.service.linkToSale(user, id, body.saleId);
  }
}

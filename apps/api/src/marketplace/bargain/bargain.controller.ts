import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BargainStatus } from '@prisma/client';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceBargainService } from './bargain.service';
import { StartBargainDto } from './dto/start-bargain.dto';
import { CounterOfferDto } from './dto/counter-offer.dto';

@ApiTags('Marketplace / Bargain (Negotiate)')
@Controller('marketplace/bargain')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceBargainController {
  constructor(private readonly svc: MarketplaceBargainService) {}

  @Post()
  @ApiOperation({ summary: 'Start a bargain by offering a price' })
  start(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: StartBargainDto) {
    return this.svc.start(c.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my bargains with status counts' })
  list(
    @GetCustomer() c: AuthenticatedCustomer,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const statuses = status ? (status.split(',') as BargainStatus[]) : undefined;
    return this.svc.listMy(c.id, statuses, +(limit ?? 20), +(offset ?? 0));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bargain detail with full message history' })
  detail(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.getDetail(c.id, id);
  }

  @Post(':id/counter')
  @ApiOperation({ summary: 'Counter-offer against shop\'s counter' })
  counter(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: CounterOfferDto,
  ) {
    return this.svc.counterOffer(c.id, id, dto);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept shop\'s offer — creates deal ready for cart' })
  accept(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.accept(c.id, id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject bargain' })
  reject(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    return this.svc.reject(c.id, id, body?.reason);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel active bargain' })
  cancel(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.cancel(c.id, id);
  }
}

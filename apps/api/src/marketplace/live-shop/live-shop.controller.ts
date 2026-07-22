import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceLiveShopService } from './live-shop.service';
import { ListLiveShopsDto } from './dto/list-live-shops.dto';
import { SendLiveMessageDto } from './dto/send-message.dto';

@ApiTags('Marketplace / Live Shop')
@Controller('marketplace/live-shops')
export class MarketplaceLiveShopController {
  constructor(private readonly svc: MarketplaceLiveShopService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List live + upcoming shows' })
  list(@Query() dto: ListLiveShopsDto) {
    return this.svc.list(dto);
  }

  @Public()
  @Get('schedule')
  @ApiOperation({ summary: 'Upcoming scheduled live shows' })
  schedule(@Query('limit') limit?: string) {
    return this.svc.getSchedule(+(limit ?? 20));
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Live show detail with products + recent chat' })
  detail(@Param('id') id: string, @Req() req: Request) {
    const customerId = (req as any).customer?.id as string | undefined;
    return this.svc.getDetail(id, customerId);
  }

  @Public()
  @Get(':id/messages')
  @ApiOperation({ summary: 'Poll for new chat messages' })
  messages(
    @Param('id') id: string,
    @Query('sinceMessageId') sinceMessageId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getMessages(id, sinceMessageId, +(limit ?? 50));
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post(':id/join')
  @ApiOperation({ summary: 'Join as viewer' })
  join(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.join(c.id, id);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave the stream' })
  leave(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.leave(c.id, id);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a chat message (rate-limited)' })
  sendMessage(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: SendLiveMessageDto,
  ) {
    return this.svc.sendMessage(c.id, id, dto);
  }
}

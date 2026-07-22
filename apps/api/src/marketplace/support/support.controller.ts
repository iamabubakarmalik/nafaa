import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { MarketplaceSupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { RateTicketDto } from './dto/rate-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';

@ApiTags('Marketplace / Support')
@Controller('marketplace/support')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class MarketplaceSupportController {
  constructor(private readonly svc: MarketplaceSupportService) {}

  @Get('home')
  @ApiOperation({ summary: 'Support home — open tickets count, recent orders, FAQ categories' })
  home(@GetCustomer() c: AuthenticatedCustomer) {
    return this.svc.getSupportHome(c.id);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List my support tickets with status counts' })
  list(@GetCustomer() c: AuthenticatedCustomer, @Query() dto: ListTicketsDto) {
    return this.svc.listTickets(c.id, dto);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create a support ticket (with initial message)' })
  create(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: CreateTicketDto) {
    return this.svc.createTicket(c.id, dto);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket detail with full conversation' })
  detail(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string) {
    return this.svc.getTicket(c.id, id);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Reply to ticket' })
  reply(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.svc.sendMessage(c.id, id, dto);
  }

  @Post('tickets/:id/close')
  @ApiOperation({ summary: 'Close ticket' })
  close(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() body?: { reason?: string },
  ) {
    return this.svc.closeTicket(c.id, id, body?.reason);
  }

  @Post('tickets/:id/rate')
  @ApiOperation({ summary: 'Rate resolution (1-5) + feedback' })
  rate(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() dto: RateTicketDto,
  ) {
    return this.svc.rateTicket(c.id, id, dto);
  }

  @Post('tickets/:id/reopen')
  @ApiOperation({ summary: 'Reopen a resolved/closed ticket (within 7 days)' })
  reopen(
    @GetCustomer() c: AuthenticatedCustomer,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.svc.reopenTicket(c.id, id, body.reason);
  }
}

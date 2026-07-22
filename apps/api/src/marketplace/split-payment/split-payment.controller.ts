import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { SplitPaymentService } from './split-payment.service';
import { CreateSplitDto } from './dto/create-split.dto';

@ApiTags('Marketplace / Split Payment')
@Controller('marketplace/split-payments')
export class SplitPaymentController {
  constructor(private readonly svc: SplitPaymentService) {}

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth()
  @Post()
  create(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: CreateSplitDto) {
    return this.svc.create(c.id, dto);
  }

  @Public() @Get('by-token/:token')
  byToken(@Param('token') token: string) { return this.svc.getByToken(token); }

  @Public() @Post('participants/:id/pay')
  pay(@Param('id') id: string, @Body() body: { paymentRef: string; amount: number }) {
    return this.svc.payShare(id, body.paymentRef, body.amount);
  }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth()
  @Get('mine')
  mine(@GetCustomer() c: AuthenticatedCustomer) { return this.svc.mySplits(c.id); }
}

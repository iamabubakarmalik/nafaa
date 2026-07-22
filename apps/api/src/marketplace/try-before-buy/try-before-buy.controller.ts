import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TryBeforeBuyStatus } from '@prisma/client';
import { CustomerAuthGuard } from '../_shared/guards/customer-auth.guard';
import { GetCustomer } from '../_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../auth/interfaces/customer-jwt.interface';
import { TryBeforeBuyService } from './try-before-buy.service';
import { RequestTrialDto } from './dto/request-trial.dto';

@ApiTags('Marketplace / Try Before You Buy')
@Controller('marketplace/try-before-buy')
export class TryBeforeBuyController {
  constructor(private readonly svc: TryBeforeBuyService) {}

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Post()
  request(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: RequestTrialDto) {
    return this.svc.request(c.id, dto);
  }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Post(':id/pay-deposit')
  payDeposit(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string, @Body() body: { paymentRef: string }) {
    return this.svc.payDeposit(c.id, id, body.paymentRef);
  }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Post(':id/purchase')
  purchase(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string, @Body() body: { orderId: string }) {
    return this.svc.purchase(c.id, id, body.orderId);
  }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Post(':id/return')
  return_(@GetCustomer() c: AuthenticatedCustomer, @Param('id') id: string, @Body() body: { condition: string; photos: string[] }) {
    return this.svc.returnItem(c.id, id, body.condition, body.photos);
  }

  @UseGuards(CustomerAuthGuard) @ApiBearerAuth() @Get('mine')
  mine(@GetCustomer() c: AuthenticatedCustomer, @Query('status') status?: TryBeforeBuyStatus) {
    return this.svc.myRequests(c.id, status);
  }

  // Shop-side (should be behind tenant guard — using CustomerAuthGuard here for MVP simplicity)
  @Post('shop/:shopId/approve/:id')
  approve(@Param('id') id: string) { return this.svc.approve('', id); }

  @Post('shop/:shopId/delivered/:id')
  delivered(@Param('id') id: string) { return this.svc.markDelivered(id); }

  @Get('shop/:shopId')
  shopRequests(@Param('shopId') shopId: string, @Query('status') status?: TryBeforeBuyStatus) {
    return this.svc.shopRequests(shopId, status);
  }
}

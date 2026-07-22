import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { B2BAccountTier, B2BOrderStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { B2BWholesaleService } from './b2b-wholesale.service';
import { CreateB2BOrderDto } from './dto/create-b2b-order.dto';

@ApiTags('B2B Wholesale')
@Controller('b2b-wholesale')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class B2BWholesaleController {
  constructor(private readonly svc: B2BWholesaleService) {}

  @Post('register')
  register(@Body() body: { buyerShopId: string; cnicNumber?: string; taxNumber?: string; businessProofUrls?: string[] }) {
    return this.svc.registerBuyer(body.buyerShopId, body);
  }

  @Post('verify/:buyerShopId')
  verify(@Param('buyerShopId') id: string, @Body() body: { tier: B2BAccountTier; creditLimit: number; creditDays: number; discountPct: number }) {
    return this.svc.verifyAccount(id, body.tier, body.creditLimit, body.creditDays, body.discountPct);
  }

  @Get('account/:buyerShopId')
  account(@Param('buyerShopId') id: string) { return this.svc.getAccount(id); }

  @Post('orders')
  createOrder(@Body() dto: CreateB2BOrderDto) { return this.svc.createOrder(dto); }

  @Patch('orders/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: B2BOrderStatus; notes?: string }) {
    return this.svc.updateStatus(id, body.status, body.notes);
  }

  @Post('orders/:id/payment')
  recordPayment(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.svc.recordPayment(id, body.amount);
  }

  @Get('orders')
  list(
    @Query('buyerShopId') buyerShopId?: string,
    @Query('sellerShopId') sellerShopId?: string,
    @Query('status') status?: B2BOrderStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listOrders({ buyerShopId, sellerShopId, status, limit: +(limit ?? 20), offset: +(offset ?? 0) });
  }
}

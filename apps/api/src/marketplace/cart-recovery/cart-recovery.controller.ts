import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CartRecoveryStage } from '@prisma/client';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CartRecoveryService } from './cart-recovery.service';

@ApiTags('Marketplace / Cart Recovery (Admin)')
@Controller('marketplace/cart-recovery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CartRecoveryController {
  constructor(private readonly svc: CartRecoveryService) {}

  @Post('detect') detect() { return this.svc.detectAndStartRecovery(); }
  @Post('reminders/first') first(@Body() b: { customerId: string }) { return this.svc.sendFirstReminder(b.customerId); }
  @Post('reminders/second') second(@Body() b: { customerId: string }) { return this.svc.sendSecondReminder(b.customerId); }
  @Post('reminders/coupon') coupon(@Body() b: { customerId: string }) { return this.svc.offerCoupon(b.customerId); }

  @Get() list(@Query('stage') stage?: CartRecoveryStage, @Query('limit') l?: string) {
    return this.svc.listCampaigns({ stage, limit: +(l ?? 50) });
  }

  @Get('stats') stats() { return this.svc.getStats(); }
}

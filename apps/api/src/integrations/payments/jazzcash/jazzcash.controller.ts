import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { CustomerAuthGuard } from '../../../marketplace/_shared/guards/customer-auth.guard';
import { GetCustomer } from '../../../marketplace/_shared/decorators/get-customer.decorator';
import { AuthenticatedCustomer } from '../../../marketplace/auth/interfaces/customer-jwt.interface';
import { JazzCashService } from './jazzcash.service';
import { InitiateJazzCashDto } from './dto/initiate-payment.dto';
import { VerifyJazzCashDto } from './dto/verify-payment.dto';
import { RefundJazzCashDto } from './dto/refund.dto';

@ApiTags('Integrations / JazzCash')
@Controller('integrations/payments/jazzcash')
export class JazzCashController {
  constructor(private readonly svc: JazzCashService) {}

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('initiate')
  @ApiOperation({ summary: 'Initiate JazzCash payment (wallet / card / voucher)' })
  initiate(@GetCustomer() c: AuthenticatedCustomer, @Body() dto: InitiateJazzCashDto) {
    return this.svc.initiate(dto, c.id);
  }

  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @Post('verify')
  @ApiOperation({ summary: 'Verify transaction status' })
  verify(@Body() dto: VerifyJazzCashDto) {
    return this.svc.verify(dto);
  }

  @Public()
  @Post('callback')
  @ApiOperation({ summary: 'JazzCash callback endpoint (redirect)' })
  callback(@Body() body: Record<string, string>) {
    return this.svc.handleCallback(body);
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'JazzCash GET callback' })
  callbackGet(@Query() query: Record<string, string>, @Res() res: Response) {
    return this.svc.handleCallback(query).then((result) => {
      const status = result.success ? 'success' : 'failed';
      const frontendUrl = process.env.APP_URL ?? 'http://localhost:5173';
      return res.redirect(
        `${frontendUrl}/market/orders/${result.orderId}/payment-result?status=${status}&ref=${result.txnRefNo}`,
      );
    });
  }

  @Post('refund')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund JazzCash transaction (business-side)' })
  refund(@Body() dto: RefundJazzCashDto) {
    return this.svc.refund(dto);
  }
}

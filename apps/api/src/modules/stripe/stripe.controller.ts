import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { StripeService } from './stripe.service';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly service: StripeService) {}

  @Public()
  @Get('config')
  config() {
    return this.service.publishableKey();
  }

  @ApiBearerAuth()
  @Post('checkout')
  checkout(
    @GetUser() user: AuthenticatedUser,
    @Body() body: { invoiceId: string },
  ) {
    return this.service.createCheckoutSession(user, body.invoiceId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    return this.service.handleWebhook(raw, signature);
  }
}

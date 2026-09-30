import { All, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { CurrentShop, ShopScope } from '../../common/shop-scope';
import { PaymentLinksService } from './payment-links.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentLinksController {
  constructor(private readonly svc: PaymentLinksService) {}

  @Get('online-store/payments')
  @ApiOperation({ summary: 'Payment gateways — kaun jura, kaise jorna' })
  accounts(@GetUser() user: AuthenticatedUser) {
    return this.svc.accounts(user);
  }

  @Post('online-store/payments/:code/connect')
  connect(@GetUser() user: AuthenticatedUser, @Param('code') code: string, @Body() body: { credentials?: Record<string, string>; env?: string }) {
    return this.svc.connect(user, code.toUpperCase(), body ?? {});
  }

  @Patch('online-store/payments/:code')
  active(@GetUser() user: AuthenticatedUser, @Param('code') code: string, @Body() body: { active?: boolean }) {
    return this.svc.setActive(user, code.toUpperCase(), body?.active !== false);
  }

  @Delete('online-store/payments/:code')
  disconnect(@GetUser() user: AuthenticatedUser, @Param('code') code: string) {
    return this.svc.disconnect(user, code.toUpperCase());
  }

  @Post('online-orders/:id/payment-link')
  @ApiOperation({ summary: 'Order ka payment link (poori raqam ya advance)' })
  link(
    @GetUser() user: AuthenticatedUser,
    @CurrentShop() scope: ShopScope,
    @Param('id') id: string,
    @Body() body: { provider?: string; amount?: number },
  ) {
    return this.svc.createLink(user, scope, id, body ?? {});
  }
}

/** Customer ka pay safha + gateway se wapsi (login nahi) */
@ApiTags('Payments (public)')
@Public()
@Controller('integrations/payments/v2')
export class PaymentLinksPublicController {
  constructor(private readonly svc: PaymentLinksService) {}

  @Get('link/:token')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  info(@Param('token') token: string) {
    return this.svc.publicInfo(token);
  }

  @Post('link/:token/start')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  start(@Param('token') token: string, @Body() body: { mobile?: string; cnic?: string }) {
    return this.svc.start(token, body ?? {});
  }

  /** Gateway yahan wapas bhejta hai — GET (Safepay) ya form POST (JazzCash) */
  @All('return/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async back(@Param('token') token: string, @Query() query: Record<string, string>, @Req() req: Request, @Res() res: Response) {
    const data = { ...(query ?? {}), ...((req.body && typeof req.body === 'object') ? req.body : {}) };
    return res.redirect(302, await this.svc.handleReturn(token, data));
  }
}

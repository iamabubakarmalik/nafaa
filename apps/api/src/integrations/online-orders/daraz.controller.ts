import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { DarazService } from './daraz.service';
import { WebsiteSetupService } from './website-setup.service';

/** Daraz "Allow" ke baad yahan wapas — web ke done-safhe par */
@ApiTags('Daraz (public)')
@Public()
@Throttle({ default: { limit: 60, ttl: 60_000 } })
// Purane module ka bhi GET integrations/daraz/callback hai — naya alag path par
@Controller('integrations/daraz/oauth')
export class DarazPublicController {
  constructor(private readonly daraz: DarazService) {}

  @Get('callback')
  @ApiOperation({ summary: 'Daraz OAuth callback' })
  async callback(@Query() query: Record<string, string>, @Res() res: Response) {
    return res.redirect(302, await this.daraz.callback(query));
  }
}

@ApiTags('Online Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class DarazController {
  constructor(private readonly daraz: DarazService, private readonly setup: WebsiteSetupService) {}

  @Get('online-store/channels/daraz/status')
  status() {
    return { configured: this.daraz.configured(), callbackUrl: this.daraz.redirectUri() };
  }

  @Post('online-store/channels/daraz/start')
  @ApiOperation({ summary: 'Daraz jorein — Daraz login ka link' })
  start(@GetUser() user: AuthenticatedUser, @Body() body: { displayName?: string; shopId?: string; channelId?: string; returnOrigin?: string }) {
    return this.daraz.start(user, body ?? {});
  }

  @Post('online-store/channels/:id/daraz/sync-orders')
  async syncOrders(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    return this.daraz.syncOrders(await this.setup.requireChannel(user.tenantId, id));
  }

  @Post('online-store/channels/:id/daraz/link-products')
  @ApiOperation({ summary: 'Daraz ke SellerSku ko Nafaa SKU se jorna' })
  async link(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    return this.daraz.linkProducts(await this.setup.requireChannel(user.tenantId, id));
  }

  @Post('online-store/channels/:id/daraz/sync-stock')
  async stock(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    this.setup.assertCanManage(user);
    return this.daraz.syncStock(await this.setup.requireChannel(user.tenantId, id));
  }

  @Post('online-orders/:id/daraz/rts')
  @ApiOperation({ summary: 'Daraz: pack + ready to ship' })
  rts(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.daraz.readyToShip(user, id);
  }

  @Get('online-orders/:id/daraz/label')
  async label(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Res() res: Response) {
    const r = await this.daraz.label(user, id);
    if (r.pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="daraz-label.pdf"');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(r.pdf);
      return;
    }
    res.json({ url: r.url });
  }
}

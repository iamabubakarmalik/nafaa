import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { DarazService } from './daraz.service';

@ApiTags('Integrations / Daraz')
@Controller('integrations/daraz')
export class DarazController {
  constructor(private readonly svc: DarazService) {}

  // ─── OAuth callback (Daraz redirects here) ───
  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'Daraz OAuth callback' })
  async callback(@Query('code') code: string, @Query('state') state: string) {
    const result = await this.svc.handleCallback(state, code);
    const frontendUrl = process.env.APP_URL ?? 'http://localhost:5173';
    // Redirect to frontend with success message
    return { ...result, redirect: `${frontendUrl}/integrations?status=daraz_connected` };
  }

  // ─── Get auth URL ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':integrationId/auth-url')
  authUrl(@Param('integrationId') id: string, @Body() body: any) {
    return this.svc.getAuthUrl(id, body);
  }

  // ─── Sync orders ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':integrationId/sync')
  sync(@Param('integrationId') id: string) {
    return this.svc.syncOrders(id);
  }

  // ─── Push product ───
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @Post(':integrationId/push-product')
  pushProduct(@Param('integrationId') id: string, @Body() body: { productId: string }) {
    return this.svc.pushProduct(id, body.productId);
  }
}

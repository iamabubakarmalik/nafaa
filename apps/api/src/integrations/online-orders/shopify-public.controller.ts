import { Body, Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { ShopifyService } from './shopify.service';

/**
 * Shopify ke public raaste:
 *  - GET  /integrations/shopify/callback  → Install ke baad (popup me), web ke done-safhe par bhejta hai
 *  - POST /integrations/shopify/compliance/:topic → lazmi GDPR webhooks
 *      (customers-data-request, customers-redact, shop-redact)
 */
@ApiTags('Shopify (public)')
@Public()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('integrations/shopify')
export class ShopifyPublicController {
  constructor(private readonly shopify: ShopifyService) {}

  @Get('callback')
  @ApiOperation({ summary: 'Shopify OAuth callback' })
  async callback(@Query() query: Record<string, string>, @Res() res: Response) {
    const to = await this.shopify.callback(query);
    return res.redirect(302, to);
  }

  @Post('compliance/:topic')
  @HttpCode(200)
  @ApiOperation({ summary: 'Shopify GDPR compliance webhooks' })
  compliance(@Param('topic') topic: string, @Req() req: Request, @Body() body: any) {
    const t = String(req.headers['x-shopify-topic'] ?? topic.replace(/-/g, '/').replace('customers/data/request', 'customers/data_request'));
    return this.shopify.compliance(t, (req as any).rawBody, req.headers['x-shopify-hmac-sha256'] as string | undefined, body);
  }
}

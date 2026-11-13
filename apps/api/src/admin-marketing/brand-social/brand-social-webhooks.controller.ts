/**
 * Public callbacks for Nafaa Social (`/api/brand-social/webhooks`). Threads
 * calls these when the Nafaa account removes the app (uninstall) or asks for
 * its data to be deleted. Both carry a signed_request signed with the Threads
 * app secret; a bad signature is refused.
 *
 * Paste into the Meta app (Threads use case → Settings):
 *   Uninstall callback URL: https://api.nafaa.pk/api/brand-social/webhooks/threads/uninstall
 *   Delete callback URL:    https://api.nafaa.pk/api/brand-social/webhooks/threads/delete
 */
import { Body, Controller, Get, HttpCode, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { BrandSocialPlatformsService } from './brand-social-platforms.service';

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

@ApiTags('Nafaa Social - callbacks')
@Public()
@Controller('brand-social/webhooks')
export class BrandSocialWebhooksController {
  constructor(private readonly platforms: BrandSocialPlatformsService) {}

  @Post('threads/uninstall')
  @HttpCode(200)
  async threadsUninstall(@Body() body: { signed_request?: string }, @Res() res: Response) {
    const out = await this.platforms.threadsUninstall(body?.signed_request);
    return res.status(out.ok ? 200 : 400).json(out.ok ? { ok: true } : { error: 'invalid signed_request' });
  }

  @Post('threads/delete')
  @HttpCode(200)
  async threadsDelete(@Body() body: { signed_request?: string }, @Res() res: Response) {
    const out = await this.platforms.threadsDelete(body?.signed_request);
    if (!out) return res.status(400).json({ error: 'invalid signed_request' });
    return res.status(200).json(out);
  }

  @Get('threads/deletion-status')
  async threadsDeletionStatus(@Query('code') code: string, @Res() res: Response) {
    const s = await this.platforms.threadsDeletionStatus(code);
    const body = s
      ? `<p>Request <b>${esc(s.code)}</b>: the Threads data held by Nafaa Social (access token and profile picture) has been deleted.</p><p>Requested ${esc(s.requestedAt)}, completed ${esc(s.completedAt)}.</p>`
      : '<p>No deletion request with this code.</p>';
    res.status(s ? 200 : 404).type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nafaa data deletion</title><body style="font-family:system-ui;max-width:560px;margin:40px auto;padding:0 16px"><h1>Nafaa: Threads data deletion</h1>${body}<p>Questions: support@nafaa.pk</p></body>`);
  }
}

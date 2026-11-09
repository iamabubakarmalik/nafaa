import { Body, Controller, Delete, Get, HttpCode, Logger, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { metaAppConfig, verifyHubSignature } from './meta-graph';
import { MetaService } from './meta.service';
import { MetaInboxService } from './meta-inbox.service';
import { MetaPublishService } from './meta-publish.service';
import { MetaCatalogService } from './meta-catalog.service';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Calls from Meta: OAuth return, webhooks, deauthorize and data deletion. */
@ApiTags('Meta (public)')
@Public()
@Throttle({ default: { limit: 600, ttl: 60_000 } })
@Controller('integrations/meta')
export class MetaPublicController {
  private readonly logger = new Logger('MetaWebhook');

  constructor(private readonly meta: MetaService, private readonly inbox: MetaInboxService) {}

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Facebook Login for Business return' })
  async callback(@Query() query: Record<string, string>, @Res() res: Response) {
    return res.redirect(302, await this.meta.callback(query ?? {}));
  }

  /** Webhook verification: echo hub.challenge when the verify token matches. */
  @Get('webhook')
  verify(@Query() q: Record<string, string>, @Res() res: Response) {
    const cfg = metaAppConfig();
    if (q['hub.mode'] === 'subscribe' && cfg?.verifyToken && q['hub.verify_token'] === cfg.verifyToken) {
      return res.status(200).type('text/plain').send(String(q['hub.challenge'] ?? ''));
    }
    return res.status(403).send('Forbidden');
  }

  /** Webhook events (page, instagram, whatsapp_business_account). Signed with X-Hub-Signature-256. */
  @Post('webhook')
  @HttpCode(200)
  receive(@Req() req: Request, @Body() body: any, @Res() res: Response) {
    const cfg = metaAppConfig();
    const raw: Buffer | undefined = (req as any).rawBody;
    const ok = !!cfg && !!raw && verifyHubSignature(raw, req.headers['x-hub-signature-256'] as string | undefined, cfg.appSecret);
    if (!ok) {
      this.logger.warn(`Meta webhook with a wrong signature (object ${body?.object ?? '?'})`);
      return res.status(401).send('Bad signature');
    }
    // Answer at once; Meta retries slow deliveries.
    res.status(200).send('EVENT_RECEIVED');
    this.inbox.onWebhook(body).catch((e) => this.logger.warn(`Meta webhook: ${(e as Error).message}`));
  }

  @Post('deauthorize')
  @HttpCode(200)
  async deauthorize(@Body() body: { signed_request?: string }) {
    await this.meta.deauthorize(body?.signed_request);
    return { ok: true };
  }

  /** Data deletion request callback: returns { url, confirmation_code } as Meta expects. */
  @Post('data-deletion')
  @HttpCode(200)
  async dataDeletion(@Body() body: { signed_request?: string }, @Res() res: Response) {
    const out = await this.meta.dataDeletion(body?.signed_request);
    if (!out) return res.status(400).json({ error: 'invalid signed_request' });
    return res.status(200).json(out);
  }

  @Get('data-deletion/status')
  async deletionStatus(@Query('code') code: string, @Res() res: Response) {
    const s = await this.meta.deletionStatus(code);
    const body = s
      ? `<p>Request <b>${esc(s.code)}</b>: ${s.status === 'DONE' ? 'your Facebook data has been deleted from Nafaa' : 'received, deletion in progress'}.</p><p>Requested ${esc(s.requestedAt)}${s.completedAt ? `, completed ${esc(s.completedAt)}` : ''}.</p>`
      : '<p>No deletion request with this code.</p>';
    res.status(s ? 200 : 404).type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nafaa data deletion</title><body style="font-family:system-ui;max-width:560px;margin:40px auto;padding:0 16px"><h1>Nafaa — data deletion</h1>${body}<p>Questions: support@nafaa.pk</p></body>`);
  }
}

/** Merchant: Facebook & Instagram settings and catalog. */
@ApiTags('Meta')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('integrations/meta')
export class MetaController {
  constructor(private readonly meta: MetaService, private readonly catalog: MetaCatalogService) {}

  @Get('status')
  status(@GetUser() user: AuthenticatedUser) {
    return this.meta.status(user);
  }

  @Post('connect')
  connect(@GetUser() user: AuthenticatedUser, @Body() body: { returnOrigin?: string }) {
    return this.meta.start(user, body ?? {});
  }

  @Post('refresh')
  refresh(@GetUser() user: AuthenticatedUser) {
    return this.meta.refresh(user);
  }

  @Patch('assets')
  assets(@GetUser() user: AuthenticatedUser, @Body() body: { pageId?: string | null; adAccountId?: string | null; businessId?: string | null; catalogId?: string | null }) {
    return this.meta.selectAssets(user, body ?? {});
  }

  @Patch('settings')
  settings(@GetUser() user: AuthenticatedUser, @Body() body: { autoPublish?: boolean; inboxEnabled?: boolean; catalogSync?: boolean }) {
    return this.meta.updateSettings(user, body ?? {});
  }

  @Post('disconnect')
  disconnect(@GetUser() user: AuthenticatedUser) {
    return this.meta.disconnect(user);
  }

  @Get('catalog')
  catalogOverview(@GetUser() user: AuthenticatedUser) {
    return this.catalog.overview(user);
  }

  @Post('catalog')
  createCatalog(@GetUser() user: AuthenticatedUser, @Body() body: { name?: string }) {
    return this.catalog.createCatalog(user, body ?? {});
  }

  @Post('catalog/sync')
  syncCatalog(@GetUser() user: AuthenticatedUser) {
    return this.catalog.syncNow(user);
  }
}

/** Merchant: unified inbox (/online-store/inbox). */
@ApiTags('Meta inbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-store/inbox')
export class MetaInboxController {
  constructor(private readonly inbox: MetaInboxService) {}

  @Get()
  list(@GetUser() user: AuthenticatedUser, @Query() q: { tab?: string; status?: string; search?: string; platform?: string }) {
    return this.inbox.list(user, q ?? {});
  }

  @Post('pull')
  pull(@GetUser() user: AuthenticatedUser) {
    return this.inbox.pull(user);
  }

  @Get('lookup')
  lookup(@GetUser() user: AuthenticatedUser, @Query('phone') phone: string) {
    return this.inbox.lookup(user, phone ?? '');
  }

  @Get('conversations/:id')
  conversation(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inbox.conversation(user, id);
  }

  @Post('conversations/:id/reply')
  reply(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { text?: string }) {
    return this.inbox.reply(user, id, body ?? {});
  }

  @Patch('conversations/:id')
  update(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { status?: string; phone?: string | null; customerId?: string | null; channelOrderId?: string | null }) {
    return this.inbox.updateConversation(user, id, body ?? {});
  }

  @Post('comments/read')
  read(@GetUser() user: AuthenticatedUser, @Body() body: { ids?: string[] }) {
    return this.inbox.markCommentsRead(user, body ?? {});
  }

  @Post('comments/:id/reply')
  replyComment(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { text?: string; private?: boolean }) {
    return this.inbox.replyComment(user, id, body ?? {});
  }

  @Post('comments/:id/hide')
  hide(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { hidden?: boolean }) {
    return this.inbox.hideComment(user, id, body ?? {});
  }

  @Delete('comments/:id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inbox.deleteComment(user, id);
  }
}

/** Social studio: publish status and "post now" to Facebook / Instagram. */
@ApiTags('Social studio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('online-store/social/meta')
export class MetaSocialController {
  constructor(private readonly publish: MetaPublishService) {}

  @Get('status')
  status(@GetUser() user: AuthenticatedUser) {
    return this.publish.studioStatus(user);
  }

  @Post('publish/:id')
  publishNow(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { platforms?: string[] }) {
    return this.publish.publishNow(user, id, body ?? {});
  }
}

/**
 * Nafaa Social automation API (`/api/brand-social/automation`) for an
 * automated marketer. No admin login: `Authorization: Bearer nsk_...` (an
 * automation key from the admin Settings page). It can write posts (always
 * IN_REVIEW), add media, import content packs, draft first comments and read;
 * it can never approve, publish, connect accounts or change settings.
 * Every call, allowed or refused, goes to the admin audit log with the key
 * name as the actor. Rate limit: 120 calls a minute per key (plus the
 * global per-IP limit).
 */
import {
  Body, CallHandler, CanActivate, Controller, ExecutionContext, Get, HttpCode, HttpException, HttpStatus, Injectable, Logger, NestInterceptor,
  Param, Patch, Post, Query, SetMetadata, createParamDecorator, UnauthorizedException, ForbiddenException, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Observable, tap } from 'rxjs';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandSocialAccountsService } from './brand-social-accounts.service';
import { BrandSocialInsightsService } from './brand-social-insights.service';
import { BrandSocialMediaService, MEDIA_MAX_BYTES, PACK_MAX_BYTES } from './brand-social-media.service';
import { BrandSocialPostsService, SocialActor } from './brand-social-posts.service';
import { AutomationActor, BrandSocialSettingsService } from './brand-social-settings.service';
import type { AssetInput, AutomationScope, CommentDraftInput, PostInput, PostListQuery } from './brand-social.types';

const SCOPE_KEY = 'brandSocialAutomationScope';
const Scope = (s: AutomationScope) => SetMetadata(SCOPE_KEY, s);
const PER_MINUTE = 120;

interface AutomationRequest { automation?: AutomationActor; automationScope?: string; headers: Record<string, string | undefined>; method: string; originalUrl?: string; url: string; params?: Record<string, string>; ip?: string; body?: unknown }

/** Writes one audit row per automation call. */
async function audit(prisma: PrismaService, req: AutomationRequest, statusCode: number, summary?: string) {
  const path = String(req.originalUrl ?? req.url ?? '').split('?')[0];
  const body = req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : null;
  await prisma.adminAuditLog.create({
    data: {
      actorId: null,
      actorEmail: req.automation ? `automation:${req.automation.name}` : 'automation:unknown',
      action: `social.automation.${req.automationScope ?? 'auth'}`,
      method: req.method,
      path,
      targetType: 'brand-social',
      targetId: req.params?.id ?? null,
      statusCode,
      summary: summary?.slice(0, 300) ?? null,
      ip: req.ip ?? null,
      userAgent: req.headers?.['user-agent']?.slice(0, 300) ?? null,
      metadata: { keyId: req.automation?.keyId ?? null, body: body && body.length <= 4000 ? JSON.parse(body) : body ? `${body.slice(0, 4000)}…` : null },
    },
  }).catch(() => null);
}

@Injectable()
export class AutomationKeyGuard implements CanActivate {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly reflector: Reflector, private readonly settings: BrandSocialSettingsService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AutomationRequest>();
    const scope = this.reflector.get<AutomationScope | undefined>(SCOPE_KEY, context.getHandler());
    req.automationScope = scope;
    const header = String(req.headers?.authorization ?? '');
    const m = /^Bearer\s+(\S+)$/i.exec(header);
    const actor = m ? await this.settings.verifyKey(m[1]) : null;
    if (!actor) {
      await audit(this.prisma, req, 401, 'Missing or unknown automation key');
      throw new UnauthorizedException('A valid automation key is needed (Authorization: Bearer nsk_...).');
    }
    req.automation = actor;
    const now = Date.now();
    const recent = (this.hits.get(actor.keyId) ?? []).filter((t) => now - t < 60_000);
    if (recent.length >= PER_MINUTE) {
      await audit(this.prisma, req, 429, 'Rate limit');
      throw new HttpException('Too many calls with this key. Wait a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    this.hits.set(actor.keyId, recent);
    if (!scope || !actor.scopes.includes(scope)) {
      await audit(this.prisma, req, 403, `Key has no "${scope ?? '?'}" scope`);
      throw new ForbiddenException(`This key does not have the "${scope ?? '?'}" scope.`);
    }
    return true;
  }
}

@Injectable()
export class AutomationAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('BrandSocialAutomation');
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AutomationRequest>();
    return next.handle().pipe(tap({
      next: () => { void audit(this.prisma, req, context.switchToHttp().getResponse()?.statusCode ?? 200); },
      error: (err: { status?: number; message?: string }) => {
        this.logger.warn(`${req.automation?.name ?? '?'} ${req.method} ${req.url}: ${err?.message ?? ''}`);
        void audit(this.prisma, req, err?.status ?? 500, err?.message);
      },
    }));
  }
}

/** The automation key behind the request (set by AutomationKeyGuard). */
export const AutomationActorParam = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AutomationRequest>().automation);

const actorOf = (a: AutomationActor): SocialActor => ({ id: `key:${a.keyId}`, automation: true });

@ApiTags('Nafaa Social - automation')
@ApiBearerAuth()
@Public()
@UseGuards(AutomationKeyGuard)
@UseInterceptors(AutomationAuditInterceptor)
@Controller('brand-social/automation')
export class BrandSocialAutomationController {
  constructor(
    private readonly posts: BrandSocialPostsService,
    private readonly accounts: BrandSocialAccountsService,
    private readonly insights: BrandSocialInsightsService,
    private readonly media: BrandSocialMediaService,
    private readonly settings: BrandSocialSettingsService,
  ) {}

  /* ───── reads ───── */
  @Get('posts') @Scope('read') list(@Query() q: PostListQuery) { return this.posts.list(q ?? {}); }
  @Get('posts/:id') @Scope('read') get(@Param('id') id: string) { return this.posts.one(id); }
  @Get('accounts') @Scope('read') async accountsList() { const r = await this.accounts.list(); return { accounts: r.accounts }; }
  @Get('settings') @Scope('read') getSettings() { return this.settings.get(); }
  @Get('analytics') @Scope('read') analytics(@Query() q: { from?: string; to?: string }) { return this.insights.analytics(q ?? {}); }
  @Get('assets') @Scope('read') assets(@Query() q: { search?: string; kind?: string; folder?: string }) { return this.media.list(q ?? {}); }

  /* ───── posts (always IN_REVIEW) ───── */
  @Post('posts') @Scope('posts')
  create(@Body() b: PostInput, @AutomationActorParam() a: AutomationActor) { return this.posts.create(b ?? {}, actorOf(a)); }
  @Patch('posts/:id') @Scope('posts')
  update(@Param('id') id: string, @Body() b: PostInput, @AutomationActorParam() a: AutomationActor) { return this.posts.update(id, b ?? {}, actorOf(a)); }
  @Post('posts/:id/comment-draft') @HttpCode(200) @Scope('comments')
  commentDraft(@Param('id') id: string, @Body() b: CommentDraftInput, @AutomationActorParam() a: AutomationActor) { return this.posts.commentDraft(id, b?.text, actorOf(a)); }

  /* ───── media ───── */
  @Post('assets/presign') @HttpCode(200) @Scope('assets')
  presign(@Body() b: { fileName?: string; contentType?: string; fileSize?: number }) { return this.media.presign(b ?? {}); }
  @Post('assets') @Scope('assets')
  addAsset(@Body() b: AssetInput, @AutomationActorParam() a: AutomationActor) { return this.media.create(b ?? ({} as AssetInput), actorOf(a)); }
  @Post('assets/upload') @Scope('assets')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MEDIA_MAX_BYTES, files: 1 } }))
  upload(@UploadedFile() file: Express.Multer.File, @Body() b: Record<string, unknown>, @AutomationActorParam() a: AutomationActor) { return this.media.upload(file, b ?? {}, actorOf(a)); }

  /* ───── content pack ───── */
  @Post('import') @HttpCode(200) @Scope('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: PACK_MAX_BYTES, files: 1 } }))
  importPack(@UploadedFile() file: Express.Multer.File, @AutomationActorParam() a: AutomationActor) { return this.media.importPack(file, actorOf(a)); }
}

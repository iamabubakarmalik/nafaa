/**
 * Admin panel: Nafaa Social (`/api/admin/brand-social`). Area `social`:
 * reads need social.view; every change names its own key (social.edit,
 * social.approve, social.publish, social.connect, social.settings). Changes
 * are written to the admin audit log by the AdminAuditInterceptor.
 * Types: brand-social.types.ts.
 */
import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { GetUser } from '../../modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../../admin/common/super-admin.guard';
import { AdminArea, AdminPermission } from '../../admin/access/admin-access.decorators';
import { BrandSocialAccountsService } from './brand-social-accounts.service';
import { BrandSocialAiService } from './brand-social-ai.service';
import { BrandSocialInsightsService } from './brand-social-insights.service';
import { BrandSocialMediaService, MEDIA_MAX_BYTES, PACK_MAX_BYTES } from './brand-social-media.service';
import { BrandSocialPostsService, SocialActor } from './brand-social-posts.service';
import { BrandSocialPublisherService } from './brand-social-publisher.service';
import { BrandSocialSettingsService } from './brand-social-settings.service';
import { BrandSocialPlatformsService } from './brand-social-platforms.service';
import { platformFromSlug } from './brand-social-oauth.logic';
import type {
  AccountPatchInput, PlatformAppInput, AiCaptionInput, AiPlanInput, AssetInput, AssetPatchInput, AutomationKeyInput, BulkInput, ManualAccountInput,
  MarkPostedInput, MetaSelectInput, PostInput, PostListQuery, RejectInput, RetryInput, ScheduleInput,
} from './brand-social.types';

const actor = (u: AuthenticatedUser): SocialActor => ({ id: u.id });

@ApiTags('Admin - Nafaa Social')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('social')
@Controller('admin/brand-social')
export class BrandSocialController {
  constructor(
    private readonly accounts: BrandSocialAccountsService,
    private readonly posts: BrandSocialPostsService,
    private readonly publisher: BrandSocialPublisherService,
    private readonly insights: BrandSocialInsightsService,
    private readonly media: BrandSocialMediaService,
    private readonly ai: BrandSocialAiService,
    private readonly settings: BrandSocialSettingsService,
    private readonly platforms: BrandSocialPlatformsService,
  ) {}

  private app(slug: string) {
    const p = platformFromSlug(slug);
    if (!p) throw new NotFoundException('Unknown platform app.');
    return p;
  }

  /* ───── overview ───── */
  @Get('overview') overview() { return this.insights.overview(); }
  @Get('handoff') handoff() { return this.insights.handoff(); }

  /* ───── accounts ───── */
  @Get('accounts') accountsList() { return this.accounts.list(); }
  @Post('accounts/manual') @AdminPermission('social.connect')
  manual(@GetUser() u: AuthenticatedUser, @Body() b: ManualAccountInput) { return this.accounts.upsertManual(b ?? ({} as ManualAccountInput), u.id); }
  @Get('accounts/meta/connect-url') @AdminPermission('social.connect')
  connectUrl(@GetUser() u: AuthenticatedUser) { return this.accounts.connectUrl(u.id); }
  @Get('accounts/meta/callback') @AdminPermission('social.connect')
  callbackGet(@GetUser() u: AuthenticatedUser, @Query() q: Record<string, string>) { return this.accounts.callback(u.id, q ?? {}); }
  @Post('accounts/meta/callback') @HttpCode(200) @AdminPermission('social.connect')
  callbackPost(@GetUser() u: AuthenticatedUser, @Body() b: Record<string, string>) { return this.accounts.callback(u.id, b ?? {}); }
  @Post('accounts/meta/select') @HttpCode(200) @AdminPermission('social.connect')
  select(@GetUser() u: AuthenticatedUser, @Body() b: MetaSelectInput) { return this.accounts.select(u.id, b ?? ({} as MetaSelectInput)); }
  @Get('accounts/:platform/connect-url') @AdminPermission('social.connect')
  platformConnectUrl(@GetUser() u: AuthenticatedUser, @Param('platform') p: string) { return this.accounts.platformConnectUrl(p, u.id); }
  @Post('accounts/:platform/callback') @HttpCode(200) @AdminPermission('social.connect')
  platformCallback(@GetUser() u: AuthenticatedUser, @Param('platform') p: string, @Body() b: Record<string, string>) { return this.accounts.platformCallback(p, u.id, b ?? {}); }
  @Get('accounts/:id/options') @AdminPermission('social.connect')
  accountOptions(@Param('id') id: string) { return this.accounts.options(id); }
  @Patch('accounts/:id') @AdminPermission('social.connect')
  patchAccount(@Param('id') id: string, @Body() b: AccountPatchInput) { return this.accounts.patch(id, b ?? {}); }
  @Delete('accounts/:id') @AdminPermission('social.connect')
  disconnect(@Param('id') id: string) { return this.accounts.disconnect(id); }
  @Post('accounts/:id/refresh') @HttpCode(200) @AdminPermission('social.connect')
  refresh(@Param('id') id: string) { return this.accounts.refresh(id); }

  /* ───── posts ───── */
  @Get('posts') list(@Query() q: PostListQuery) { return this.posts.list(q ?? {}); }
  @Post('posts/bulk') @HttpCode(200) @AdminPermission('social.edit')
  bulk(@GetUser() u: AuthenticatedUser, @Req() req: { adminAccess?: { isSuperAdmin: boolean; permissions: string[] } }, @Body() b: BulkInput) {
    const access = req.adminAccess;
    return this.posts.bulk(b, actor(u), !!access && (access.isSuperAdmin || access.permissions.includes('social.approve')));
  }
  @Get('posts/:id') get(@Param('id') id: string) { return this.posts.one(id); }
  @Post('posts') @AdminPermission('social.edit')
  create(@GetUser() u: AuthenticatedUser, @Body() b: PostInput) { return this.posts.create(b ?? {}, actor(u)); }
  @Patch('posts/:id') @AdminPermission('social.edit')
  update(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: PostInput) { return this.posts.update(id, b ?? {}, actor(u)); }
  @Delete('posts/:id') @AdminPermission('social.edit')
  archive(@Param('id') id: string) { return this.posts.archive(id); }
  @Post('posts/:id/duplicate') @AdminPermission('social.edit')
  duplicate(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.posts.duplicate(id, actor(u)); }
  @Post('posts/:id/submit') @HttpCode(200) @AdminPermission('social.edit')
  submit(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.posts.submit(id, actor(u)); }
  @Post('posts/:id/approve') @HttpCode(200) @AdminPermission('social.approve')
  approve(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.posts.approve(id, actor(u)); }
  @Post('posts/:id/reject') @HttpCode(200) @AdminPermission('social.approve')
  reject(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: RejectInput) { return this.posts.reject(id, b?.reason, actor(u)); }
  @Post('posts/:id/publish-now') @HttpCode(200) @AdminPermission('social.publish')
  publishNow(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.publisher.publishNow(id, actor(u)); }
  @Post('posts/:id/retry') @HttpCode(200) @AdminPermission('social.publish')
  retry(@Param('id') id: string, @Body() b: RetryInput) { return this.publisher.retry(id, b?.platform); }
  @Post('posts/:id/mark-posted') @HttpCode(200) @AdminPermission('social.publish')
  markPosted(@GetUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: MarkPostedInput) { return this.publisher.markPosted(id, b ?? ({} as MarkPostedInput), actor(u)); }
  @Patch('posts/:id/schedule') @AdminPermission('social.edit')
  schedule(@Param('id') id: string, @Body() b: ScheduleInput) { return this.posts.schedule(id, b?.scheduledAt ?? null); }

  /* ───── analytics, ads ───── */
  @Get('analytics') analytics(@Query() q: { from?: string; to?: string }) { return this.insights.analytics(q ?? {}); }
  @Get('ads/overview') ads(@Query() q: { from?: string; to?: string }) { return this.insights.adsOverview(q ?? {}); }

  /* ───── media ───── */
  @Get('assets') assets(@Query() q: { search?: string; kind?: string; folder?: string }) { return this.media.list(q ?? {}); }
  @Post('assets/presign') @HttpCode(200) @AdminPermission('social.edit')
  presign(@Body() b: { fileName?: string; contentType?: string; fileSize?: number }) { return this.media.presign(b ?? {}); }
  @Post('assets/upload') @AdminPermission('social.edit')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MEDIA_MAX_BYTES, files: 1 } }))
  upload(@GetUser() u: AuthenticatedUser, @UploadedFile() file: Express.Multer.File, @Body() b: Record<string, unknown>) { return this.media.upload(file, b ?? {}, actor(u)); }
  @Post('assets') @AdminPermission('social.edit')
  addAsset(@GetUser() u: AuthenticatedUser, @Body() b: AssetInput) { return this.media.create(b ?? ({} as AssetInput), actor(u)); }
  @Patch('assets/:id') @AdminPermission('social.edit')
  patchAsset(@Param('id') id: string, @Body() b: AssetPatchInput) { return this.media.patch(id, b ?? {}); }
  @Delete('assets/:id') @AdminPermission('social.edit')
  removeAsset(@Param('id') id: string) { return this.media.remove(id); }

  /* ───── import ───── */
  @Post('import') @HttpCode(200) @AdminPermission('social.edit')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: PACK_MAX_BYTES, files: 1 } }))
  importPack(@GetUser() u: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) { return this.media.importPack(file, actor(u)); }

  /* ───── AI ───── */
  @Post('ai/caption') @HttpCode(200) @AdminPermission('social.edit')
  aiCaption(@Body() b: AiCaptionInput) { return this.ai.caption(b ?? ({} as AiCaptionInput)); }
  @Post('ai/plan') @HttpCode(200) @AdminPermission('social.edit')
  aiPlan(@GetUser() u: AuthenticatedUser, @Body() b: AiPlanInput) { return this.ai.plan(b ?? ({} as AiPlanInput), actor(u)); }

  /* ───── settings and automation keys ───── */
  @Get('settings') getSettings() { return this.settings.get(true); }
  @Put('settings') @AdminPermission('social.settings')
  saveSettings(@GetUser() u: AuthenticatedUser, @Body() b: unknown) { return this.settings.save(b ?? {}, u.id); }
  @Get('apps') @AdminPermission('social.settings')
  apps() { return this.platforms.listApps(); }
  @Put('apps/:platform') @AdminPermission('social.settings')
  saveApp(@GetUser() u: AuthenticatedUser, @Param('platform') p: string, @Body() b: PlatformAppInput) { return this.platforms.saveApp(this.app(p), b ?? {}, u.id); }
  @Delete('apps/:platform') @AdminPermission('social.settings')
  removeApp(@GetUser() u: AuthenticatedUser, @Param('platform') p: string) { return this.platforms.removeApp(this.app(p), u.id); }
  @Get('keys') @AdminPermission('social.settings')
  keys() { return this.settings.listKeys(); }
  @Post('keys') @AdminPermission('social.settings')
  createKey(@GetUser() u: AuthenticatedUser, @Body() b: AutomationKeyInput) { return this.settings.createKey(b ?? ({} as AutomationKeyInput), u.id); }
  @Delete('keys/:id') @AdminPermission('social.settings')
  revokeKey(@GetUser() u: AuthenticatedUser, @Param('id') id: string) { return this.settings.revokeKey(id, u.id); }
}

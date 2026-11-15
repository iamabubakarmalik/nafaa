/**
 * Admin endpoints of live support (/api/admin/support).
 *
 * Permissions (area "support"): reads need support.view; chatting, status,
 * assignment, tags, AI drafts and starting a chat need support.reply;
 * settings and saved replies need support.manage. One-off sends to a shop
 * (in-app, email, SMS) accept support.reply or communications.manage.
 * Every change is written to the admin audit log by AdminAuditInterceptor.
 * Deleting a message is soft (the team still sees it); only a super admin can
 * remove one for good (messages/:id/permanent), which also writes its own
 * audit entry. Call recordings come in over calls/:callId/recordings.
 */

import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SuperAdminGuard } from '../../admin/common/super-admin.guard';
import { AdminAnyPermission, AdminArea, AdminPermission } from '../../admin/access/admin-access.decorators';
import type { AdminAccess } from '../../admin/access/admin-access';
import { SupportService } from './support.service';
import { SupportAdminService, type AdminListQuery } from './support-admin.service';
import { SupportProactiveService } from './support-proactive.service';
import { isSupportLang } from './support.copy';
import { SUPPORT_LIMITS, SUPPORT_PROACTIVE_KEYS, type SupportProactiveKey } from './support.types';
import { SUPPORT_PERMS, adminCan } from './support.logic';
import { supportUpload } from './support.controller';
import type { SupportAdminUpdateBody, SupportSendBody } from './support.types';

type AdminRequest = { adminAccess?: AdminAccess };

/** Call and screen recordings are larger than chat files; long ones arrive in parts. */
const recordingUpload = FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: SUPPORT_LIMITS.maxRecordingBytes, files: 1 } });

@ApiTags('Admin - Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AdminArea('support')
@Controller('admin/support')
export class SupportAdminController {
  constructor(
    private readonly support: SupportService,
    private readonly admin: SupportAdminService,
    private readonly proactive: SupportProactiveService,
  ) {}

  private canManage(req: AdminRequest) {
    return adminCan(req.adminAccess, SUPPORT_PERMS.manage);
  }

  /* ───────────── inbox ───────────── */

  @Get('conversations')
  list(
    @GetUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('view') view?: string,
    @Query('priority') priority?: string,
    @Query('tag') tag?: string,
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('tenantIds') tenantIds?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const q: AdminListQuery = {
      status, priority, tag, search, tenantId, cursor,
      tenantIds: tenantIds ? tenantIds.split(',').map((x) => x.trim()).filter(Boolean) : undefined,
      view: view === 'mine' || view === 'unassigned' ? view : 'all',
      limit: limit ? Number(limit) : undefined,
    };
    return this.admin.list(user.id, q);
  }

  @Get('counts')
  counts(@GetUser() user: AuthenticatedUser) {
    return this.admin.counts(user.id);
  }

  @Get('tags')
  tags() {
    return this.admin.tags();
  }

  @Get('conversations/:id')
  get(@Param('id') id: string) {
    return this.admin.get(id);
  }

  @Get('conversations/:id/messages')
  messages(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('before') before?: string, @Query('limit') limit?: string) {
    return this.support.messages(this.admin.viewer(user.id), id, before, limit ? Number(limit) : undefined);
  }

  @Post('conversations/:id/messages')
  @AdminPermission(SUPPORT_PERMS.reply)
  send(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: SupportSendBody) {
    return this.support.send(this.admin.viewer(user.id), id, body ?? {});
  }

  @Patch('conversations/:id')
  @AdminPermission(SUPPORT_PERMS.reply)
  update(@Req() req: AdminRequest, @GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: SupportAdminUpdateBody) {
    return this.admin.update(user.id, id, body ?? {}, this.canManage(req));
  }

  /** Marking read is part of looking at a conversation, so support.view is enough. */
  @Post('conversations/:id/read')
  @AdminPermission(SUPPORT_PERMS.view)
  read(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.support.markRead(this.admin.viewer(user.id), id);
  }

  @Post('conversations/:id/suggest')
  @AdminPermission(SUPPORT_PERMS.reply)
  suggest(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.admin.suggest(user.id, id);
  }

  @Post('start')
  @AdminPermission(SUPPORT_PERMS.reply)
  start(@GetUser() user: AuthenticatedUser, @Body() body: { tenantId?: string; text?: string; subject?: string }) {
    return this.admin.start(user.id, body ?? {});
  }

  /** Same text to several shops (at most 50), each into its own conversation. */
  @Post('start/bulk')
  @AdminPermission(SUPPORT_PERMS.reply)
  bulkStart(@GetUser() user: AuthenticatedUser, @Body() body: { tenantIds?: unknown; text?: unknown; subject?: unknown }) {
    return this.admin.bulkStart(user.id, body ?? {});
  }

  @Patch('messages/:id')
  @AdminPermission(SUPPORT_PERMS.reply)
  edit(@Req() req: AdminRequest, @GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { text?: string }) {
    return this.support.editMessage(this.admin.viewer(user.id, this.canManage(req)), id, body?.text);
  }

  @Delete('messages/:id')
  @AdminPermission(SUPPORT_PERMS.reply)
  remove(@Req() req: AdminRequest, @GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.support.deleteMessage(this.admin.viewer(user.id, this.canManage(req)), id);
  }

  /** Super admin only: removes the content for good and keeps a tombstone (audit-logged). */
  @Delete('messages/:id/permanent')
  @AdminPermission(SUPPORT_PERMS.manage)
  purge(@Req() req: AdminRequest, @GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.support.purgeMessage({ id: user.id, email: user.email, isSuperAdmin: !!req.adminAccess?.isSuperAdmin }, id, body?.reason);
  }

  @Post('calls/:callId/recordings')
  @AdminPermission(SUPPORT_PERMS.reply)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(recordingUpload)
  recording(
    @GetUser() user: AuthenticatedUser,
    @Param('callId') callId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() extra: { conversationId?: string; kind?: string; durationSec?: string; startedAt?: string; part?: string },
  ) {
    return this.support.uploadRecording(user.id, callId, file, extra ?? {});
  }

  @Post('uploads')
  @AdminPermission(SUPPORT_PERMS.reply)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(supportUpload)
  upload(
    @GetUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() extra: { durationSec?: string; waveform?: string; width?: string; height?: string },
  ) {
    return this.support.upload(this.admin.viewer(user.id), file, extra ?? {});
  }

  /* ───────────── merchant context and one-off sends ───────────── */

  @Get('tenants/:tenantId/context')
  context(@Param('tenantId') tenantId: string) {
    return this.admin.context(tenantId);
  }

  @Post('tenants/:tenantId/notify')
  @AdminAnyPermission(SUPPORT_PERMS.reply, 'communications.manage')
  notify(@Param('tenantId') tenantId: string, @Body() body: { title?: string; message?: string; link?: string }) {
    return this.admin.notify(tenantId, body ?? {});
  }

  @Post('tenants/:tenantId/email')
  @AdminAnyPermission(SUPPORT_PERMS.reply, 'communications.manage')
  email(@Param('tenantId') tenantId: string, @Body() body: { subject?: string; body?: string; to?: string }) {
    return this.admin.sendEmail(tenantId, body ?? {});
  }

  @Post('tenants/:tenantId/sms')
  @AdminAnyPermission(SUPPORT_PERMS.reply, 'communications.manage')
  sms(@Param('tenantId') tenantId: string, @Body() body: { message?: string; to?: string }) {
    return this.admin.sendSms(tenantId, body ?? {});
  }

  /* ───────────── team ───────────── */

  @Get('agents')
  agents() {
    return this.admin.agents();
  }

  /** STUN/TURN servers for calls (env SUPPORT_ICE_SERVERS). */
  @Get('ice')
  ice() {
    return this.admin.iceServers();
  }

  /** Own online / away state (the admin app also sends it over the socket). */
  @Put('presence')
  @AdminPermission(SUPPORT_PERMS.view)
  presence(@GetUser() user: AuthenticatedUser, @Body() body: { state?: string }) {
    return this.admin.setPresence(user.id, body?.state);
  }

  /* ───────────── settings, saved replies, reports ───────────── */

  @Get('settings')
  settings() {
    return this.admin.settings();
  }

  @Put('settings')
  @AdminPermission(SUPPORT_PERMS.manage)
  saveSettings(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.admin.saveSettings(user.id, body);
  }

  @Get('canned')
  canned(@Query('search') search?: string) {
    return this.admin.listCanned(search);
  }

  @Post('canned')
  @AdminPermission(SUPPORT_PERMS.manage)
  createCanned(@GetUser() user: AuthenticatedUser, @Body() body: Record<string, unknown>) {
    return this.admin.createCanned(user.id, body);
  }

  @Patch('canned/:id')
  @AdminPermission(SUPPORT_PERMS.manage)
  updateCanned(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.admin.updateCanned(id, body);
  }

  @Delete('canned/:id')
  @AdminPermission(SUPPORT_PERMS.manage)
  deleteCanned(@Param('id') id: string) {
    return this.admin.deleteCanned(id);
  }

  /* ───────────── proactive messages ───────────── */

  @Get('proactive/stats')
  proactiveStats() {
    return this.proactive.stats();
  }

  /** The message as a shop would get it (real numbers when tenantId is given, sample values otherwise). */
  @Post('proactive/preview')
  @AdminPermission(SUPPORT_PERMS.view)
  async proactivePreview(@Body() body: { key?: string; lang?: string; tenantId?: string }) {
    const key = (SUPPORT_PROACTIVE_KEYS as readonly string[]).includes(body?.key ?? '') ? (body.key as SupportProactiveKey) : 'welcome';
    const lang = isSupportLang(body?.lang) ? body.lang : 'roman';
    const r = await this.proactive.compose(key, lang, body?.tenantId || undefined);
    return { text: r.text, chips: r.chips, agentName: r.agent.name };
  }

  /** Runs the check now instead of waiting for the next 10-minute run. Every rule still applies. */
  @Post('proactive/run')
  @AdminPermission(SUPPORT_PERMS.manage)
  proactiveRun() {
    return this.proactive.run();
  }

  @Get('reports')
  reports(@Query('from') from?: string, @Query('to') to?: string) {
    return this.admin.reports(from, to);
  }
}

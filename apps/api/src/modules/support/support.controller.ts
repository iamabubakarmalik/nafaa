/**
 * Merchant endpoints of live support (/api/support). Any signed-in shop user
 * may use them; everything is limited to their own tenant. Admin and partner
 * accounts are refused here (admins use /api/admin/support).
 */

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SupportService, type SupportViewer } from './support.service';
import { SupportProactiveService } from './support-proactive.service';
import { supportSideForRole } from './support.logic';
import { SUPPORT_LIMITS, type SupportStatusInfo, type SupportRateBody, type SupportSendBody, type SupportStartBody } from './support.types';

export const supportUpload = FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: SUPPORT_LIMITS.maxFileBytes, files: 1 } });

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(
    private readonly support: SupportService,
    private readonly proactive: SupportProactiveService,
  ) {}

  private viewer(user: AuthenticatedUser): SupportViewer {
    if (supportSideForRole(user.role, user.tenantId) !== 'MERCHANT') throw new ForbiddenException('Support chat is for shop accounts.');
    return { id: user.id, side: 'MERCHANT', tenantId: user.tenantId, impersonatedBy: user.impersonatedBy ?? null };
  }

  /** The chat widget asks for this on load; the first visit also triggers the welcome message. */
  @Get('status')
  async status(@GetUser() user: AuthenticatedUser): Promise<SupportStatusInfo> {
    const v = this.viewer(user);
    if (!v.impersonatedBy) void this.proactive.welcomeOnVisit(user.tenantId).catch(() => undefined);
    const [st, off] = await Promise.all([this.support.status(v), this.proactive.isOptedOut(user.tenantId)]);
    return { ...st, proactiveOff: off };
  }

  /** The shop turns proactive check-in messages off (or back on). */
  @Put('proactive')
  setProactive(@GetUser() user: AuthenticatedUser, @Body() body: { off?: boolean }) {
    this.viewer(user);
    return this.proactive.setOptOut(user.tenantId, body?.off === true);
  }

  @Get('unread')
  unread(@GetUser() user: AuthenticatedUser) {
    return this.support.unread(this.viewer(user));
  }

  @Get('conversations')
  list(@GetUser() user: AuthenticatedUser, @Query('cursor') cursor?: string) {
    return this.support.list(this.viewer(user), cursor);
  }

  @Get('conversations/current')
  current(@GetUser() user: AuthenticatedUser) {
    return this.support.current(this.viewer(user));
  }

  @Post('conversations')
  start(@GetUser() user: AuthenticatedUser, @Body() body: SupportStartBody) {
    return this.support.start(this.viewer(user), body ?? {}, user.shopId ?? null);
  }

  @Get('conversations/:id')
  get(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.support.get(this.viewer(user), id);
  }

  @Get('conversations/:id/messages')
  messages(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Query('before') before?: string, @Query('limit') limit?: string) {
    return this.support.messages(this.viewer(user), id, before, limit ? Number(limit) : undefined);
  }

  @Post('conversations/:id/messages')
  send(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: SupportSendBody) {
    return this.support.send(this.viewer(user), id, { ...(body ?? {}), internal: false });
  }

  @Post('conversations/:id/handover')
  async handover(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    const v = this.viewer(user);
    await this.support.handover(v, id);
    return this.support.get(v, id);
  }

  @Post('conversations/:id/read')
  read(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.support.markRead(this.viewer(user), id);
  }

  @Post('conversations/:id/rate')
  rate(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: SupportRateBody) {
    return this.support.rate(this.viewer(user), id, body?.rating, body?.note);
  }

  @Post('conversations/:id/resolve')
  async resolve(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    const v = this.viewer(user);
    await this.support.setStatus(v, id, 'RESOLVED');
    return this.support.get(v, id);
  }

  @Patch('messages/:id')
  edit(@GetUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: { text?: string }) {
    return this.support.editMessage(this.viewer(user), id, body?.text);
  }

  @Delete('messages/:id')
  remove(@GetUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.support.deleteMessage(this.viewer(user), id);
  }

  @Post('uploads')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(supportUpload)
  upload(
    @GetUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() extra: { durationSec?: string; waveform?: string; width?: string; height?: string },
  ) {
    return this.support.upload(this.viewer(user), file, extra ?? {});
  }
}

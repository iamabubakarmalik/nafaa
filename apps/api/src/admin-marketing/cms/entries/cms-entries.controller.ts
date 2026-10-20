/**
 * /admin/marketing/cms/entries/* (API-CONTRACT 8.1). Bodies and queries are
 * validated with the contract schemas (the global ValidationPipe skips plain
 * `unknown` params).
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import {
  adminEntriesQuerySchema,
  archiveEntryBodySchema,
  bulkEntriesBodySchema,
  createEntryBodySchema,
  duplicateEntryBodySchema,
  entryLookupQuerySchema,
  factCheckBodySchema,
  patchEntryBodySchema,
  previewLinkBodySchema,
  publishEntryBodySchema,
  scheduleEntryBodySchema,
  translateEntryBodySchema,
  unpublishEntryBodySchema,
  type AdminEntry,
  type AdminEntryListItem,
  type BulkEntriesResponse,
  type EntryLookupItem,
  type EntryResponse,
  type InboundLinksResponse,
  type LinkSuggestion,
  type Paginated,
  type PatchEntryResponse,
  type PreviewLinkResponse,
  type PublishEntryResponse,
  type ScheduleEntryResponse,
  type UnpublishEntryResponse,
  type ValidateEntryResponse,
} from '../contract/cms-contract';
import { CmsPreviewService } from '../preview/cms-preview.service';
import { EntryConflictException, parseOr400 } from '../publishing/cms-errors';
import { CmsPublishingService } from '../publishing/cms-publishing.service';
import { CmsEntriesService } from './cms-entries.service';

interface AuthedRequest {
  user?: { id?: string };
}
const userIdOf = (req: AuthedRequest): string | null => req.user?.id ?? null;

const P = MARKETING_PERMISSIONS;

@Controller('admin/marketing/cms/entries')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class CmsEntriesController {
  constructor(
    private readonly entries: CmsEntriesService,
    private readonly publishing: CmsPublishingService,
    private readonly preview: CmsPreviewService,
  ) {}

  /** Re-throws a bare 409 with the current entry attached (API-CONTRACT 1). */
  private async withConflict<T>(id: string, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      if (error instanceof EntryConflictException) {
        const body = error.getResponse() as { current?: unknown; message?: string };
        if (!body.current) throw new EntryConflictException(await this.entries.get(id), body.message);
      }
      throw error;
    }
  }

  @Get()
  @RequireMarketingPermissions(P.CMS_VIEW)
  list(@Query() query: unknown): Promise<Paginated<AdminEntryListItem>> {
    return this.entries.list(parseOr400(adminEntriesQuerySchema, query));
  }

  @Get('lookup')
  @RequireMarketingPermissions(P.CMS_VIEW)
  lookup(@Query() query: unknown): Promise<EntryLookupItem[]> {
    return this.entries.lookup(parseOr400(entryLookupQuerySchema, query));
  }

  @Post('bulk')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_PUBLISH)
  bulk(@Body() body: unknown, @Req() req: AuthedRequest): Promise<BulkEntriesResponse> {
    return this.publishing.bulk(parseOr400(bulkEntriesBodySchema, body), userIdOf(req));
  }

  @Get(':id')
  @RequireMarketingPermissions(P.CMS_VIEW)
  get(@Param('id') id: string): Promise<AdminEntry> {
    return this.entries.get(id);
  }

  @Post()
  @RequireMarketingPermissions(P.CMS_EDIT)
  create(@Body() body: unknown, @Req() req: AuthedRequest): Promise<AdminEntry> {
    return this.entries.create(parseOr400(createEntryBodySchema, body), userIdOf(req));
  }

  @Patch(':id')
  @RequireMarketingPermissions(P.CMS_EDIT)
  patch(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest): Promise<PatchEntryResponse> {
    return this.entries.patch(id, parseOr400(patchEntryBodySchema, body), userIdOf(req));
  }

  @Post(':id/validate')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_VIEW)
  async validate(@Param('id') id: string): Promise<ValidateEntryResponse> {
    const result = await this.publishing.validate(id);
    return { seo: result.report, canPublish: result.canPublish };
  }

  @Post(':id/publish')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_PUBLISH)
  publish(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest): Promise<PublishEntryResponse> {
    const parsed = parseOr400(publishEntryBodySchema, body);
    return this.withConflict(id, async () => {
      const out = await this.publishing.publish(id, parsed, userIdOf(req));
      return {
        entry: await this.entries.get(id),
        revisionId: out.revisionId,
        revalidation: out.revalidation,
        ...(out.redirectCreated ? { redirectCreated: out.redirectCreated } : {}),
      };
    });
  }

  @Post(':id/schedule')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_PUBLISH)
  schedule(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest): Promise<ScheduleEntryResponse> {
    const parsed = parseOr400(scheduleEntryBodySchema, body);
    return this.withConflict(id, async () => {
      const out = await this.publishing.schedule(id, parsed, userIdOf(req));
      return { entry: await this.entries.get(id), revisionId: out.revisionId };
    });
  }

  @Post(':id/cancel-schedule')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_PUBLISH)
  async cancelSchedule(@Param('id') id: string, @Req() req: AuthedRequest): Promise<EntryResponse> {
    await this.publishing.cancelSchedule(id, userIdOf(req));
    return { entry: await this.entries.get(id) };
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_PUBLISH)
  async unpublish(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest): Promise<UnpublishEntryResponse> {
    const out = await this.publishing.unpublish(id, parseOr400(unpublishEntryBodySchema, body), userIdOf(req));
    return { entry: await this.entries.get(id), revalidation: out.revalidation, ...(out.redirectCreated ? { redirectCreated: out.redirectCreated } : {}) };
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_PUBLISH)
  async archive(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest): Promise<EntryResponse> {
    await this.publishing.archive(id, parseOr400(archiveEntryBodySchema, body), userIdOf(req));
    return { entry: await this.entries.get(id) };
  }

  @Post(':id/restore-archive')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_EDIT)
  async restoreArchive(@Param('id') id: string, @Req() req: AuthedRequest): Promise<EntryResponse> {
    await this.publishing.restoreArchive(id, userIdOf(req));
    return { entry: await this.entries.get(id) };
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireMarketingPermissions(P.CMS_PUBLISH)
  async remove(@Param('id') id: string): Promise<void> {
    await this.entries.remove(id);
  }

  @Post(':id/duplicate')
  @RequireMarketingPermissions(P.CMS_EDIT)
  duplicate(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest): Promise<AdminEntry> {
    return this.entries.duplicate(id, parseOr400(duplicateEntryBodySchema, body), userIdOf(req));
  }

  @Post(':id/translations')
  @RequireMarketingPermissions(P.CMS_EDIT)
  translate(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest): Promise<AdminEntry> {
    return this.entries.translate(id, parseOr400(translateEntryBodySchema, body).locale, userIdOf(req));
  }

  @Post(':id/preview-link')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_VIEW)
  async previewLink(@Param('id') id: string, @Body() body: unknown): Promise<PreviewLinkResponse> {
    const parsed = parseOr400(previewLinkBodySchema, body);
    const row = await this.entries.loadRow(id);
    return this.preview.createLink({ id: row.id, locale: row.locale, path: row.path }, parsed.expiresInHours);
  }

  @Post(':id/fact-check')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_EDIT)
  async factCheck(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthedRequest): Promise<EntryResponse> {
    parseOr400(factCheckBodySchema, body);
    return { entry: await this.entries.factCheck(id, userIdOf(req)) };
  }

  @Get(':id/inbound')
  @RequireMarketingPermissions(P.CMS_VIEW)
  inbound(@Param('id') id: string): Promise<InboundLinksResponse> {
    return this.entries.inbound(id);
  }

  @Get(':id/suggestions')
  @RequireMarketingPermissions(P.CMS_VIEW)
  suggestions(@Param('id') id: string): Promise<LinkSuggestion[]> {
    return this.entries.suggestions(id);
  }
}

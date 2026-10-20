/** Revisions (API-CONTRACT 8.2). */
import { Controller, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { MARKETING_PERMISSIONS } from '../../_shared/constants/marketing-permissions.constants';
import { RequireMarketingPermissions } from '../../_shared/decorators/marketing-permissions.decorator';
import { MarketingAdminGuard } from '../../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../../_shared/guards/marketing-permissions.guard';
import { historyQuerySchema, type EntryResponse, type RevisionDetail, type RevisionDiff, type RevisionListItem } from '../contract/cms-contract';
import { CmsEntriesService } from '../entries/cms-entries.service';
import { EntryConflictException, parseOr400 } from '../publishing/cms-errors';
import { CmsRevisionsService } from './cms-revisions.service';

const P = MARKETING_PERMISSIONS;

@Controller('admin/marketing/cms')
@UseGuards(JwtAuthGuard, MarketingAdminGuard, MarketingPermissionsGuard)
export class CmsRevisionsController {
  constructor(
    private readonly revisions: CmsRevisionsService,
    private readonly entries: CmsEntriesService,
  ) {}

  @Get('entries/:id/revisions')
  @RequireMarketingPermissions(P.CMS_VIEW)
  list(@Param('id') id: string): Promise<RevisionListItem[]> {
    return this.revisions.list(id);
  }

  @Get('entries/:id/revisions/:revisionId/diff')
  @RequireMarketingPermissions(P.CMS_VIEW)
  diff(@Param('id') id: string, @Param('revisionId') revisionId: string): Promise<RevisionDiff> {
    return this.revisions.diff(id, revisionId);
  }

  @Post('entries/:id/revisions/:revisionId/restore')
  @HttpCode(200)
  @RequireMarketingPermissions(P.CMS_PUBLISH)
  async restore(@Param('id') id: string, @Param('revisionId') revisionId: string, @Req() req: { user?: { id?: string } }): Promise<EntryResponse> {
    try {
      await this.revisions.restore(id, revisionId, req.user?.id ?? null);
    } catch (error) {
      if (error instanceof EntryConflictException) throw new EntryConflictException(await this.entries.get(id));
      throw error;
    }
    return { entry: await this.entries.get(id) };
  }

  @Get('revisions/:revisionId')
  @RequireMarketingPermissions(P.CMS_VIEW)
  detail(@Param('revisionId') revisionId: string): Promise<RevisionDetail> {
    return this.revisions.detail(revisionId);
  }

  @Get('history')
  @RequireMarketingPermissions(P.CMS_VIEW)
  history(@Query() query: unknown): Promise<RevisionListItem[]> {
    const q = parseOr400(historyQuerySchema, query);
    return this.revisions.history(q.subject, q.key);
  }
}

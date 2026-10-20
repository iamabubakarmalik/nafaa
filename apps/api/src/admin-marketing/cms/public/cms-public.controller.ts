/**
 * `/public/site/*` (API-CONTRACT 2): no auth, no throttling (builds and ISR
 * bursts), published data only.
 *
 * Responses are sent as plain JSON in the contract's shapes, not wrapped in
 * the API's usual `{ success, data }` envelope, with `Cache-Control` and an
 * ETag (304 on a match). Errors keep the usual error body.
 */
import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseFilters } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../../modules/auth/decorators/public.decorator';
import {
  localeSchema,
  publicCustomersQuerySchema,
  publicEntriesQuerySchema,
  publicEntryQuerySchema,
  publicFaqsQuerySchema,
  publicLocaleQuerySchema,
  publicPathsQuerySchema,
  publicPreviewQuerySchema,
  publicSitemapQuerySchema,
  publicStatsQuerySchema,
  publicTestimonialsQuerySchema,
  redirectHitBodySchema,
  DEFAULT_LOCALE,
} from '../contract/cms-contract';
import { CmsExceptionFilter } from './cms-exception.filter';
import { parseOr400, sendPublicJson } from './cms-http';
import { CmsPublicService } from './cms-public.service';

const statsQuery = publicStatsQuerySchema.extend({ locale: localeSchema.default(DEFAULT_LOCALE) });

@Controller('public/site')
@Public()
@SkipThrottle()
@UseFilters(CmsExceptionFilter)
export class CmsPublicController {
  constructor(private readonly site: CmsPublicService) {}

  @Get('entry')
  async entry(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicEntryQuerySchema, query);
    sendPublicJson(req, res, await this.site.entry(q.path, q.locale));
  }

  @Get('entries')
  async entries(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicEntriesQuerySchema, query);
    sendPublicJson(req, res, await this.site.entries(q));
  }

  @Get('paths')
  async paths(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicPathsQuerySchema, query);
    sendPublicJson(req, res, await this.site.paths(q.type, q.locale));
  }

  @Get('layout')
  async layout(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicLocaleQuerySchema, query);
    sendPublicJson(req, res, await this.site.layout(q.locale));
  }

  @Get('entity')
  async entity(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicLocaleQuerySchema, query);
    sendPublicJson(req, res, await this.site.entity(q.locale));
  }

  @Get('plans')
  async plans(@Req() req: Request, @Res() res: Response): Promise<void> {
    sendPublicJson(req, res, await this.site.plans());
  }

  @Get('faqs')
  async faqs(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicFaqsQuerySchema, query);
    sendPublicJson(req, res, await this.site.faqs(q.locale, q.topic));
  }

  @Get('testimonials')
  async testimonials(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicTestimonialsQuerySchema, query);
    sendPublicJson(req, res, await this.site.testimonials(q));
  }

  @Get('customers')
  async customers(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicCustomersQuerySchema, query);
    sendPublicJson(req, res, await this.site.customers(q));
  }

  @Get('stats')
  async stats(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(statsQuery, query);
    sendPublicJson(req, res, await this.site.stats(q.metrics, q.locale));
  }

  @Get('redirects')
  async redirects(@Req() req: Request, @Res() res: Response): Promise<void> {
    sendPublicJson(req, res, await this.site.redirectRules());
  }

  /** Hit counter, called by the site after serving a redirect. Throttled like any public POST. */
  @Post('redirects/hit')
  @SkipThrottle({ default: false })
  @HttpCode(204)
  async redirectHit(@Body() body: unknown, @Res() res: Response): Promise<void> {
    const { id } = parseOr400(redirectHitBodySchema, body);
    await this.site.redirectHit(id);
    res.status(204).end();
  }

  @Get('sitemap')
  async sitemap(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicSitemapQuerySchema, query);
    sendPublicJson(req, res, await this.site.sitemap(q.section, q.locale));
  }

  @Get('llms')
  async llms(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicLocaleQuerySchema, query);
    sendPublicJson(req, res, await this.site.llms(q.locale));
  }

  @Get('search-index')
  async searchIndex(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicLocaleQuerySchema, query);
    sendPublicJson(req, res, await this.site.searchIndex(q.locale));
  }

  /** Without `path`: token check. With `path`: the page (draft for the token's entry). Never cached. */
  @Get('preview')
  async preview(@Query() query: unknown, @Req() req: Request, @Res() res: Response): Promise<void> {
    const q = parseOr400(publicPreviewQuerySchema, query);
    const body = q.path ? await this.site.previewPage(q.token, q.path) : await this.site.previewInfo(q.token);
    sendPublicJson(req, res, body, 'no-store');
  }
}

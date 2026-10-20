/**
 * IndexNow pings (API-CONTRACT 6): URLs of indexable entries that were
 * published or unpublished are queued and sent once a minute.
 *
 * Off unless the API runs with SITE_INDEXABLE=true and settings
 * `seo.indexNowKey` is set, so local and staging never ping.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { resolveSiteUrl } from '../paths/cms-paths';

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10_000;

@Injectable()
export class IndexNowService {
  private readonly logger = new Logger(IndexNowService.name);
  private readonly queue = new Set<string>();

  enabled(): boolean {
    return process.env.SITE_INDEXABLE === 'true';
  }

  enqueue(urls: readonly string[]): void {
    if (!this.enabled()) return;
    for (const url of urls) if (this.queue.size < MAX_URLS) this.queue.add(url);
  }

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async flush(): Promise<void> {
    if (this.queue.size === 0) return;
    const urls = [...this.queue];
    this.queue.clear();
    if (!this.enabled()) return;
    const [seo, site] = await Promise.all([
      this.prisma.cmsSetting.findUnique({ where: { key_locale: { key: 'seo', locale: 'en' } }, select: { value: true } }),
      this.prisma.cmsSetting.findUnique({ where: { key_locale: { key: 'site', locale: 'en' } }, select: { value: true } }),
    ]);
    const key = (seo?.value as { indexNowKey?: unknown } | null)?.indexNowKey;
    if (typeof key !== 'string' || key.length < 8) return;
    const baseUrl = resolveSiteUrl(process.env.SITE_PUBLIC_URL, (site?.value as { baseUrl?: string } | null)?.baseUrl);
    const host = new URL(baseUrl).host;
    const urlList = urls.filter((u) => {
      try {
        return new URL(u).host === host;
      } catch {
        return false;
      }
    });
    if (urlList.length === 0) return;
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key, keyLocation: `${baseUrl}/${key}.txt`, urlList }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok && res.status !== 202) this.logger.warn(`IndexNow HTTP ${res.status} for ${urlList.length} URLs`);
    } catch (error) {
      this.logger.warn(`IndexNow failed: ${String(error)}`);
    }
  }
}

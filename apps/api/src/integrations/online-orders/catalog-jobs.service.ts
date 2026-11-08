import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CatalogJob, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ACTIVE_STATUSES, addErrors, chunkDelayMs, chunkSize, JobKind, nextChunk, percent } from './catalog-jobs';
import { commerceControls } from './commerce-controls';

export interface ChunkResult {
  done: number;
  failed: number;
  errors?: string[];
}

export type JobHandler = (job: CatalogJob, chunk: unknown[]) => Promise<ChunkResult>;

/** A claimed job is left alone by other workers for this long (restart safety). */
const LEASE_MS = 3 * 60_000;
const TICK_MS = 1500;

/**
 * Background catalog jobs (import all, link all, push, publish). The work
 * list is stored on the job; a worker takes one chunk at a time, saves the
 * progress and gives the job back with a pause, so big catalogs finish
 * without one long request and several API processes never run the same chunk.
 */
@Injectable()
export class CatalogJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CatalogJobsService.name);
  private readonly handlers = new Map<JobKind, JobHandler>();
  private timer: NodeJS.Timeout | null = null;
  private busy = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_CATALOG_JOBS === '1') return;
    this.timer = setInterval(() => { this.tick().catch((e) => this.logger.warn(`Catalog job: ${e?.message}`)); }, TICK_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  register(kind: JobKind, handler: JobHandler) {
    this.handlers.set(kind, handler);
  }

  /** Starts a job, or returns the one of the same kind already running on that channel. */
  async start(input: { tenantId: string; userId?: string | null; kind: JobKind; integrationId?: string | null; items: unknown[]; params?: Record<string, unknown> }) {
    const running = await this.prisma.catalogJob.findFirst({
      where: { tenantId: input.tenantId, kind: input.kind, integrationId: input.integrationId ?? null, status: { in: ACTIVE_STATUSES } },
    });
    if (running) return { job: this.view(running), existing: true };
    const empty = !input.items.length;
    const job = await this.prisma.catalogJob.create({
      data: {
        tenantId: input.tenantId, kind: input.kind, integrationId: input.integrationId ?? null, createdById: input.userId ?? null,
        items: input.items as Prisma.InputJsonValue, params: (input.params ?? {}) as Prisma.InputJsonValue, total: input.items.length,
        status: empty ? 'DONE' : 'QUEUED', ...(empty && { finishedAt: new Date() }),
      },
    });
    return { job: this.view(job), existing: false };
  }

  async list(tenantId: string) {
    const [active, recent] = await Promise.all([
      this.prisma.catalogJob.findMany({ where: { tenantId, status: { in: ACTIVE_STATUSES } }, orderBy: { createdAt: 'asc' }, omit: { items: true } }),
      this.prisma.catalogJob.findMany({
        where: { tenantId, status: { notIn: ACTIVE_STATUSES }, finishedAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
        orderBy: { finishedAt: 'desc' }, take: 5, omit: { items: true },
      }),
    ]);
    return { jobs: [...active, ...recent].map((j) => this.view(j)) };
  }

  async get(tenantId: string, id: string) {
    const job = await this.prisma.catalogJob.findFirst({ where: { id, tenantId }, omit: { items: true } });
    if (!job) throw new NotFoundException('Kaam nahi mila');
    return this.view(job);
  }

  async cancel(tenantId: string, id: string) {
    const res = await this.prisma.catalogJob.updateMany({ where: { id, tenantId, status: { in: ACTIVE_STATUSES } }, data: { status: 'CANCELLED', finishedAt: new Date() } });
    if (!res.count) throw new NotFoundException('Ye kaam chal nahi raha');
    return this.get(tenantId, id);
  }

  view(j: Omit<CatalogJob, 'items'> & { items?: unknown }) {
    return {
      id: j.id, kind: j.kind, status: j.status, integrationId: j.integrationId,
      total: j.total, done: j.done, failed: j.failed, percent: percent(j.done, j.failed, j.total),
      errors: Array.isArray(j.errors) ? (j.errors as string[]) : [],
      params: j.params, createdAt: j.createdAt, startedAt: j.startedAt, finishedAt: j.finishedAt,
    };
  }

  /** One chunk of the job that has waited longest. */
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = new Date();
      const job = await this.prisma.catalogJob.findFirst({
        where: { status: { in: ACTIVE_STATUSES }, OR: [{ heartbeatAt: null }, { heartbeatAt: { lte: now } }] },
        orderBy: [{ heartbeatAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
      });
      if (!job) return;
      // Claim with the value read: another process that read the same row loses.
      const claimed = await this.prisma.catalogJob.updateMany({
        where: { id: job.id, status: { in: ACTIVE_STATUSES }, heartbeatAt: job.heartbeatAt },
        data: { status: 'RUNNING', heartbeatAt: new Date(now.getTime() + LEASE_MS), ...(job.startedAt ? {} : { startedAt: now }) },
      });
      if (!claimed.count) return;
      await this.runChunk(job);
    } finally {
      this.busy = false;
    }
  }

  private async runChunk(job: CatalogJob) {
    const kind = job.kind as JobKind;
    const handler = this.handlers.get(kind);
    const items = Array.isArray(job.items) ? (job.items as unknown[]) : [];
    const channelType = (job.params as any)?.channelType ?? null;
    if (!handler) {
      await this.finish(job.id, 'FAILED', ['Ye kaam is server par nahi chal sakta']);
      return;
    }
    // Admin limits (Online store > Controls) win over the built-in sizes and pauses.
    const limits = (await commerceControls(this.prisma)).catalogJobs;
    const { chunk, next, last } = nextChunk(items, job.cursor, limits.chunkSize[kind] ?? chunkSize(kind, channelType));
    let res: ChunkResult;
    try {
      res = chunk.length ? await handler(job, chunk) : { done: 0, failed: 0 };
    } catch (e: any) {
      // A whole chunk failing counts its items as failed; the job moves on.
      res = { done: 0, failed: chunk.length, errors: [String(e?.message ?? e).slice(0, 300)] };
    }
    const fresh = await this.prisma.catalogJob.findUnique({ where: { id: job.id }, select: { status: true, errors: true } });
    const cancelled = fresh?.status === 'CANCELLED';
    await this.prisma.catalogJob.update({
      where: { id: job.id },
      data: {
        cursor: next,
        done: { increment: res.done },
        failed: { increment: res.failed },
        errors: addErrors(fresh?.errors, res.errors ?? []),
        heartbeatAt: new Date(Date.now() + (limits.delayMs ?? chunkDelayMs(channelType))),
        ...(last && !cancelled ? { status: 'DONE', finishedAt: new Date() } : {}),
      },
    });
  }

  private async finish(id: string, status: 'DONE' | 'FAILED', errors: string[] = []) {
    const j = await this.prisma.catalogJob.findUnique({ where: { id }, select: { errors: true } });
    await this.prisma.catalogJob.update({ where: { id }, data: { status, finishedAt: new Date(), errors: addErrors(j?.errors, errors) } });
  }
}

/**
 * Platform switches the admin panel controls at runtime: maintenance mode,
 * new signups, Nafaa AI and paused background jobs.
 *
 * Values live in SystemSetting (category "system_controls") and are cached in
 * memory, refreshed every 15 seconds, so other API instances pick up a change
 * within that time. If the database cannot be read, the last known values
 * stay in force (defaults: everything on, maintenance off).
 */

import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorLogService } from './error-log.service';
import { JOB_DEFINITIONS, JOB_STATE, runJob, setJobRuntime } from './cron.decorator';

export interface MaintenanceState {
  on: boolean;
  /** Shown to shop users while maintenance is on. */
  message: string;
  /** Optional expected end, ISO string. Display only. */
  until?: string | null;
  startedAt?: string | null;
}

export interface SystemControls {
  maintenance: MaintenanceState;
  signupsOpen: boolean;
  aiEnabled: boolean;
  pausedJobs: string[];
}

export const DEFAULT_MAINTENANCE_MESSAGE = 'Nafaa par kuch der ke liye kaam ho raha hai. Thori der baad dobara koshish karein. Aap ki offline bikri mehfooz hai aur baad me khud sync ho jayegi.';

const KEYS = {
  maintenance: 'system.maintenance',
  signups: 'system.signups',
  ai: 'system.ai',
  pausedJobs: 'system.jobs.paused',
} as const;

const CATEGORY = 'system_controls';
const REFRESH_MS = 15_000;

const DEFAULTS: SystemControls = {
  maintenance: { on: false, message: DEFAULT_MAINTENANCE_MESSAGE, until: null, startedAt: null },
  signupsOpen: true,
  aiEnabled: true,
  pausedJobs: [],
};

const parseJson = <T>(raw: string | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

@Injectable()
export class SystemControlService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SystemControlService.name);
  private state: SystemControls = { ...DEFAULTS };
  private paused = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private instances = new Map<object, object>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly errors: ErrorLogService,
    private readonly discovery: DiscoveryService,
  ) {
    setJobRuntime({
      isPaused: (key) => this.paused.has(key),
      onFailure: (key, error) => this.errors.capture({ source: 'job', route: key, error }),
    });
  }

  async onApplicationBootstrap() {
    // Map each job's prototype to its live instance so "Run now" can call it.
    const owners = new Set([...JOB_DEFINITIONS.values()].map((d) => d.owner));
    for (const w of [...this.discovery.getProviders(), ...this.discovery.getControllers()]) {
      const inst = w.instance as object | undefined;
      if (inst && owners.has(Object.getPrototypeOf(inst))) this.instances.set(Object.getPrototypeOf(inst), inst);
    }
    await this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    setJobRuntime(null);
  }

  async refresh(): Promise<void> {
    try {
      const rows = await this.prisma.systemSetting.findMany({ where: { key: { in: Object.values(KEYS) } }, select: { key: true, value: true } });
      const v = new Map(rows.map((r) => [r.key, r.value]));
      this.state = {
        maintenance: { ...DEFAULTS.maintenance, ...parseJson<Partial<MaintenanceState>>(v.get(KEYS.maintenance), {}) },
        signupsOpen: v.get(KEYS.signups) !== 'off',
        aiEnabled: v.get(KEYS.ai) !== 'off',
        pausedJobs: parseJson<string[]>(v.get(KEYS.pausedJobs), []).filter((k) => typeof k === 'string'),
      };
      this.paused = new Set(this.state.pausedJobs);
    } catch (e) {
      this.logger.warn(`Could not read system controls, keeping last values: ${e instanceof Error ? e.message : e}`);
    }
  }

  get controls(): SystemControls { return this.state; }
  get maintenance(): MaintenanceState { return this.state.maintenance; }
  get signupsOpen(): boolean { return this.state.signupsOpen; }
  get aiEnabled(): boolean { return this.state.aiEnabled; }

  private async write(key: string, value: string, description: string, userId: string) {
    await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, category: CATEGORY, description, updatedById: userId },
      update: { value, updatedById: userId },
    });
    await this.refresh();
  }

  async setMaintenance(userId: string, input: { on: boolean; message?: string | null; until?: string | null }) {
    const prev = this.state.maintenance;
    const next: MaintenanceState = {
      on: input.on,
      message: input.message?.trim() || DEFAULT_MAINTENANCE_MESSAGE,
      until: input.until || null,
      startedAt: input.on ? (prev.on ? prev.startedAt ?? new Date().toISOString() : new Date().toISOString()) : null,
    };
    await this.write(KEYS.maintenance, JSON.stringify(next), 'Maintenance mode for the merchant app', userId);
    return this.state;
  }

  async setSignups(userId: string, open: boolean) {
    await this.write(KEYS.signups, open ? 'on' : 'off', 'New shop signups', userId);
    return this.state;
  }

  async setAi(userId: string, enabled: boolean) {
    await this.write(KEYS.ai, enabled ? 'on' : 'off', 'Nafaa AI assistant for shops', userId);
    return this.state;
  }

  async setJobPaused(userId: string, key: string, paused: boolean) {
    const next = new Set(this.state.pausedJobs);
    if (paused) next.add(key); else next.delete(key);
    await this.write(KEYS.pausedJobs, JSON.stringify([...next].filter((k) => JOB_DEFINITIONS.has(k)).sort()), 'Background jobs paused from the admin panel', userId);
    return this.state;
  }

  jobs() {
    return [...JOB_DEFINITIONS.values()]
      .map((d) => {
        const s = JOB_STATE.get(d.key);
        return {
          key: d.key,
          className: d.className,
          method: d.method,
          name: d.name ?? null,
          schedule: d.schedule,
          timeZone: d.timeZone ?? null,
          paused: this.paused.has(d.key),
          canRunNow: this.instances.has(d.owner),
          running: s?.running ?? false,
          runs: s?.runs ?? 0,
          failures: s?.failures ?? 0,
          skipped: s?.skipped ?? 0,
          lastStartedAt: s?.lastStartedAt ?? null,
          lastFinishedAt: s?.lastFinishedAt ?? null,
          lastDurationMs: s?.lastDurationMs ?? null,
          lastOk: s?.lastOk ?? null,
          lastError: s?.lastError ?? null,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  /**
   * Starts a job once, even when paused. Returns at once; the run continues in
   * the background and its result shows on the jobs page.
   */
  runNow(key: string): { started: boolean; reason?: string } {
    const def = JOB_DEFINITIONS.get(key);
    const inst = def && this.instances.get(def.owner);
    if (!def || !inst) return { started: false, reason: 'Job not found on this server' };
    if (JOB_STATE.get(key)?.running) return { started: false, reason: 'This job is already running' };
    // The undecorated method, so a paused job still runs once and the run is counted once.
    void runJob(key, () => def.original.call(inst), true).catch(() => undefined);
    return { started: true };
  }
}

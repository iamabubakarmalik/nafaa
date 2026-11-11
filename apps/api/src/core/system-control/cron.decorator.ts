/**
 * Drop-in replacement for `@Cron` from @nestjs/schedule.
 *
 * It registers the job with Nest exactly as before, and wraps the method so the
 * admin panel can see and control every background job:
 * - a paused job skips its run (the schedule stays registered);
 * - each run records its time, duration and outcome;
 * - a failure is written to the server error log.
 *
 * The job key is `ClassName.methodName`, which stays the same across deploys,
 * so a paused job stays paused after a restart.
 */

import { Cron as NestCron, type CronOptions } from '@nestjs/schedule';

export { CronExpression } from '@nestjs/schedule';

export interface JobDefinition {
  key: string;
  className: string;
  method: string;
  schedule: string;
  timeZone?: string;
  /** Registered name, when the job had one. */
  name?: string;
  /** Prototype the method lives on; used to find the instance for "Run now". */
  owner: object;
  /** The undecorated method, for manual runs. */
  original: (...args: unknown[]) => unknown;
}

export interface JobState {
  running: boolean;
  runs: number;
  failures: number;
  skipped: number;
  lastStartedAt?: Date;
  lastFinishedAt?: Date;
  lastDurationMs?: number;
  lastOk?: boolean;
  lastError?: string;
}

/** Hooks the jobs service installs at startup. Before that, jobs run normally. */
export interface JobRuntime {
  isPaused(key: string): boolean;
  onFailure(key: string, error: unknown): void;
}

export const JOB_DEFINITIONS = new Map<string, JobDefinition>();
export const JOB_STATE = new Map<string, JobState>();
let runtime: JobRuntime | null = null;

export const setJobRuntime = (r: JobRuntime | null) => { runtime = r; };

const stateOf = (key: string): JobState => {
  let s = JOB_STATE.get(key);
  if (!s) { s = { running: false, runs: 0, failures: 0, skipped: 0 }; JOB_STATE.set(key, s); }
  return s;
};

/**
 * Runs one job and records the outcome. Errors are rethrown so Nest logs them
 * as before. `manual` runs ignore the paused switch.
 */
export async function runJob(key: string, fn: () => unknown, manual = false): Promise<void> {
  const s = stateOf(key);
  if (!manual && runtime?.isPaused(key)) { s.skipped++; return; }
  const started = Date.now();
  s.running = true;
  s.lastStartedAt = new Date(started);
  try {
    await fn();
    s.lastOk = true;
    s.lastError = undefined;
  } catch (e) {
    s.failures++;
    s.lastOk = false;
    s.lastError = e instanceof Error ? e.message : String(e);
    runtime?.onFailure(key, e);
    throw e;
  } finally {
    s.runs++;
    s.running = false;
    s.lastFinishedAt = new Date();
    s.lastDurationMs = Date.now() - started;
  }
}

export function Cron(cronTime: string | Date, options: CronOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    const className = (target as { constructor: { name: string } }).constructor.name;
    const key = `${className}.${String(propertyKey)}`;
    JOB_DEFINITIONS.set(key, {
      key,
      className,
      method: String(propertyKey),
      schedule: cronTime instanceof Date ? cronTime.toISOString() : cronTime,
      timeZone: options.timeZone,
      name: options.name,
      owner: target,
      original,
    });
    descriptor.value = function (this: unknown, ...args: unknown[]) {
      return runJob(key, () => original.apply(this, args));
    };
    // Keep the method name for stack traces and Nest's logs.
    Object.defineProperty(descriptor.value, 'name', { value: original.name });
    return NestCron(cronTime, options)(target, propertyKey, descriptor);
  };
}

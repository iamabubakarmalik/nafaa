/**
 * One offline engine per signed-in business and user: the local database,
 * the download (mirror), the outbox and the typed operations, plus a small
 * status the UI subscribes to.
 *
 * syncNow(): send waiting changes, download what changed, send again (work
 * queued meanwhile). Only one sync runs at a time.
 */

import { pullAll, getManifest, KV, type Manifest, type PullOptions, type PullResult } from './mirror';
import { kvGet } from './kv';
import { MIRROR_TABLES, migrate } from './schema';
import * as L from './lookups';
import * as O from './ops';
import { counts, discardOp, flush, getOp, listOps, pruneOutbox, retryOp, type Ctx, type FlushResult } from './queue';
import { checkSale, OfflineRuleError, requiresOnline, type SaleInput } from './rules';
import type { ChangeKind, EngineConfig, OpKind, OpStatus, OutboxItem, SyncNote, SyncProgress, SyncState } from './types';

export interface EngineStatus {
  state: SyncState;
  online: boolean;
  syncing: boolean;
  /** Changes waiting to reach the server (issues not counted). */
  pending: number;
  /** Changes the server would not take; they wait for the user. */
  issues: number;
  lastSyncedAt: number | null;
  lastPullAt: number | null;
  /** First full download has finished (lookups are complete). */
  ready: boolean;
  progress: SyncProgress | null;
  /** Sync stopped: signed out on the server or plan ended. */
  halted: 'session' | 'plan' | null;
  /** Last download failed with server trouble (shown quietly). */
  lastError: string | null;
}

type Listener = (s: EngineStatus) => void;
type ChangeListener = (what: ChangeKind) => void;

export class OfflineEngine {
  readonly ctx: Ctx;
  private statusValue: EngineStatus = {
    state: 'online', online: true, syncing: false, pending: 0, issues: 0, lastSyncedAt: null, lastPullAt: null,
    ready: false, progress: null, halted: null, lastError: null,
  };
  private listeners = new Set<Listener>();
  private changeListeners = new Set<ChangeListener>();
  private syncing: Promise<void> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private initDone: Promise<void> | null = null;

  constructor(private readonly config: EngineConfig) {
    this.ctx = {
      db: config.db,
      http: config.http,
      uuid: config.uuid,
      now: config.now ?? Date.now,
      t: config.t ?? ((s, p) => (p ? s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => String(p[k] ?? '')) : s)),
      session: config.session,
      emit: (what) => this.emitChange(what),
      log: config.log ?? (() => undefined),
    };
  }

  /* ───────────── lifecycle ───────────── */

  init(): Promise<void> {
    if (!this.initDone) {
      this.initDone = (async () => {
        await migrate(this.ctx.db);
        const [lastPullAt, lastFullAt] = await Promise.all([kvGet<number>(this.ctx.db, KV.lastPullAt), kvGet<number>(this.ctx.db, KV.lastFullAt)]);
        this.patch({ lastPullAt, lastSyncedAt: lastPullAt, ready: !!lastFullAt });
        await this.refreshCounts();
      })();
    }
    return this.initDone;
  }

  get status(): EngineStatus {
    return this.statusValue;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onChange(fn: ChangeListener): () => void {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }

  private emitChange(what: ChangeKind) {
    if (what === 'outbox' || what === 'issues') void this.refreshCounts();
    this.config.onChange?.(what);
    this.changeListeners.forEach((fn) => fn(what));
  }

  private patch(p: Partial<EngineStatus>) {
    const next = { ...this.statusValue, ...p };
    next.state = !next.online ? 'offline' : next.syncing ? 'syncing' : next.issues > 0 ? 'issues' : next.online ? 'online' : 'offline';
    this.statusValue = next;
    this.listeners.forEach((fn) => fn(next));
  }

  async refreshCounts(): Promise<void> {
    const c = await counts(this.ctx);
    this.patch({ pending: c.pending, issues: c.issues });
  }

  /** The app tells the engine about the connection; coming online sends waiting changes. */
  setOnline(online: boolean) {
    const was = this.statusValue.online;
    this.patch({ online });
    if (online && !was) this.scheduleFlush(500);
  }

  /** Sends waiting changes soon (several enqueues in a row are sent together). */
  scheduleFlush(delayMs = 250) {
    if (!this.statusValue.online) return;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.upload();
    }, delayMs);
  }

  /** Sends waiting changes now. */
  async upload(): Promise<FlushResult | null> {
    if (!this.statusValue.online || !this.ctx.session()) return null;
    await this.init();
    this.patch({ syncing: true });
    try {
      const res = await flush(this.ctx);
      if (res.offline) this.patch({ online: false });
      if (res.done) this.patch({ lastSyncedAt: this.ctx.now() });
      this.patch({ halted: res.halted });
      return res;
    } finally {
      this.patch({ syncing: !!this.syncing });
      await this.refreshCounts();
    }
  }

  /**
   * Full sync: send, download (changes only, or everything with `full`), send
   * again. Safe to call often; a call during a running sync joins it.
   */
  syncNow(opts: Omit<PullOptions, 'onProgress'> = {}): Promise<void> {
    if (!this.syncing) {
      this.syncing = this.runSync(opts).finally(() => {
        this.syncing = null;
        this.patch({ syncing: false, progress: null });
      });
    }
    return this.syncing;
  }

  private async runSync(opts: Omit<PullOptions, 'onProgress'>): Promise<void> {
    await this.init();
    if (!this.statusValue.online || !this.ctx.session()) return;
    this.patch({ syncing: true, lastError: null });
    const first = await this.upload();
    if (first?.offline || first?.halted) return;
    try {
      const res = await this.pull(opts);
      this.patch({ lastPullAt: this.ctx.now(), lastSyncedAt: this.ctx.now(), ready: true });
      this.ctx.log(`[offline] pulled ${res.products} products, ${res.stock} stock, ${res.customers} customers, ${res.sales} sales${res.full ? ' (full)' : ''}`);
    } catch (e) {
      const status = (e as { status?: number })?.status ?? 0;
      if (status === 0) this.patch({ online: false });
      else this.patch({ lastError: (e as Error)?.message ?? 'sync' });
      this.ctx.log('[offline] pull failed', e);
      return;
    }
    await this.upload();
    await pruneOutbox(this.ctx);
  }

  private pull(opts: Omit<PullOptions, 'onProgress'>): Promise<PullResult> {
    return pullAll(this.ctx.db, this.ctx.http, {
      ...opts,
      now: this.ctx.now,
      onProgress: (p) => this.patch({ progress: p }),
    }).then((r) => {
      for (const k of ['products', 'stock', 'customers', 'sales', 'meta'] as const) this.emitChange(k);
      return r;
    });
  }

  /**
   * Clears the phone's copy of the server data (logout or reset). Changes not
   * sent yet are kept unless `dropUnsent` (the user confirmed losing them).
   */
  async wipe(opts: { dropUnsent?: boolean } = {}): Promise<void> {
    await this.init();
    await this.ctx.db.tx(async (db) => {
      for (const t of MIRROR_TABLES) await db.run(`DELETE FROM ${t}`);
      await db.run("DELETE FROM kv WHERE key NOT IN ('deviceCode') AND key NOT LIKE 'seq:%'");
      if (opts.dropUnsent) {
        for (const t of ['outbox', 'effects', 'idmap', 'notes', 'held_bills']) await db.run(`DELETE FROM ${t}`);
      } else {
        await db.run("DELETE FROM outbox WHERE status IN ('done', 'cancelled')");
      }
    });
    this.patch({ ready: false, lastPullAt: null, lastSyncedAt: null });
    await this.refreshCounts();
  }

  /* ───────────── reads ───────────── */

  manifest(): Promise<Manifest | null> {
    return getManifest(this.ctx.db);
  }

  readonly products = {
    search: (q: L.ProductSearch = {}) => L.searchProducts(this.ctx.db, q),
    byCode: (code: string, shopId?: string | null) => L.findByCode(this.ctx.db, code, shopId),
    get: (id: string, shopId?: string | null) => L.getProduct(this.ctx.db, id, shopId),
    stock: (shopId: string, productId: string, variantId?: string | null) => L.stockOf(this.ctx.db, shopId, productId, variantId),
    count: () => L.countProducts(this.ctx.db),
    countByCategory: () => L.countProductsByCategory(this.ctx.db),
    tierPrice: L.tierPrice,
  };

  readonly customers = {
    search: (q: L.CustomerSearch = {}) => L.searchCustomers(this.ctx.db, q),
    get: (id: string) => L.getCustomer(this.ctx.db, id),
  };

  readonly sales = {
    list: (q: L.SalesQuery = {}) => L.listSales(this.ctx.db, q),
    get: (id: string) => L.getSale(this.ctx.db, id),
    check: async (input: SaleInput, opts: { allowOversell?: boolean } = {}) => checkSale(this.ctx, await this.manifest(), input, opts),
    totals: (input: SaleInput) => O.saleTotals(this.ctx, input),
  };

  readonly lists = {
    get: <T = Record<string, unknown>>(type: L.LookupType) => L.lookups<T>(this.ctx.db, type),
  };

  /* ───────────── writes (typed operations) ───────────── */

  private after<T>(p: Promise<T>): Promise<T> {
    return p.then((v) => {
      this.scheduleFlush();
      return v;
    });
  }

  readonly enqueue = {
    sale: (input: SaleInput, opts: { allowOversell?: boolean } = {}) =>
      this.after(O.enqueueSale(this.ctx, input, { online: this.statusValue.online, ...opts })),
    void: (saleId: string, input: { reason?: string; managerPin?: string } = {}) =>
      this.after(O.enqueueVoid(this.ctx, saleId, { ...input, online: this.statusValue.online })),
    return: (input: Omit<O.ReturnInput, 'online'>) => this.after(O.enqueueReturn(this.ctx, { ...input, online: this.statusValue.online })),
    customerCreate: (input: O.CustomerInput) => this.after(O.enqueueCustomerCreate(this.ctx, input)),
    customerUpdate: (id: string, patch: Partial<O.CustomerInput>) => this.after(O.enqueueCustomerUpdate(this.ctx, id, patch)),
    khataPayment: (input: Parameters<typeof O.enqueueKhataPayment>[1]) => this.after(O.enqueueKhataPayment(this.ctx, input)),
    khataUdhaar: (input: Parameters<typeof O.enqueueKhataUdhaar>[1]) => this.after(O.enqueueKhataUdhaar(this.ctx, input)),
    expense: (input: O.ExpenseInput) => this.after(O.enqueueExpense(this.ctx, input)),
    income: (input: O.IncomeInput) => this.after(O.enqueueIncome(this.ctx, input)),
    stockAdjustment: (input: Parameters<typeof O.enqueueStockAdjustment>[1]) => this.after(O.enqueueStockAdjustment(this.ctx, input)),
    damage: (input: Parameters<typeof O.enqueueDamage>[1]) => this.after(O.enqueueDamage(this.ctx, input)),
    purchase: (input: O.PurchaseInput) => this.after(O.enqueuePurchase(this.ctx, input)),
    productCreate: (input: O.ProductInput) => this.after(O.enqueueProductCreate(this.ctx, input)),
    productUpdate: (id: string, patch: Partial<O.ProductInput>) => this.after(O.enqueueProductUpdate(this.ctx, id, patch)),
    priceChange: (id: string, prices: { price?: number; wholesalePrice?: number | null; creditPrice?: number | null; costPrice?: number }) =>
      this.after(O.enqueueProductUpdate(this.ctx, id, prices)),
    checkIn: (staffId: string, note?: string) => this.after(O.enqueueAttendance(this.ctx, { staffId, action: 'in', note })),
    checkOut: (staffId: string, note?: string) => this.after(O.enqueueAttendance(this.ctx, { staffId, action: 'out', note })),
    registerOpen: (input: Parameters<typeof O.enqueueRegisterOpen>[1]) => this.after(O.enqueueRegisterOpen(this.ctx, input)),
    registerClose: (input: Parameters<typeof O.enqueueRegisterClose>[1]) => this.after(O.enqueueRegisterClose(this.ctx, input)),
    cashMove: (input: Parameters<typeof O.enqueueCashMove>[1]) => this.after(O.enqueueCashMove(this.ctx, input)),
  };

  readonly register = {
    state: (shopId: string) => O.registerState(this.ctx, shopId),
  };

  readonly attendance = {
    today: (day?: string) => O.attendanceToday(this.ctx, day),
  };

  readonly held = {
    save: <T>(bill: { id?: string; label?: string; shopId?: string | null; data: T }) => O.heldBills.save(this.ctx, bill),
    list: <T>(shopId?: string | null) => O.heldBills.list<T>(this.ctx, shopId),
    remove: (id: string) => O.heldBills.remove(this.ctx, id),
  };

  /* ───────────── outbox and issues ───────────── */

  readonly outbox = {
    list: (filter: { status?: OpStatus[]; kind?: OpKind[]; limit?: number } = { status: ['pending', 'sending', 'issue'] }) => listOps(this.ctx, filter),
    get: (id: string) => getOp(this.ctx, id),
    /** Waits until a change is sent (done) or becomes an issue, up to `timeoutMs`. */
    waitFor: (id: string, timeoutMs = 10_000) => this.waitFor(id, timeoutMs),
  };

  readonly issues = {
    list: () => listOps(this.ctx, { status: ['issue'] }),
    retry: async (id: string, patch?: { body?: unknown }) => {
      await retryOp(this.ctx, id, patch);
      this.scheduleFlush(0);
    },
    retryAll: async () => {
      for (const op of await listOps(this.ctx, { status: ['issue'] })) await retryOp(this.ctx, op.id);
      this.scheduleFlush(0);
    },
    discard: (id: string) => discardOp(this.ctx, id),
    useExistingCustomer: async (opId: string, serverCustomerId: string) => {
      await O.useExistingCustomer(this.ctx, opId, serverCustomerId);
      this.scheduleFlush(0);
    },
  };

  readonly notes = {
    list: async (): Promise<SyncNote[]> =>
      (await this.ctx.db.all<{ id: number; opId: string; text: string; createdAt: number; seen: number }>('SELECT * FROM notes ORDER BY createdAt DESC LIMIT 50'))
        .map((n) => ({ ...n, seen: !!n.seen })),
    markSeen: async () => {
      await this.ctx.db.run('UPDATE notes SET seen = 1 WHERE seen = 0');
      this.emitChange('issues');
    },
  };

  private async waitFor(id: string, timeoutMs: number): Promise<OutboxItem | null> {
    const end = this.ctx.now() + timeoutMs;
    for (;;) {
      const op = await getOp(this.ctx, id);
      if (!op || op.status === 'done' || op.status === 'issue' || op.status === 'cancelled') return op;
      if (this.ctx.now() > end || !this.statusValue.online) return op;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  requiresOnline = requiresOnline;
}

export { OfflineRuleError };

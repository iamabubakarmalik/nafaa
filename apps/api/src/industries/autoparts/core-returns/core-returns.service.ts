/**
 * Old parts (cores) a customer hands back when buying the new one: a
 * battery, alternator, starter or brake shoes. The part's value is taken
 * off the bill as a trade-in payment, at the counter or at the vehicle
 * hand-over, and the part is held until it goes back to the supplier or is
 * scrapped. A counter bill's parts are linked to it when the record is next
 * read; a bill that is voided frees its parts for another bill.
 */

import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { Prisma, type CoreReturnStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import { ShopScope } from '../../../common/shop-scope';
import { CreateCoreReturnDto, ListCoreReturnsQuery } from './dto/core-return.dto';

type Db = PrismaService | Prisma.TransactionClient;

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const STATUSES: CoreReturnStatus[] = ['HELD', 'SENT_TO_SUPPLIER', 'SCRAPPED'];

/** Trade-in code of a core on a bill payment (SalePayment.reference). */
export const coreCode = (id: string) => `CORE-${id}`;

/** Records an old part; the caller decides the branch and the job. */
export async function recordCore(
  db: Db,
  user: AuthenticatedUser,
  input: { description: string; value: number; productId?: string | null; jobId?: string | null; saleId?: string | null; shopId?: string | null },
) {
  const description = input.description?.trim();
  const value = r2(input.value);
  if (!description) throw new BadRequestException('Purane part ka naam likhein (maslan: purani battery 12V)');
  if (!(value > 0)) throw new BadRequestException('Purane part ki qeemat likhein');
  const productId = input.productId
    ? (await db.product.findFirst({ where: { id: input.productId, tenantId: user.tenantId }, select: { id: true } }))?.id ?? null
    : null;
  return db.coreReturn.create({
    data: {
      tenantId: user.tenantId, shopId: input.shopId ?? null, description, value, productId,
      jobId: input.jobId ?? null, saleId: input.saleId ?? null, createdById: user.id,
    },
  });
}

@Injectable()
export class CoreReturnsService implements OnModuleInit {
  private readonly log = new Logger(CoreReturnsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  /** A voided bill no longer uses its parts; they stay held for another bill. */
  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.unlinkSale(tenantId, saleId));
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateCoreReturnDto) {
    const job = dto.jobId
      ? await this.prisma.workshopJob.findFirst({ where: { id: dto.jobId, tenantId: user.tenantId }, select: { id: true, shopId: true } })
      : null;
    if (dto.jobId && !job) throw new NotFoundException('Job nahi mili');
    return recordCore(this.prisma, user, { ...dto, jobId: job?.id, shopId: scope.shopId ?? job?.shopId ?? null });
  }

  /** Paged list for one status, with counts and value per status. */
  async page(user: AuthenticatedUser, scope: ShopScope, q: ListCoreReturnsQuery) {
    const limit = q.limit ?? 30;
    const page = q.page ?? 1;
    const s = q.search?.trim();
    const base: Prisma.CoreReturnWhereInput = {
      tenantId: user.tenantId,
      ...(scope.shopId && { OR: [{ shopId: scope.shopId }, { shopId: null }] }),
      ...(s && { description: { contains: s, mode: 'insensitive' } }),
    };
    await this.syncUsed(user.tenantId);
    const view = q.view ?? 'HELD';
    const where = view === 'all' ? base : { ...base, status: view };
    const [items, total, groups] = await Promise.all([
      this.prisma.coreReturn.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.coreReturn.count({ where }),
      this.prisma.coreReturn.groupBy({ by: ['status'], where: base, _count: { _all: true }, _sum: { value: true } }),
    ]);
    const [sales, jobs, products] = await Promise.all([
      this.lookup(items.map((c) => c.saleId), (ids) => this.prisma.sale.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, saleNumber: true, status: true, customer: { select: { name: true } } } })),
      this.lookup(items.map((c) => c.jobId), (ids) => this.prisma.workshopJob.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, jobNumber: true, registrationNumber: true, customerName: true } })),
      this.lookup(items.map((c) => c.productId), (ids) => this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids } }, select: { id: true, name: true } })),
    ]);
    const counts = Object.fromEntries(STATUSES.map((st) => {
      const g = groups.find((x) => x.status === st);
      return [st, { count: g?._count._all ?? 0, value: r2(g?._sum.value ?? 0) }];
    })) as Record<CoreReturnStatus, { count: number; value: number }>;
    return {
      items: items.map((c) => ({ ...c, code: coreCode(c.id), sale: c.saleId ? sales.get(c.saleId) ?? null : null, job: c.jobId ? jobs.get(c.jobId) ?? null : null, product: c.productId ? products.get(c.productId) ?? null : null })),
      total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1),
      counts: { ...counts, all: { count: STATUSES.reduce((n, st) => n + counts[st].count, 0), value: r2(STATUSES.reduce((n, st) => n + counts[st].value, 0)) } },
    };
  }

  /** Held parts not on a live bill: what the counter can take as a trade-in. */
  async tradeIns(user: AuthenticatedUser, scope: ShopScope) {
    await this.syncUsed(user.tenantId);
    const open = await this.prisma.coreReturn.findMany({
      where: { tenantId: user.tenantId, status: 'HELD', saleId: null, jobId: null, ...(scope.shopId && { OR: [{ shopId: scope.shopId }, { shopId: null }] }) },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    return open.map((c) => ({ code: coreCode(c.id), label: `Purana part: ${c.description}`, value: c.value }));
  }

  async setStatus(user: AuthenticatedUser, id: string, status: CoreReturnStatus) {
    const core = await this.prisma.coreReturn.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!core) throw new NotFoundException('Purana part nahi mila');
    return this.prisma.coreReturn.update({ where: { id }, data: { status } });
  }

  /** Links held parts that a live counter bill took as a trade-in to that bill. */
  private async syncUsed(tenantId: string) {
    const open = await this.prisma.coreReturn.findMany({ where: { tenantId, saleId: null }, select: { id: true }, take: 500 });
    if (!open.length) return;
    const used = await this.prisma.salePayment.findMany({
      where: { tenantId, method: 'TRADE_IN', reference: { in: open.map((c) => coreCode(c.id)) }, sale: { status: { not: 'VOIDED' } } },
      select: { reference: true, saleId: true },
    });
    for (const p of used) {
      await this.prisma.coreReturn.updateMany({ where: { tenantId, id: p.reference!.slice(5), saleId: null }, data: { saleId: p.saleId } });
    }
  }

  private async unlinkSale(tenantId: string, saleId: string) {
    try {
      await this.prisma.coreReturn.updateMany({ where: { tenantId, saleId }, data: { saleId: null } });
    } catch (e) {
      this.log.warn(`Old parts of voided bill ${saleId} not freed: ${(e as Error).message}`);
    }
  }

  private async lookup<T extends { id: string }>(ids: Array<string | null>, load: (ids: string[]) => Promise<T[]>) {
    const wanted = [...new Set(ids.filter((x): x is string => !!x))];
    return new Map((wanted.length ? await load(wanted) : []).map((r) => [r.id, r]));
  }
}

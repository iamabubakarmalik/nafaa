/**
 * Repairs on the customer's own piece (solder, resize, polish). The piece is
 * booked in with its weight and karat, a promised day and the agreed charge;
 * an advance goes on the customer's khata the day it is paid. A karigar can
 * be put on the job. Handing the piece back makes the bill through the
 * shared industry sale: the charge is the bill and the advance held on khata
 * is used up against it, so the counter takes only charge − advance. A
 * voided bill puts the repair back to ready (the advance stays on khata) and
 * the next hand-over bills it again as JRP-…-2.
 *
 * Repairs booked before this model live on JewelryExchange (purpose REPAIR /
 * REPAIR_DONE) and are still listed and delivered through the exchanges API.
 */
import { BadRequestException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { JewelryRepairStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { startOfDayTz } from '../../../common/helpers/business-time.helper';
import { SalesService } from '../../../modules/sales/sales/sales.service';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const r3 = (v: number) => Math.round((Number(v) || 0) * 1000) / 1000;

const OPEN: JewelryRepairStatus[] = ['RECEIVED', 'IN_PROGRESS', 'READY'];
const VIEWS = ['open', 'ready', 'late', 'done', 'cancelled', 'all'] as const;
type View = (typeof VIEWS)[number];
const KARATS = [24, 22, 21, 18, 14, 10, 9];

type Repair = Prisma.JewelryRepairGetPayload<object>;

@Injectable()
export class RepairsService implements OnModuleInit {
  private readonly log = new Logger(RepairsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sales: SalesService,
  ) {}

  onModuleInit() {
    this.sales.onVoid((tenantId, saleId) => this.reopenAfterVoid(tenantId, saleId));
  }

  /** The repair bill was voided: the piece is billed again at the next hand-over. */
  private async reopenAfterVoid(tenantId: string, saleId: string) {
    try {
      await this.prisma.jewelryRepair.updateMany({ where: { tenantId, saleId, status: 'DELIVERED' }, data: { status: 'READY', saleId: null } });
    } catch (e) {
      this.log.warn(`Voided bill ${saleId} not applied to its repair: ${(e as Error).message}`);
    }
  }

  /** Bill number for a repair; billed again after a void it gets -2, -3… */
  private async billNumber(tx: Prisma.TransactionClient, tenantId: string, repairNumber: string) {
    const voided = await tx.sale.count({
      where: { tenantId, status: 'VOIDED', OR: [{ saleNumber: repairNumber }, { saleNumber: { startsWith: `${repairNumber}-` } }] },
    });
    return voided ? `${repairNumber}-${voided + 1}` : repairNumber;
  }

  private money(v: unknown, what: string) {
    if (v === undefined || v === null || v === '') return 0;
    const n = Number(v);
    if (!(n >= 0)) throw new BadRequestException(`${what} sahi likhein`);
    return r2(n);
  }

  private karat(v: unknown) {
    if (v === undefined || v === null || v === '') return null;
    const k = Math.round(Number(v));
    if (!KARATS.includes(k)) throw new BadRequestException('Karat ghalat hai');
    return k;
  }

  private date(v: unknown) {
    if (!v) return null;
    const d = new Date(String(v));
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Wapas dene ki tareekh ghalat hai');
    return d;
  }

  private async karigar(tenantId: string, id: unknown) {
    if (!id) return null;
    const k = await this.prisma.jewelryKarigar.findFirst({ where: { id: String(id), tenantId }, select: { id: true, isActive: true } });
    if (!k) throw new BadRequestException('Karigar nahi mila');
    if (!k.isActive) throw new BadRequestException('Yeh karigar band hai');
    return k.id;
  }

  /** Next free JRP- number: old repairs on exchanges and their bills use the same prefix. */
  private async nextNumber(tx: Prisma.TransactionClient, tenantId: string) {
    const prefix = `JRP-${new Date().getFullYear()}-`;
    let n = (await tx.jewelryRepair.count({ where: { tenantId } })) + 1;
    for (;; n++) {
      const no = prefix + String(n).padStart(4, '0');
      const [a, b, c] = await Promise.all([
        tx.jewelryRepair.findFirst({ where: { tenantId, repairNumber: no }, select: { id: true } }),
        tx.jewelryExchange.findFirst({ where: { tenantId, exchangeNumber: no }, select: { id: true } }),
        tx.sale.findFirst({ where: { tenantId, saleNumber: no }, select: { id: true } }),
      ]);
      if (!a && !b && !c) return no;
    }
  }

  async create(user: AuthenticatedUser, dto: any) {
    const customerName = String(dto?.customerName ?? '').trim();
    const customerPhone = String(dto?.customerPhone ?? '').trim();
    const itemDescription = String(dto?.itemDescription ?? '').trim();
    if (!customerName) throw new BadRequestException('Customer ka naam likhein');
    if (!/^[\d+\-\s]{7,20}$/.test(customerPhone)) throw new BadRequestException('Customer ka sahi phone number likhein');
    if (!itemDescription) throw new BadRequestException('Zewar aur kaam ki tafseel likhein');
    const weightGrams = dto.weightGrams === undefined || dto.weightGrams === null || dto.weightGrams === '' ? null : r3(Number(dto.weightGrams));
    if (weightGrams !== null && !(weightGrams > 0)) throw new BadRequestException('Wazan sahi likhein');
    const charge = this.money(dto.charge, 'Repair charges');
    const advance = this.money(dto.advance, 'Advance');
    if (charge > 0 && advance > charge) throw new BadRequestException('Advance repair charges se zyada nahi ho sakta');
    const karat = this.karat(dto.karat);
    const promisedDate = this.date(dto.promisedDate);
    const karigarId = await this.karigar(user.tenantId, dto.karigarId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-repair-no:${user.tenantId}`}))::text`;
      const repairNumber = await this.nextNumber(tx, user.tenantId);
      const shopId = await resolveIndustryShopId(tx, user, null);
      let customerId: string | null = dto.customerId || null;
      // The advance is money in hand today: it waits on the customer's khata until the bill.
      if (advance > 0) {
        customerId = await ensureCustomer(tx, user, { customerId, name: customerName, phone: customerPhone, shopId });
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advance, reference: repairNumber, note: `Repair advance ${repairNumber}`, method: dto.paymentMethod,
        });
      }
      return tx.jewelryRepair.create({
        data: {
          tenantId: user.tenantId, shopId, repairNumber, customerId, customerName, customerPhone, itemDescription,
          weightGrams, karat, promisedDate, charge, advance, karigarId,
          status: karigarId ? 'IN_PROGRESS' : 'RECEIVED',
          notes: String(dto.notes ?? '').trim() || null,
          createdById: user.id,
        },
      });
    });
  }

  private viewWhere(view: View): Prisma.JewelryRepairWhereInput {
    switch (view) {
      case 'open': return { status: { in: OPEN } };
      case 'ready': return { status: 'READY' };
      case 'late': return { status: { in: OPEN }, promisedDate: { lt: startOfDayTz(new Date()) } };
      case 'done': return { status: 'DELIVERED' };
      case 'cancelled': return { status: 'CANCELLED' };
      default: return {};
    }
  }

  private async withNames(rows: Repair[]) {
    const ids = [...new Set(rows.map((r) => r.karigarId).filter(Boolean))] as string[];
    const ks = ids.length ? await this.prisma.jewelryKarigar.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } }) : [];
    const name = new Map(ks.map((k) => [k.id, k.fullName]));
    return rows.map((r) => ({ ...r, karigarName: r.karigarId ? name.get(r.karigarId) ?? null : null, due: r2(Math.max(r.charge - r.advance, 0)) }));
  }

  async page(user: AuthenticatedUser, q: { view?: string; search?: string; karigarId?: string; page?: number; limit?: number }) {
    const view: View = (VIEWS as readonly string[]).includes(q.view ?? '') ? (q.view as View) : 'open';
    const limit = Math.min(Math.max(Number(q.limit) || 30, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    const search = q.search?.trim();
    const base: Prisma.JewelryRepairWhereInput = {
      tenantId: user.tenantId,
      ...(q.karigarId && { karigarId: q.karigarId }),
      ...(search && {
        OR: [
          { repairNumber: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { customerPhone: { contains: search } },
          { itemDescription: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const where = { ...base, ...this.viewWhere(view) };
    const orderBy: Prisma.JewelryRepairOrderByWithRelationInput[] = view === 'done' || view === 'cancelled' || view === 'all'
      ? [{ updatedAt: 'desc' }]
      : [{ promisedDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }];
    const [total, items, sums, ...counts] = await Promise.all([
      this.prisma.jewelryRepair.count({ where }),
      this.prisma.jewelryRepair.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
      this.prisma.jewelryRepair.aggregate({ where, _sum: { charge: true, advance: true, weightGrams: true } }),
      ...VIEWS.map((v) => this.prisma.jewelryRepair.count({ where: { ...base, ...this.viewWhere(v) } })),
    ]);
    return {
      view, page, limit, total, pages: Math.max(Math.ceil(total / limit), 1),
      counts: Object.fromEntries(VIEWS.map((v, i) => [v, counts[i]])) as Record<View, number>,
      totals: { charge: r2(sums._sum.charge ?? 0), advance: r2(sums._sum.advance ?? 0), grams: r3(sums._sum.weightGrams ?? 0) },
      items: await this.withNames(items),
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const r = await this.prisma.jewelryRepair.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!r) throw new NotFoundException('Repair nahi mili');
    return r;
  }

  private open(r: Repair) {
    if (!OPEN.includes(r.status)) throw new BadRequestException('Wapas di gayi ya cancel repair badli nahi ja sakti');
  }

  /** Charge, promised day, karigar, weight and note while the piece is still in the shop. */
  async update(user: AuthenticatedUser, id: string, dto: any) {
    const r = await this.getOne(user, id);
    this.open(r);
    const charge = dto.charge !== undefined ? this.money(dto.charge, 'Repair charges') : undefined;
    if (charge !== undefined && charge > 0 && r.advance > charge) throw new BadRequestException(`Advance ${r.advance} hai — charges is se kam nahi ho sakte`);
    const karigarId = dto.karigarId !== undefined ? await this.karigar(user.tenantId, dto.karigarId) : undefined;
    const row = await this.prisma.jewelryRepair.update({
      where: { id },
      data: {
        charge,
        karigarId,
        ...(karigarId && r.status === 'RECEIVED' && { status: 'IN_PROGRESS' as const }),
        promisedDate: dto.promisedDate !== undefined ? this.date(dto.promisedDate) : undefined,
        weightGrams: dto.weightGrams !== undefined ? (dto.weightGrams ? r3(Number(dto.weightGrams)) : null) : undefined,
        karat: dto.karat !== undefined ? this.karat(dto.karat) : undefined,
        itemDescription: dto.itemDescription !== undefined ? String(dto.itemDescription).trim() || r.itemDescription : undefined,
        notes: dto.notes !== undefined ? String(dto.notes ?? '').trim() || null : undefined,
      },
    });
    return (await this.withNames([row]))[0];
  }

  /** Work steps. Delivery has its own route; a cancelled repair keeps its advance on khata as the customer's money. */
  async setStatus(user: AuthenticatedUser, id: string, status: string, reason?: string) {
    const r = await this.getOne(user, id);
    this.open(r);
    if (!['RECEIVED', 'IN_PROGRESS', 'READY', 'CANCELLED'].includes(status)) throw new BadRequestException('Repair ki halat ghalat hai');
    if (status === 'CANCELLED' && !String(reason ?? '').trim()) throw new BadRequestException('Cancel karne ki wajah likhein');
    const row = await this.prisma.jewelryRepair.update({
      where: { id },
      data: {
        status: status as JewelryRepairStatus,
        ...(status === 'CANCELLED' && { notes: [r.notes, `Cancel: ${String(reason).trim()}`].filter(Boolean).join(' · ') }),
      },
    });
    return (await this.withNames([row]))[0];
  }

  /** More advance before hand-over, held on khata. */
  async addPayment(user: AuthenticatedUser, id: string, amount: unknown, method?: string) {
    const r = await this.getOne(user, id);
    this.open(r);
    const amt = this.money(amount, 'Amount');
    if (!(amt > 0)) throw new BadRequestException('Amount sahi likhein');
    if (r.charge > 0 && r.advance + amt > r.charge + 0.005) throw new BadRequestException(`Baqi sirf Rs ${r2(r.charge - r.advance)} hai`);
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, r.shopId);
      const customerId = await ensureCustomer(tx, user, { customerId: r.customerId, name: r.customerName, phone: r.customerPhone, shopId });
      await recordKhataPayment(tx, user, { customerId, shopId, amount: amt, reference: r.repairNumber, note: `Repair advance ${r.repairNumber}`, method });
      return tx.jewelryRepair.update({ where: { id }, data: { advance: r2(r.advance + amt), customerId } });
    });
  }

  /**
   * Hands the piece back. The charge becomes a bill; the advance on khata is
   * used up by it; `paidAmount` is what the counter takes now (default the
   * rest) and anything still unpaid stays on khata as udhaar.
   */
  async deliver(user: AuthenticatedUser, id: string, dto: { charge?: number; paidAmount?: number; paymentMethod?: string }) {
    const r = await this.getOne(user, id);
    this.open(r);
    const charge = dto.charge !== undefined && dto.charge !== null ? this.money(dto.charge, 'Repair charges') : r.charge;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`jewelry-repair:${r.id}`}))::text`;
      const fresh = await tx.jewelryRepair.findFirst({ where: { id: r.id }, select: { status: true } });
      if (!fresh || !OPEN.includes(fresh.status)) throw new BadRequestException('Yeh repair pehle hi wapas ho chuki hai');
      let saleId: string | null = null;
      if (charge > 0) {
        const shopId = await resolveIndustryShopId(tx, user, r.shopId);
        const held = await paidOnKhata(tx, user.tenantId, r.repairNumber);
        const rest = r2(Math.max(charge - held, 0));
        const paid = r2(Math.min(Math.max(dto.paidAmount !== undefined && dto.paidAmount !== null ? Number(dto.paidAmount) || 0 : rest, 0), rest));
        const customerId = paid < charge
          ? await ensureCustomer(tx, user, { customerId: r.customerId, name: r.customerName, phone: r.customerPhone, shopId })
          : r.customerId;
        const detail = [r.karat ? `${r.karat}K` : '', r.weightGrams ? `${r.weightGrams}g` : ''].filter(Boolean).join(' ');
        const sale = await postIndustrySale(tx, user, {
          saleNumber: await this.billNumber(tx, user.tenantId, r.repairNumber), sourceRef: r.repairNumber, shopId, customerId,
          lines: [{ label: `Repair: ${r.itemDescription.slice(0, 60)}${detail ? ` (${detail})` : ''}`, amount: charge }],
          paidAmount: paid, paymentMethod: dto.paymentMethod,
        });
        saleId = sale.id;
        if (customerId && customerId !== r.customerId) await tx.jewelryRepair.update({ where: { id: r.id }, data: { customerId } });
      }
      return tx.jewelryRepair.update({ where: { id: r.id }, data: { status: 'DELIVERED', charge, saleId } });
    });
    return (await this.withNames([row]))[0];
  }
}

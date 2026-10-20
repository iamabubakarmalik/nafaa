/**
 * Farmers: the agri details (village, land, crops, CNIC) of a customer.
 *
 * The customer is the khata; the farmer row adds what a dealer needs to
 * give crop-season credit. Every read lays the live khata over the row
 * (owed, due after harvest, last purchase), so these figures match Khata,
 * the day book and the reports. The farmer's credit limit is the
 * customer's limit, which the counter checks before an udhaar bill.
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FarmerAccountStatus, Prisma, SeasonType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { recordKhataPayment } from '../../_shared/industry-sale.helper';
import { cropSeasonOf, resolveShopId } from '../agri-common';
import { loadFarmerKhata, seasonStatement, type FarmerKhata } from './farmer-khata';

type Db = Prisma.TransactionClient;
type FarmerRow = Prisma.AgriFarmerGetPayload<object>;

const SEASONS = new Set(Object.values(SeasonType) as string[]);
const STATUSES = new Set(Object.values(FarmerAccountStatus) as string[]);

const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v));
const list = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 30) : undefined);

export type FarmerTab = 'all' | 'owing' | 'due' | 'over' | 'suspended';

/** Fields a request may set on a farmer, checked and typed. */
function farmerFields(dto: Record<string, unknown>, partial: boolean): Prisma.AgriFarmerUncheckedUpdateInput {
  const out: Prisma.AgriFarmerUncheckedUpdateInput = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(dto, k);

  if (!partial || has('fullName')) {
    const name = str(dto.fullName, 100);
    if (!name) throw new BadRequestException('Farmer ka naam likhein');
    out.fullName = name;
  }
  if (!partial || has('phone')) {
    const phone = str(dto.phone, 20);
    if (!phone) throw new BadRequestException('Phone number likhein');
    if (phone.replace(/\D/g, '').length < 10) throw new BadRequestException('Phone number poora likhein (03XX-XXXXXXX)');
    out.phone = phone;
  }
  if (has('cnic')) {
    const cnic = str(dto.cnic, 20);
    if (cnic && cnic.replace(/\D/g, '').length !== 13) throw new BadRequestException('CNIC 13 hindsay ka hota hai');
    out.cnic = cnic;
  }
  for (const k of ['fatherName', 'altPhone', 'village', 'tehsil', 'district', 'province', 'landmark', 'landOwnership', 'soilType', 'waterSource', 'irrigationType', 'currentCrop', 'photoUrl', 'cnicFrontUrl', 'cnicBackUrl', 'landDocUrl'] as const) {
    if (has(k)) out[k] = str(dto[k]);
  }
  for (const k of ['address', 'notes'] as const) if (has(k)) out[k] = str(dto[k], 2000);
  for (const k of ['landAreaAcres', 'landAreaKanals'] as const) {
    if (!has(k)) continue;
    const v = num(dto[k]);
    if (v !== null && (!Number.isFinite(v) || v < 0)) throw new BadRequestException('Zameen manfi ya ghalat nahi ho sakti');
    out[k] = v;
  }
  if (has('creditLimit')) {
    const v = num(dto.creditLimit) ?? 0;
    if (!Number.isFinite(v) || v < 0) throw new BadRequestException('Udhaar ki had manfi nahi ho sakti');
    out.creditLimit = v;
  }
  if (has('creditDays')) {
    const v = num(dto.creditDays) ?? 0;
    if (!Number.isInteger(v) || v < 0 || v > 400) throw new BadRequestException('Udhaar ke din 0 se 400 tak');
    out.creditDays = v;
  }
  if (has('interestRate')) {
    const v = num(dto.interestRate) ?? 0;
    if (!Number.isFinite(v) || v < 0 || v > 100) throw new BadRequestException('Sood 0 se 100% tak');
    out.interestRate = v;
  }
  if (has('currentSeason')) out.currentSeason = SEASONS.has(String(dto.currentSeason)) ? (dto.currentSeason as SeasonType) : null;
  for (const k of ['farmingType', 'primaryCrops'] as const) {
    const v = list(dto[k]);
    if (v) out[k] = v;
  }
  return out;
}

@Injectable()
export class FarmersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The customer this farmer's khata lives on: one with the same phone if
   * it exists (so one person never has two khatas), else a new one.
   */
  private async linkOrCreateCustomer(
    tx: Db,
    tenantId: string,
    farmer: { fullName: string; phone?: string | null; cnic?: string | null; village?: string | null; district?: string | null; address?: string | null; creditLimit?: number | null },
    shopId?: string | null,
  ): Promise<string> {
    const phone = (farmer.phone || '').trim();
    if (phone) {
      const existing = await tx.customer.findFirst({ where: { tenantId, phone, isActive: true }, select: { id: true } });
      if (existing) return existing.id;
    }
    const created = await tx.customer.create({
      data: {
        tenantId,
        shopId: shopId || null,
        name: farmer.fullName,
        phone: phone || null,
        cnic: farmer.cnic || null,
        address: farmer.address || null,
        city: farmer.district || farmer.village || null,
        area: farmer.village || null,
        creditLimit: Number(farmer.creditLimit) || 0,
        notes: 'Agri farmer',
      },
      select: { id: true },
    });
    return created.id;
  }

  /** The counter checks the customer's limit; a stopped farmer keeps it at what is owed. */
  private async syncLimit(db: Db, tenantId: string, customerId: string | null, creditLimit: number) {
    if (!customerId) return;
    await db.customer.updateMany({ where: { id: customerId, tenantId }, data: { creditLimit } });
  }

  private live(f: FarmerRow, k: FarmerKhata | undefined) {
    const season = cropSeasonOf();
    if (!k) {
      return { ...f, khataLinked: false, currentBalance: 0, totalOutstanding: 0, dueNow: 0, notDue: 0, seasons: [], overLimit: false, lastPaymentAt: null, currentSeasonLabel: season.label };
    }
    const owed = Math.max(k.balance, 0);
    return {
      ...f,
      khataLinked: true,
      creditLimit: k.creditLimit || f.creditLimit,
      currentBalance: owed,
      totalOutstanding: owed,
      /** Negative balance: advance the farmer has with the shop. */
      advance: k.balance < 0 ? -k.balance : 0,
      dueNow: k.dueNow,
      notDue: k.notDue,
      seasons: k.seasons,
      overLimit: f.creditLimit > 0 && owed > f.creditLimit + 0.01,
      lastPurchaseAt: k.lastPurchaseAt ?? f.lastPurchaseAt,
      lastPaymentAt: k.lastPaymentAt,
      currentSeasonLabel: season.label,
    };
  }

  private async withKhata(tenantId: string, rows: FarmerRow[]) {
    const khata = await loadFarmerKhata(this.prisma, tenantId, rows.map((f) => f.customerId).filter((x): x is string => !!x));
    return rows.map((f) => this.live(f, f.customerId ? khata.get(f.customerId) : undefined));
  }

  private async nextNumber(tenantId: string) {
    const last = await this.prisma.agriFarmer.findFirst({
      where: { tenantId, farmerNumber: { startsWith: 'FRM-' } },
      orderBy: { farmerNumber: 'desc' },
      select: { farmerNumber: true },
    });
    const n = Number(last?.farmerNumber.slice(4)) || (await this.prisma.agriFarmer.count({ where: { tenantId } }));
    return 'FRM-' + String(n + 1).padStart(5, '0');
  }

  async create(user: AuthenticatedUser, dto: Record<string, unknown>) {
    const data = farmerFields(dto ?? {}, false);
    if (data.cnic) {
      const dup = await this.prisma.agriFarmer.findFirst({ where: { tenantId: user.tenantId, cnic: data.cnic as string, isActive: true }, select: { fullName: true } });
      if (dup) throw new BadRequestException(`Is CNIC ka farmer pehle se hai: ${dup.fullName}`);
    }
    const givenCustomerId = str(dto?.customerId, 60);
    if (givenCustomerId) {
      const own = await this.prisma.customer.findFirst({ where: { id: givenCustomerId, tenantId: user.tenantId }, select: { id: true } });
      if (!own) throw new BadRequestException('Customer nahi mila');
      const taken = await this.prisma.agriFarmer.findFirst({ where: { customerId: givenCustomerId, isActive: true }, select: { fullName: true } });
      if (taken) throw new BadRequestException(`Ye customer pehle se farmer hai: ${taken.fullName}`);
    }
    const farmerNumber = str(dto?.farmerNumber, 30) ?? await this.nextNumber(user.tenantId);
    const shopId = str(dto?.shopId, 60) ?? user.shopId ?? null;

    const created = await this.prisma.$transaction(async (tx) => {
      const customerId = givenCustomerId ?? await this.linkOrCreateCustomer(tx, user.tenantId, data as never, shopId);
      const taken = await tx.agriFarmer.findFirst({ where: { customerId }, select: { id: true, fullName: true, isActive: true } });
      // A farmer hidden earlier comes back with the new details and the same khata.
      if (taken && !taken.isActive) {
        await this.syncLimit(tx, user.tenantId, customerId, Number(data.creditLimit) || 0);
        return tx.agriFarmer.update({ where: { id: taken.id }, data: { ...data, isActive: true, status: 'ACTIVE', suspendedAt: null, suspensionReason: null } });
      }
      if (taken) throw new BadRequestException(`Is phone ka customer pehle se farmer hai: ${taken.fullName}`);
      await this.syncLimit(tx, user.tenantId, customerId, Number(data.creditLimit) || 0);
      return tx.agriFarmer.create({
        data: { ...(data as Prisma.AgriFarmerUncheckedCreateInput), tenantId: user.tenantId, farmerNumber, customerId },
      });
    });
    return (await this.withKhata(user.tenantId, [created]))[0];
  }

  /** Links a farmer made before khata linking to a customer (given, by phone, or new). */
  async linkCustomer(user: AuthenticatedUser, id: string, customerId?: string) {
    const farmer = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!farmer) throw new NotFoundException('Farmer nahi mila');
    if (farmer.customerId) return farmer;
    return this.prisma.$transaction(async (tx) => {
      if (customerId) {
        const own = await tx.customer.findFirst({ where: { id: customerId, tenantId: user.tenantId }, select: { id: true } });
        if (!own) throw new BadRequestException('Customer nahi mila');
      }
      const linkId = customerId ?? await this.linkOrCreateCustomer(tx, user.tenantId, farmer);
      const taken = await tx.agriFarmer.findFirst({ where: { customerId: linkId }, select: { fullName: true } });
      if (taken) throw new BadRequestException(`Ye customer pehle se farmer hai: ${taken.fullName}`);
      return tx.agriFarmer.update({ where: { id: farmer.id }, data: { customerId: linkId } });
    });
  }

  private where(user: AuthenticatedUser, params: { status?: string; district?: string; search?: string }): Prisma.AgriFarmerWhereInput {
    const q = params.search?.trim();
    return {
      tenantId: user.tenantId,
      isActive: true,
      ...(params.status && STATUSES.has(params.status) && { status: params.status as FarmerAccountStatus }),
      ...(params.district && { district: { contains: params.district, mode: 'insensitive' } }),
      ...(q && {
        OR: [
          { farmerNumber: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { cnic: { contains: q } },
          { village: { contains: q, mode: 'insensitive' } },
          { district: { contains: q, mode: 'insensitive' } },
          { primaryCrops: { has: q } },
        ],
      }),
    };
  }

  /** Every active farmer (newest first, up to 200) — the shape the dashboard and receipts read. */
  async list(user: AuthenticatedUser, params: { status?: string; district?: string; search?: string }) {
    const rows = await this.prisma.agriFarmer.findMany({ where: this.where(user, params), orderBy: { updatedAt: 'desc' }, take: 200 });
    return this.withKhata(user.tenantId, rows);
  }

  /**
   * Paged list for the Farmers page. Tabs need the live khata of every
   * farmer, so the khata is read for all matching rows and paged after.
   */
  async page(user: AuthenticatedUser, params: { search?: string; district?: string; tab?: FarmerTab; sort?: string; page?: number; limit?: number }) {
    const rows = await this.prisma.agriFarmer.findMany({ where: this.where(user, params), orderBy: { fullName: 'asc' } });
    const all = await this.withKhata(user.tenantId, rows);
    const test: Record<FarmerTab, (f: (typeof all)[number]) => boolean> = {
      all: (f) => f.status !== 'SUSPENDED' && f.status !== 'CLOSED',
      owing: (f) => f.currentBalance > 0.009,
      due: (f) => f.dueNow > 0.009,
      over: (f) => f.overLimit,
      suspended: (f) => f.status === 'SUSPENDED' || f.status === 'CLOSED',
    };
    const tab: FarmerTab = params.tab && params.tab in test ? params.tab : 'all';
    const counts = Object.fromEntries(Object.entries(test).map(([k, fn]) => [k, all.filter(fn).length])) as Record<FarmerTab, number>;
    const sorted = all.filter(test[tab]);
    if (params.sort === 'owed') sorted.sort((a, b) => b.currentBalance - a.currentBalance);
    else if (params.sort === 'due') sorted.sort((a, b) => b.dueNow - a.dueNow);
    else if (params.sort === 'new') sorted.sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime());
    else if (params.sort === 'land') sorted.sort((a, b) => (b.landAreaAcres ?? 0) - (a.landAreaAcres ?? 0));

    const limit = Math.min(Math.max(Number(params.limit) || 30, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    const sum = (pick: (f: (typeof all)[number]) => number) => Math.round(all.reduce((s, f) => s + (pick(f) || 0), 0) * 100) / 100;
    const crops = new Map<string, number>();
    const districts = new Map<string, number>();
    for (const f of all) {
      for (const c of f.primaryCrops) crops.set(c, (crops.get(c) ?? 0) + 1);
      if (f.district) districts.set(f.district, (districts.get(f.district) ?? 0) + 1);
    }
    const seasons = new Map<string, { key: string; label: string; owed: number; due: boolean }>();
    for (const f of all) for (const s of f.seasons) {
      const row = seasons.get(s.key) ?? { key: s.key, label: s.label, owed: 0, due: s.due };
      row.owed = Math.round((row.owed + s.owed) * 100) / 100;
      seasons.set(s.key, row);
    }
    const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    return {
      items: sorted.slice((page - 1) * limit, page * limit),
      total: sorted.length,
      page,
      limit,
      counts,
      stats: {
        farmers: all.length,
        owed: sum((f) => f.currentBalance),
        dueNow: sum((f) => f.dueNow),
        notDue: sum((f) => f.notDue),
        advance: sum((f) => ('advance' in f ? Number(f.advance) : 0)),
        creditLimit: sum((f) => f.creditLimit),
        acres: sum((f) => f.landAreaAcres ?? 0),
        season: cropSeasonOf().label,
      },
      analytics: { crops: top(crops), districts: top(districts), seasons: [...seasons.values()] },
    };
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer nahi mila');
    return (await this.withKhata(user.tenantId, [f]))[0];
  }

  /** Season-by-season khata of one farmer. */
  async khata(user: AuthenticatedUser, id: string) {
    const f = await this.getOne(user, id);
    if (!f.customerId) return { farmer: f, seasons: [], entries: [] };
    return { farmer: f, ...(await seasonStatement(this.prisma, user.tenantId, f.customerId)) };
  }

  async byCustomer(user: AuthenticatedUser, customerId: string) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { customerId, tenantId: user.tenantId } });
    return f ? (await this.withKhata(user.tenantId, [f]))[0] : null;
  }

  async update(user: AuthenticatedUser, id: string, dto: Record<string, unknown>) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer nahi mila');
    const data = farmerFields(dto ?? {}, true);
    if (data.cnic && data.cnic !== f.cnic) {
      const dup = await this.prisma.agriFarmer.findFirst({ where: { tenantId: user.tenantId, cnic: data.cnic as string, isActive: true, id: { not: id } }, select: { fullName: true } });
      if (dup) throw new BadRequestException(`Is CNIC ka farmer pehle se hai: ${dup.fullName}`);
    }
    const saved = await this.prisma.$transaction(async (tx) => {
      // A stopped farmer keeps the counter limit at what is owed until reactivated.
      if (data.creditLimit !== undefined && f.status !== 'SUSPENDED' && f.status !== 'CLOSED') {
        await this.syncLimit(tx, user.tenantId, f.customerId, Number(data.creditLimit));
      }
      return tx.agriFarmer.update({ where: { id }, data });
    });
    return (await this.withKhata(user.tenantId, [saved]))[0];
  }

  /** Stops new udhaar: the counter limit drops to what is owed now (at least Rs 1, since 0 means no limit). */
  async suspend(user: AuthenticatedUser, id: string, reason?: string) {
    const f = await this.getOne(user, id);
    await this.syncLimit(this.prisma, user.tenantId, f.customerId, Math.max(Math.ceil(f.currentBalance), 1));
    return this.prisma.agriFarmer.update({
      where: { id },
      data: { status: 'SUSPENDED', suspendedAt: new Date(), suspensionReason: str(reason, 300) ?? 'Wajah nahi likhi' },
    });
  }

  async reactivate(user: AuthenticatedUser, id: string) {
    const f = await this.prisma.agriFarmer.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!f) throw new NotFoundException('Farmer nahi mila');
    await this.syncLimit(this.prisma, user.tenantId, f.customerId, f.creditLimit);
    return this.prisma.agriFarmer.update({ where: { id }, data: { status: 'ACTIVE', suspendedAt: null, suspensionReason: null } });
  }

  /** Hides the farmer from lists; the customer, khata and bills stay. */
  async remove(user: AuthenticatedUser, id: string) {
    await this.getOne(user, id);
    return this.prisma.agriFarmer.update({ where: { id }, data: { isActive: false } });
  }

  /** Udhaar is only written by bills (POS or a delivered bulk order), so the khata and reports agree. */
  async recordPurchase() {
    throw new BadRequestException('Udhaar POS par bill bana kar likhein — farmer chunein aur "Udhaar" se payment karein');
  }

  /** Money received from a farmer, written on the customer khata (day book and drawer see it). */
  async recordPayment(user: AuthenticatedUser, id: string, amount: number, method?: string, note?: string) {
    const f = await this.getOne(user, id);
    if (!f.customerId) throw new BadRequestException('Pehle farmer ko customer khate se jorein');
    const value = Math.round((Number(amount) || 0) * 100) / 100;
    if (!(value > 0)) throw new BadRequestException('Amount sahi likhein');
    await this.prisma.$transaction(async (tx) => {
      const shopId = await resolveShopId(tx, user, null);
      await recordKhataPayment(tx, user, {
        customerId: f.customerId!, shopId, amount: value, method, reference: f.farmerNumber,
        note: str(note, 200) ?? `${f.fullName} se wasooli (${cropSeasonOf().label})`,
      });
    });
    return this.getOne(user, id);
  }

  async overdueList(user: AuthenticatedUser) {
    const rows = await this.prisma.agriFarmer.findMany({ where: { tenantId: user.tenantId, isActive: true } });
    const live = await this.withKhata(user.tenantId, rows);
    return live.filter((f) => f.totalOutstanding > 0).sort((a, b) => b.dueNow - a.dueNow || b.totalOutstanding - a.totalOutstanding).slice(0, 100);
  }

  async summary(user: AuthenticatedUser) {
    const [rows, byDistrict] = await Promise.all([
      this.prisma.agriFarmer.findMany({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.agriFarmer.groupBy({ by: ['district'], where: { tenantId: user.tenantId, isActive: true, district: { not: null } }, _count: { _all: true } }),
    ]);
    const live = await this.withKhata(user.tenantId, rows);
    const sum = (pick: (f: (typeof live)[number]) => number) => live.reduce((a, f) => a + (pick(f) || 0), 0);
    return {
      total: live.length,
      active: live.filter((f) => f.status === 'ACTIVE').length,
      suspended: live.filter((f) => f.status === 'SUSPENDED').length,
      byDistrict,
      totals: {
        totalOutstanding: sum((f) => f.totalOutstanding),
        currentBalance: sum((f) => f.currentBalance),
        totalPurchases: sum((f) => f.totalPurchases),
        creditLimit: sum((f) => f.creditLimit),
        dueNow: sum((f) => f.dueNow),
      },
      farmersWithCredit: live.filter((f) => f.currentBalance > 0).length,
    };
  }
}

/**
 * Karigars (artisans): who they are, their rates, the gold they hold and the
 * labour owed to them. Gold given and taken back goes through the metal
 * ledger, so metal stock and each karigar's balance always agree. Labour is
 * earned as pieces come back (or written by hand) and paid out as a shop
 * expense through the shared expenses service, so the drawer and P&L see it.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JewelryPurity } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { ExpensesService } from '../../../modules/finance/expenses/expenses.service';
import { toPaymentMethod } from '../../_shared/industry-sale.helper';
import { issueToKarigar, receiveFromKarigar } from '../common/karigar-metal';

const FIELDS = ['fullName', 'fatherName', 'cnic', 'phone', 'address', 'photoUrl', 'specializations', 'skillLevel', 'isActive', 'isInHouse', 'notes'] as const;
const pick = (dto: any) => Object.fromEntries(FIELDS.filter((k) => dto?.[k] !== undefined).map((k) => [k, dto[k] === '' ? null : dto[k]]));
const num = (v: unknown) => (v === undefined ? undefined : v === null || v === '' ? null : Number(v));
const PURITIES = Object.values(JewelryPurity) as string[];
const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Expense category for labour: the shop's own karigar or labour category, else this one. */
const LABOUR_CATEGORY = { name: 'Karigar mazdoori', icon: '🔨', color: '#d97706' };
/** Labour expenses carry the karigar number in the title, e.g. "Karigar mazdoori (KR-0001): Rafiq". */
const labourTag = (karigarNumber: string) => `(${karigarNumber})`;

@Injectable()
export class KarigarsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
  ) {}

  private validate(dto: any, creating: boolean) {
    if ((creating || dto.fullName !== undefined) && !String(dto.fullName ?? '').trim()) throw new BadRequestException('Karigar ka naam likhein');
    if ((creating || dto.phone !== undefined) && !/^[\d+\-\s]{7,20}$/.test(String(dto.phone ?? '').trim())) throw new BadRequestException('Sahi phone number likhein');
    for (const k of ['yearsExperience', 'hourlyRate', 'perGramRate', 'fixedRatePerPiece']) {
      if (dto[k] !== undefined && dto[k] !== null && dto[k] !== '' && !(Number(dto[k]) >= 0)) throw new BadRequestException('Rate aur tajurba sahi likhein');
    }
  }

  async create(user: AuthenticatedUser, dto: any) {
    this.validate(dto, true);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`karigar-no:${user.tenantId}`}))::text`;
      const count = await tx.jewelryKarigar.count({ where: { tenantId: user.tenantId } });
      return tx.jewelryKarigar.create({
        data: {
          tenantId: user.tenantId,
          ...pick(dto),
          fullName: String(dto.fullName).trim(),
          phone: String(dto.phone).trim(),
          karigarNumber: 'KR-' + String(count + 1).padStart(4, '0'),
          yearsExperience: dto.yearsExperience ? Math.round(Number(dto.yearsExperience)) : null,
          hourlyRate: num(dto.hourlyRate) ?? null,
          perGramRate: num(dto.perGramRate) ?? null,
          fixedRatePerPiece: num(dto.fixedRatePerPiece) ?? null,
        },
      });
    });
  }

  async list(user: AuthenticatedUser, params: { skillLevel?: string; isActive?: boolean; isInHouse?: boolean; search?: string }) {
    return this.prisma.jewelryKarigar.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.skillLevel && { skillLevel: params.skillLevel }),
        ...(params.isActive !== undefined && { isActive: params.isActive }),
        ...(params.isInHouse !== undefined && { isInHouse: params.isInHouse }),
        ...(params.search && {
          OR: [
            { karigarNumber: { contains: params.search, mode: 'insensitive' } },
            { fullName: { contains: params.search, mode: 'insensitive' } },
            { phone: { contains: params.search } },
            { cnic: { contains: params.search } },
          ],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const k = await this.prisma.jewelryKarigar.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!k) throw new NotFoundException('Karigar nahi mila');
    return k;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    await this.getOne(user, id);
    this.validate(dto, false);
    return this.prisma.jewelryKarigar.update({
      where: { id },
      data: {
        ...pick(dto),
        yearsExperience: dto.yearsExperience !== undefined ? (dto.yearsExperience ? Math.round(Number(dto.yearsExperience)) : null) : undefined,
        hourlyRate: num(dto.hourlyRate),
        perGramRate: num(dto.perGramRate),
        fixedRatePerPiece: num(dto.fixedRatePerPiece),
      },
    });
  }

  private purity(p: unknown): JewelryPurity {
    if (typeof p !== 'string' || !PURITIES.includes(p)) throw new BadRequestException('Karat chunein');
    return p as JewelryPurity;
  }

  async issueMetal(user: AuthenticatedUser, id: string, dto: { grams: number; purity?: string; reference?: string; notes?: string }) {
    const purity = this.purity(dto.purity ?? 'KARAT_22');
    return this.prisma.$transaction((tx) => issueToKarigar(tx, user.tenantId, user.id, {
      karigarId: id, grams: Number(dto.grams) || 0, purity, reference: dto.reference?.trim() || 'Karigar', notes: dto.notes,
    }));
  }

  async receiveMetal(user: AuthenticatedUser, id: string, dto: { receivedGrams?: number; wastageGrams?: number; returnedGrams?: number; purity?: string; reference?: string; notes?: string }) {
    const purity = this.purity(dto.purity ?? 'KARAT_22');
    return this.prisma.$transaction((tx) => receiveFromKarigar(tx, user.tenantId, user.id, {
      karigarId: id, pieceGrams: Number(dto.receivedGrams) || 0, wastageGrams: Number(dto.wastageGrams) || 0,
      returnedGrams: Number(dto.returnedGrams) || 0, purity, reference: dto.reference?.trim() || 'Karigar', notes: dto.notes,
    }));
  }

  /** Gold moved with a karigar, the orders and repairs given to them, and labour earned against paid. */
  async ledger(user: AuthenticatedUser, id: string) {
    const k = await this.syncPaid(user.tenantId, await this.getOne(user, id));
    const [metal, orders, repairs, payments] = await Promise.all([
      this.prisma.jewelryMetalStock.findMany({ where: { tenantId: user.tenantId, karigarId: id }, orderBy: { entryDate: 'desc' }, take: 200 }),
      this.prisma.jewelryCustomOrder.findMany({
        where: { tenantId: user.tenantId, assignedKarigarId: id }, orderBy: { orderDate: 'desc' }, take: 100,
        select: { id: true, orderNumber: true, customerName: true, status: true, purity: true, promisedDate: true, metalIssuedGrams: true, metalReceivedGrams: true, wastageGrams: true, designDescription: true },
      }),
      this.prisma.jewelryRepair.findMany({
        where: { tenantId: user.tenantId, karigarId: id }, orderBy: { createdAt: 'desc' }, take: 100,
        select: { id: true, repairNumber: true, customerName: true, itemDescription: true, status: true, promisedDate: true, charge: true },
      }),
      this.prisma.expense.findMany({
        where: { tenantId: user.tenantId, title: { contains: labourTag(k.karigarNumber) }, status: { not: 'CANCELLED' } },
        orderBy: { expenseDate: 'desc' }, take: 100,
        select: { id: true, expenseNumber: true, title: true, description: true, amount: true, paymentMethod: true, expenseDate: true },
      }),
    ]);
    const labour = { earned: r2(k.totalEarnings), paid: r2(k.paidLabour), due: r2(Math.max(k.totalEarnings - k.paidLabour, 0)) };
    return { karigar: k, metal, orders, repairs, labour, payments };
  }

  /**
   * Pays labour owed to a karigar. The money goes out as a PAID expense
   * (cash from the drawer unless another method is named) and adds to what
   * the karigar has been paid. A double click returns the same expense
   * (shared duplicate check), and what was paid is re-read from the labour
   * expenses, so it is never counted twice.
   */
  async payLabour(user: AuthenticatedUser, scope: ShopScope, id: string, dto: { amount?: number; paymentMethod?: string; note?: string }) {
    const k = await this.syncPaid(user.tenantId, await this.getOne(user, id));
    const amount = r2(Number(dto.amount) || 0);
    if (!(amount > 0)) throw new BadRequestException('Mazdoori ki amount likhein');
    const due = r2(k.totalEarnings - k.paidLabour);
    if (amount > due + 0.01) {
      throw new BadRequestException(due > 0 ? `${k.fullName} ki baqi mazdoori sirf Rs ${due} hai` : `${k.fullName} ki koi mazdoori baqi nahi — pehle kaam ki mazdoori likhein`);
    }
    const expense = await this.expenses.create(user, scope, {
      title: `Karigar mazdoori ${labourTag(k.karigarNumber)}: ${k.fullName}`.slice(0, 120),
      description: String(dto.note ?? '').trim().slice(0, 500) || undefined,
      amount,
      paymentMethod: toPaymentMethod(dto.paymentMethod),
      status: 'PAID',
      categoryId: await this.labourCategory(user.tenantId),
    });
    const karigar = await this.syncPaid(user.tenantId, k);
    return { karigar, expense: { id: expense.id, expenseNumber: expense.expenseNumber, amount: expense.amount } };
  }

  /** paidLabour is the sum of the karigar's live labour expenses; a cancelled expense drops out. */
  private async syncPaid<K extends { id: string; karigarNumber: string; paidLabour: number }>(tenantId: string, k: K): Promise<K> {
    const agg = await this.prisma.expense.aggregate({
      where: { tenantId, title: { contains: labourTag(k.karigarNumber) }, status: { not: 'CANCELLED' } },
      _sum: { amount: true },
    });
    const paid = r2(Number(agg._sum.amount) || 0);
    if (Math.abs(paid - r2(k.paidLabour)) < 0.005) return k;
    await this.prisma.jewelryKarigar.update({ where: { id: k.id }, data: { paidLabour: paid } });
    return { ...k, paidLabour: paid };
  }

  private async labourCategory(tenantId: string) {
    const own = await this.prisma.expenseCategory.findFirst({
      where: { tenantId, isActive: true, OR: ['karigar', 'mazdoori', 'labour', 'labor', 'wage'].map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })) },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (own) return own.id;
    const made = await this.prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId, name: LABOUR_CATEGORY.name } },
      update: {},
      create: { tenantId, ...LABOUR_CATEGORY },
      select: { id: true },
    });
    return made.id;
  }

  async recordOrder(user: AuthenticatedUser, id: string, earnings: number) {
    await this.getOne(user, id);
    if (!(Number(earnings) >= 0)) throw new BadRequestException('Mazdoori sahi likhein');
    return this.prisma.jewelryKarigar.update({
      where: { id },
      data: { totalOrders: { increment: 1 }, completedOrders: { increment: 1 }, totalEarnings: { increment: r2(Number(earnings)) } },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const k = await this.getOne(user, id);
    if (k.outstandingGrams > 0.001) throw new BadRequestException(`${k.fullName} ke paas abhi ${k.outstandingGrams}g sona hai — pehle wapas lein`);
    return this.prisma.jewelryKarigar.update({ where: { id }, data: { isActive: false } });
  }

  async summary(user: AuthenticatedUser) {
    const [total, inHouse, external, totalOutstanding] = await Promise.all([
      this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId, isActive: true } }),
      this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId, isActive: true, isInHouse: true } }),
      this.prisma.jewelryKarigar.count({ where: { tenantId: user.tenantId, isActive: true, isInHouse: false } }),
      this.prisma.jewelryKarigar.aggregate({
        where: { tenantId: user.tenantId, isActive: true },
        _sum: { outstandingGrams: true, totalEarnings: true },
      }),
    ]);
    return { total, inHouse, external, totalOutstanding: totalOutstanding._sum };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupplierLedgerType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import {
  AddDueDto, AdjustmentDto, OpeningBalanceDto, PaymentDto, ReturnDto,
} from './dto/ledger.dto';

/**
 * SupplierLedgerService — supplier ka khata.
 *
 * Customer ke ulat yahan balance ka matlab hai: HUM supplier ko kitna
 * DETE hain. Is liye:
 *   • kharidari / udhaar  → balance BARHTA hai
 *   • adaigi / wapsi      → balance GHATTA hai
 *
 * `Supplier.outstandingDue` chalta hua balance rehta hai (Customer.balance
 * ki tarah) aur ledger us ki tafseel. Dono ek hi transaction me badalte
 * hain taake kabhi alag na hon.
 */
@Injectable()
export class SupplierLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSupplier(user: AuthenticatedUser, supplierId: string) {
    const s = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId: user.tenantId },
    });
    if (!s) throw new NotFoundException('Supplier nahi mila');
    return s;
  }

  /** Kis qism se balance kis taraf jata hai */
  private delta(type: SupplierLedgerType, amount: number): number {
    switch (type) {
      case 'OPENING_BALANCE':
      case 'PURCHASE_CREDIT':
        return amount;
      case 'PAYMENT_MADE':
      case 'PURCHASE_RETURN':
        return -amount;
      case 'ADJUSTMENT':
        return amount; // musbat ya manfi — jaisa diya gaya
      default:
        return 0;
    }
  }

  /**
   * Ek entry likhna + supplier ka balance badalna, dono ek sath.
   * Har jagah yehi raasta istemal hota hai taake ledger aur
   * `outstandingDue` kabhi alag na hon.
   */
  private async post(
    user: AuthenticatedUser,
    supplierId: string,
    type: SupplierLedgerType,
    amount: number,
    opts: {
      reference?: string; note?: string; entryDate?: string; shopId?: string;
      paymentMethod?: string;
    } = {},
    tx?: Prisma.TransactionClient,
  ) {
    const run = async (db: Prisma.TransactionClient) => {
      const current = await db.supplier.findUniqueOrThrow({
        where: { id: supplierId },
        select: { outstandingDue: true },
      });
      const balanceAfter = Number(current.outstandingDue) + this.delta(type, amount);

      const entry = await db.supplierLedger.create({
        data: {
          tenantId: user.tenantId,
          supplierId,
          createdById: user.id,
          shopId: opts.shopId,
          type,
          amount,
          balanceAfter,
          reference: opts.reference,
          note: opts.note,
          paymentMethod: (opts.paymentMethod as any) ?? undefined,
          entryDate: opts.entryDate ? new Date(opts.entryDate) : new Date(),
        },
      });

      await db.supplier.update({
        where: { id: supplierId },
        data: { outstandingDue: balanceAfter },
      });

      return entry;
    };

    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  /**
   * Kharidari ke sath khud entry — purchases.service isay bulati hai.
   * Bahar se transaction milti hai taake kharidari aur khata dono
   * ek sath hon ya dono na hon.
   */
  async postPurchase(
    user: AuthenticatedUser,
    supplierId: string,
    creditAmount: number,
    reference: string,
    tx: Prisma.TransactionClient,
    shopId?: string,
  ) {
    if (creditAmount <= 0) return null;
    return this.post(user, supplierId, 'PURCHASE_CREDIT', creditAmount,
      { reference, note: 'Udhaar par maal liya', shopId }, tx);
  }

  /**
   * Purana khata — sirf ek bar.
   * Dobara set karne par purani opening entry ki jagah nayi banti hai
   * warna balance do bar jur jata.
   */
  async setOpeningBalance(user: AuthenticatedUser, supplierId: string, dto: OpeningBalanceDto) {
    await this.getSupplier(user, supplierId);

    return this.prisma.$transaction(async (db) => {
      const existing = await db.supplierLedger.findFirst({
        where: { supplierId, type: 'OPENING_BALANCE' },
      });

      const others = await db.supplierLedger.aggregate({
        where: { supplierId, type: { not: 'OPENING_BALANCE' } },
        _sum: { amount: true },
      });

      // Baqi entries ka asar dobara ginte hain taake balance theek rahe
      const rows = await db.supplierLedger.findMany({
        where: { supplierId, type: { not: 'OPENING_BALANCE' } },
        select: { type: true, amount: true },
      });
      const othersDelta = rows.reduce((s, r) => s + this.delta(r.type, r.amount), 0);
      const balanceAfter = dto.amount + othersDelta;

      if (existing) {
        await db.supplierLedger.update({
          where: { id: existing.id },
          data: {
            amount: dto.amount,
            balanceAfter: dto.amount,
            note: dto.note ?? 'Purana hisab — khata shuru hone se pehle ka baqi',
            entryDate: dto.entryDate ? new Date(dto.entryDate) : existing.entryDate,
          },
        });
      } else {
        await db.supplierLedger.create({
          data: {
            tenantId: user.tenantId,
            supplierId,
            createdById: user.id,
            type: 'OPENING_BALANCE',
            amount: dto.amount,
            balanceAfter: dto.amount,
            note: dto.note ?? 'Purana hisab — khata shuru hone se pehle ka baqi',
            entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
          },
        });
      }

      const supplier = await db.supplier.update({
        where: { id: supplierId },
        data: { outstandingDue: balanceAfter },
      });

      void others;
      return supplier;
    });
  }

  /** Udhaar par maal liya — bina purchase bill banaye */
  async addDue(user: AuthenticatedUser, supplierId: string, dto: AddDueDto) {
    await this.getSupplier(user, supplierId);
    return this.post(user, supplierId, 'PURCHASE_CREDIT', dto.amount, {
      reference: dto.reference,
      note: dto.note ?? 'Udhaar par maal liya',
      entryDate: dto.entryDate,
    });
  }

  /** Supplier ko paisa diya */
  async recordPayment(user: AuthenticatedUser, supplierId: string, dto: PaymentDto) {
    const s = await this.getSupplier(user, supplierId);
    if (dto.amount > Number(s.outstandingDue)) {
      throw new BadRequestException(
        `Sirf ${Number(s.outstandingDue).toFixed(0)} dena baqi hai — is se ziyada adaigi darj nahi hoti`,
      );
    }
    return this.post(user, supplierId, 'PAYMENT_MADE', dto.amount, {
      reference: dto.reference,
      note: dto.note ?? 'Supplier ko adaigi',
      entryDate: dto.entryDate,
      /* Na bataya jaye to cash — dukaan par aam tor par yehi hota
         hai, aur purane client ye khaana bhejte hi nahi. */
      paymentMethod: dto.paymentMethod ?? 'CASH',
    });
  }

  /** Maal wapas kiya */
  async recordReturn(user: AuthenticatedUser, supplierId: string, dto: ReturnDto) {
    await this.getSupplier(user, supplierId);
    return this.post(user, supplierId, 'PURCHASE_RETURN', dto.amount, {
      reference: dto.reference,
      note: dto.note ?? 'Maal wapas kiya',
      entryDate: dto.entryDate,
    });
  }

  /** Haath se durusti */
  async adjust(user: AuthenticatedUser, supplierId: string, dto: AdjustmentDto) {
    await this.getSupplier(user, supplierId);
    if (dto.amount === 0) throw new BadRequestException('Raqam 0 nahi ho sakti');
    return this.post(user, supplierId, 'ADJUSTMENT', dto.amount, {
      note: dto.note,
      entryDate: dto.entryDate,
    });
  }

  /** Ek entry hatana — sirf haath se banayi gayi entries */
  async removeEntry(user: AuthenticatedUser, supplierId: string, entryId: string) {
    const entry = await this.prisma.supplierLedger.findFirst({
      where: { id: entryId, supplierId, tenantId: user.tenantId },
    });
    if (!entry) throw new NotFoundException('Entry nahi mili');
    if (entry.type === 'PURCHASE_CREDIT' && entry.reference) {
      throw new BadRequestException(
        'Ye entry kisi kharidari se bani hai — usay purchase page se hi theek karein',
      );
    }

    return this.prisma.$transaction(async (db) => {
      await db.supplierLedger.delete({ where: { id: entryId } });

      // Baqi entries se balance dobara ginte hain — jorna/ghatana
      // se behtar hai, warna ek ghalti hamesha ke liye reh jati hai
      const rows = await db.supplierLedger.findMany({
        where: { supplierId },
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, type: true, amount: true },
      });
      let running = 0;
      for (const r of rows) {
        running += this.delta(r.type, r.amount);
        await db.supplierLedger.update({ where: { id: r.id }, data: { balanceAfter: running } });
      }

      return db.supplier.update({
        where: { id: supplierId },
        data: { outstandingDue: running },
      });
    });
  }

  /** Ek supplier ka poora khata — kharidari aur entries dono */
  async statement(user: AuthenticatedUser, supplierId: string, params: { from?: string; to?: string } = {}) {
    const supplier = await this.getSupplier(user, supplierId);

    const where: any = { supplierId, tenantId: user.tenantId };
    if (params.from || params.to) {
      where.entryDate = {
        ...(params.from && { gte: new Date(params.from) }),
        ...(params.to && { lte: (() => { const d = new Date(params.to!); d.setHours(23, 59, 59, 999); return d; })() }),
      };
    }

    const [entries, purchases] = await Promise.all([
      this.prisma.supplierLedger.findMany({
        where,
        orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
        take: 1000,
      }),
      this.prisma.purchase.findMany({
        where: { supplierId, tenantId: user.tenantId },
        orderBy: { purchasedAt: 'asc' },
        take: 500,
        select: {
          id: true, purchaseNumber: true, purchasedAt: true,
          subtotal: true, discount: true, total: true, paidAmount: true, status: true,
          items: { select: { quantity: true, productId: true, product: { select: { name: true } } } },
        },
      }),
    ]);

    const totals = entries.reduce(
      (acc, e) => {
        const d = this.delta(e.type, e.amount);
        if (d > 0) acc.added += d; else acc.paid += -d;
        return acc;
      },
      { added: 0, paid: 0 },
    );

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        contactPerson: supplier.contactPerson,
        address: supplier.address,
        city: supplier.city,
        outstandingDue: Number(supplier.outstandingDue),
        totalPurchased: Number(supplier.totalPurchased),
      },
      entries,
      purchases,
      totals: {
        ...totals,
        balance: Number(supplier.outstandingDue),
        openingBalance: entries.find((e) => e.type === 'OPENING_BALANCE')?.amount ?? 0,
        entryCount: entries.length,
        purchaseCount: purchases.length,
      },
    };
  }

  /** Saare suppliers ka khulasa — khata page ke KPI cards ke liye */
  async summary(user: AuthenticatedUser) {
    const tenantId = user.tenantId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const DAY = 86_400_000;

    const [suppliers, monthEntries, lastPayments] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { tenantId },
        select: {
          id: true, name: true, phone: true, city: true, isActive: true,
          outstandingDue: true, totalPurchased: true, paymentTerms: true,
        },
      }),
      this.prisma.supplierLedger.findMany({
        where: { tenantId, entryDate: { gte: monthStart } },
        select: { type: true, amount: true },
      }),
      // Har supplier ki aakhri adaigi — kaun se supplier ko arse se paisa nahi diya
      this.prisma.supplierLedger.groupBy({
        by: ['supplierId'],
        where: { tenantId, type: 'PAYMENT_MADE' },
        _max: { entryDate: true },
      }),
    ]);

    const lastPayMap = new Map(lastPayments.map((r) => [r.supplierId, r._max.entryDate]));
    const withDue = suppliers.filter((s) => Number(s.outstandingDue) > 0);

    const debtors = withDue
      .map((s) => {
        const last = lastPayMap.get(s.id);
        return {
          id: s.id,
          name: s.name,
          phone: s.phone,
          city: s.city,
          due: Number(s.outstandingDue),
          totalPurchased: Number(s.totalPurchased),
          paymentTerms: s.paymentTerms,
          lastPaymentAt: last ?? null,
          /** Kitne din se paisa nahi diya */
          daysSincePayment: last ? Math.floor((now.getTime() - new Date(last).getTime()) / DAY) : null,
        };
      })
      .sort((a, b) => b.due - a.due);

    const monthAdded = monthEntries
      .filter((e) => e.type === 'PURCHASE_CREDIT' || e.type === 'OPENING_BALANCE')
      .reduce((s, e) => s + e.amount, 0);
    const monthPaid = monthEntries
      .filter((e) => e.type === 'PAYMENT_MADE')
      .reduce((s, e) => s + e.amount, 0);

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter((s) => s.isActive).length,
      withDue: withDue.length,
      totalDue: withDue.reduce((s, x) => s + Number(x.outstandingDue), 0),
      biggestDue: debtors[0]?.due ?? 0,
      /** 60 din se jinhe paisa nahi diya — rishta kharab hone lagta hai */
      staleCount: debtors.filter((d) => (d.daysSincePayment ?? 999) > 60).length,
      neverPaidCount: debtors.filter((d) => d.daysSincePayment === null).length,
      month: { added: monthAdded, paid: monthPaid, net: monthAdded - monthPaid },
      debtors: debtors.slice(0, 50),
    };
  }
}

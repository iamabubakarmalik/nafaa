import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateWeddingContractDto, RecordWeddingPaymentDto, UpdateContractStatusDto } from './dto/create-contract.dto';
import { ShopScope } from '../../../common/shop-scope';
import {
  ensureCustomer, paidOnKhata, postIndustrySale, recordKhataPayment, resolveIndustryShopId,
} from '../../_shared/industry-sale.helper';
import { addDaysTz, dayStart, parseDay } from '../florist-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const STATUSES = ['QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

/**
 * Wedding money follows the counter's rules. Every advance and payment is
 * written on the family's khata the day it is received (so the day book and
 * the drawer see it), and completing the contract makes the bill, which
 * uses those payments up. Before, payments only changed numbers on the
 * contract and the wedding never reached sales, profit or the day book.
 */

@Injectable()
export class WeddingContractsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The family's khata: found by phone, else opened in the contact's name. */
  private customerFor(tx: any, user: AuthenticatedUser, c: { contactPerson: string; contactPhone: string }, shopId: string) {
    return ensureCustomer(tx, user, { name: c.contactPerson, phone: c.contactPhone, shopId });
  }

  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateWeddingContractDto) {
    const count = await this.prisma.floristWeddingContract.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    let n = count + 1;
    let contractNumber = `WED-${year}-${String(n).padStart(4, '0')}`;
    while (await this.prisma.floristWeddingContract.findFirst({ where: { tenantId: user.tenantId, contractNumber }, select: { id: true } })) {
      n += 1;
      contractNumber = `WED-${year}-${String(n).padStart(4, '0')}`;
    }
    const advance = r2(Math.max(dto.advanceAmount ?? 0, 0));
    if (advance > dto.quotedAmount + 0.01) throw new BadRequestException('Advance quote se zyada nahi ho sakta');
    const balance = r2(dto.quotedAmount - advance);
    const weddingDate = parseDay(dto.weddingDate);
    if (!weddingDate) throw new BadRequestException('Shaadi ki tareekh likhein');

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.floristWeddingContract.create({
        data: {
          tenantId: user.tenantId,
          contractNumber,
          ...dto,
          weddingDate,
          siteVisitDate: parseDay(dto.siteVisitDate),
          setupStartTime: dto.setupStartTime ? parseDay(dto.setupStartTime) : null,
          advanceAmount: advance,
          balanceAmount: balance,
          colorTheme: dto.colorTheme ?? [],
          primaryFlowers: dto.primaryFlowers ?? [],
          moodBoardUrls: dto.moodBoardUrls ?? [],
          handledById: user.id,
          status: 'QUOTED',
        },
      });
      if (advance > 0) {
        const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
        const customerId = await this.customerFor(tx, user, created, shopId);
        await recordKhataPayment(tx, user, {
          customerId, shopId, amount: advance, reference: contractNumber,
          note: `Shaadi advance: ${created.brideName} & ${created.groomName} (${contractNumber})`,
        });
      }
      return created;
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; upcoming?: boolean; search?: string }) {
    return this.prisma.floristWeddingContract.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.upcoming && { weddingDate: { gte: new Date() } }),
        ...(params.search && {
          OR: [
            { contractNumber: { contains: params.search, mode: 'insensitive' } },
            { brideName: { contains: params.search, mode: 'insensitive' } },
            { groomName: { contains: params.search, mode: 'insensitive' } },
            { contactPerson: { contains: params.search, mode: 'insensitive' } },
            { contactPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { weddingDate: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    return c;
  }

  async updateStatus(user: AuthenticatedUser, scope: ShopScope, id: string, dto: UpdateContractStatusDto) {
    if (!STATUSES.includes(dto.status)) throw new BadRequestException('Ghalat status');
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    if (c.status === dto.status) return c;
    if (c.status === 'COMPLETED') {
      throw new BadRequestException('Mukammal contract ka bill ban chuka hai — tabdeeli ke liye us bill par Return karein');
    }
    if (dto.status === 'COMPLETED') return this.complete(user, scope, c, dto.notes);

    const patch: any = { status: dto.status };
    if (dto.status === 'CONFIRMED' && !c.confirmedAt) patch.confirmedAt = new Date();
    if (dto.notes) patch.internalNotes = ((c.internalNotes || '') + '\n' + dto.notes).trim();
    return this.prisma.floristWeddingContract.update({ where: { id }, data: patch });
  }

  /** Wedding done: the bill is made and the payments on the khata cover it. */
  private async complete(user: AuthenticatedUser, scope: ShopScope, c: any, notes?: string) {
    const amount = r2(c.finalAmount > 0 ? c.finalAmount : c.quotedAmount);
    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
      const customerId = await this.customerFor(tx, user, c, shopId);
      // Advances recorded before they went to the khata count as paid with this bill.
      const legacyPaid = r2(Math.max(Number(c.advanceAmount || 0) - (await paidOnKhata(tx, user.tenantId, c.contractNumber)), 0));
      const sale = await postIndustrySale(tx, user, {
        saleNumber: `FLW-${c.contractNumber}`,
        sourceRef: c.contractNumber,
        shopId,
        customerId,
        lines: [{ label: `Shaadi phool / sajawat: ${c.brideName} & ${c.groomName}`, amount }],
        paidAmount: Math.min(legacyPaid, amount),
        paymentMethod: 'CASH',
      });
      const updated = await tx.floristWeddingContract.update({
        where: { id: c.id },
        data: {
          status: 'COMPLETED',
          finalAmount: amount,
          internalNotes: [c.internalNotes, `Bill ${sale.saleNumber}`, notes].filter(Boolean).join('\n'),
        },
      });
      return { ...updated, sale: { id: sale.id, saleNumber: sale.saleNumber } };
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<CreateWeddingContractDto>) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    if (c.status === 'COMPLETED') throw new BadRequestException('Mukammal contract badla nahi ja sakta');

    // Money already taken changes only through payments, never by editing the form.
    const patch: any = { ...(dto ?? {}) };
    for (const k of ['id', 'tenantId', 'contractNumber', 'status', 'advanceAmount', 'balanceAmount', 'finalAmount', 'createdAt', 'updatedAt', 'handledById']) delete patch[k];
    if (patch.contactEmail === '') patch.contactEmail = null;
    if (dto.weddingDate) patch.weddingDate = parseDay(dto.weddingDate) ?? undefined;
    if (dto.siteVisitDate !== undefined) patch.siteVisitDate = parseDay(dto.siteVisitDate);
    if (dto.setupStartTime !== undefined) patch.setupStartTime = dto.setupStartTime ? parseDay(dto.setupStartTime) : null;
    if (dto.quotedAmount !== undefined) {
      if (dto.quotedAmount < Number(c.advanceAmount || 0) - 0.01) {
        throw new BadRequestException(`Rs ${c.advanceAmount} pehle mil chuke hain — quote us se kam nahi ho sakta`);
      }
      patch.balanceAmount = r2(dto.quotedAmount - Number(c.advanceAmount || 0));
    }
    return this.prisma.floristWeddingContract.update({ where: { id }, data: patch });
  }

  async recordPayment(user: AuthenticatedUser, scope: ShopScope, id: string, dto: RecordWeddingPaymentDto) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    if (c.status === 'CANCELLED') throw new BadRequestException('Cancel contract par raqam nahi li ja sakti');
    const amount = r2(dto.amount);
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const owed = r2(Number(c.quotedAmount || 0) - Number(c.advanceAmount || 0));
    if (amount > owed + 0.01) throw new BadRequestException(`Sirf Rs ${owed} baqi hain`);

    const newAdvance = r2(Number(c.advanceAmount || 0) + amount);
    const newBalance = Math.max(r2(Number(c.quotedAmount || 0) - newAdvance), 0);

    return this.prisma.$transaction(async (tx) => {
      const shopId = await resolveIndustryShopId(tx, user, scope.shopId);
      const customerId = await this.customerFor(tx, user, c, shopId);
      await recordKhataPayment(tx, user, {
        customerId, shopId, amount, reference: c.contractNumber,
        note: `Shaadi payment: ${c.brideName} & ${c.groomName} (${c.contractNumber})`,
      });
      return tx.floristWeddingContract.update({
        where: { id },
        data: {
          advanceAmount: newAdvance,
          balanceAmount: newBalance,
          internalNotes: dto.notes ? ((c.internalNotes || '') + '\nPayment: ' + dto.notes).trim() : undefined,
        },
      });
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    // Money on the khata points at this contract; cancel it instead of deleting.
    if (c.status === 'COMPLETED' || Number(c.advanceAmount) > 0) {
      throw new BadRequestException('Is contract par raqam li ja chuki hai — delete ki jagah Cancel karein');
    }
    return this.prisma.floristWeddingContract.delete({ where: { id } });
  }

  async upcomingWeddings(user: AuthenticatedUser, days = 30) {
    const now = dayStart();
    const future = addDaysTz(now, days);
    return this.prisma.floristWeddingContract.findMany({
      where: {
        tenantId: user.tenantId,
        weddingDate: { gte: now, lte: future },
        status: { in: ['QUOTED', 'CONFIRMED'] },
      },
      orderBy: { weddingDate: 'asc' },
    });
  }
}

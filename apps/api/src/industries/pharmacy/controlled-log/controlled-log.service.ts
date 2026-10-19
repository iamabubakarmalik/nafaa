import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DrugScheduleClass, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { dayRange, round2 } from '../common/pharmacy-time';
import { CreateControlledLogDto, OUTGOING_LOG_TYPES, SaleDetailsDto } from './dto/create-controlled-log.dto';

type Db = PrismaService | Prisma.TransactionClient;

/** Schedules whose every sale goes in the register, on top of medicines marked narcotic. */
export const REGISTER_CLASSES: DrugScheduleClass[] = ['NARCOTIC', 'PSYCHOTROPIC', 'CONTROLLED', 'SCHEDULE_X'];
export const IN_REGISTER: Prisma.PharmacyMedicineWhereInput = { OR: [{ isNarcotic: true }, { scheduleClass: { in: REGISTER_CLASSES } }] };
export const inRegister = (m: { isNarcotic: boolean; scheduleClass: DrugScheduleClass }) => m.isNarcotic || REGISTER_CLASSES.includes(m.scheduleClass);

/** Patient and doctor named on a bill line. */
export interface RxParty {
  patientName?: string;
  patientCnic?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorRegNumber?: string;
  prescriptionNumber?: string;
}

/**
 * Reads the details the counter writes on a narcotic bill line:
 * "Rx · Dr. Ahmed (PMDC 12345) · Mareez: Ali (CNIC 35202-…)", and the
 * "Nuskha Rx-2026-0001 · Dr. Ahmed" line written when a prescription is dispensed.
 */
export function parseRxNote(note?: string | null): RxParty {
  if (!note) return {};
  const out: RxParty = {};
  const rx = /Nuskha (Rx-\d{4}-\d+)/.exec(note);
  if (rx) out.prescriptionNumber = rx[1];
  const dr = /Dr\. ([^(·•]+?)\s*(?:\(PMDC ([^)]+)\))?\s*(?=[·•]|$)/.exec(note);
  if (dr) { out.doctorName = dr[1].trim(); if (dr[2]) out.doctorRegNumber = dr[2].trim(); }
  const pt = /Mareez: ([^(·•]+?)\s*(?:\(CNIC ([^)]+)\))?\s*(?=[·•]|$)/.exec(note);
  if (pt) { out.patientName = pt[1].trim(); if (pt[2]) out.patientCnic = pt[2].trim(); }
  return out;
}

const MOVE_LABEL: Record<string, string> = {
  PURCHASE_IN: 'Purchase', SALE_OUT: 'Sale', ADJUSTMENT_IN: 'Adjustment (+)', ADJUSTMENT_OUT: 'Adjustment (−)',
  RETURN_IN: 'Return', OPENING_BALANCE: 'Opening stock', DAMAGE: 'Damage / expiry', LOSS: 'Loss',
  TRANSFER_IN: 'Transfer aaya', TRANSFER_OUT: 'Transfer gaya', PURCHASE_RETURN: 'Supplier ko wapas',
};

@Injectable()
export class ControlledLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateControlledLogDto) {
    return this.record(this.prisma, user.tenantId, dto, user.email);
  }

  /**
   * Writes one register line. Entries are made after the stock has already
   * moved (a sale, a received purchase, a damage write-off), so the closing
   * balance is the stock on hand now and the opening balance is worked back
   * from it.
   */
  async record(db: Db, tenantId: string, dto: CreateControlledLogDto, dispensedBy?: string) {
    const quantity = Number(dto.quantity);
    if (!(quantity > 0)) throw new BadRequestException('Miqdaar 0 se zyada honi chahiye');

    const med = await db.pharmacyMedicine.findFirst({
      where: { productId: dto.productId, tenantId },
      include: { product: { select: { stock: true, unit: true } } },
    });
    if (!med) throw new NotFoundException('Dawai nahi mili');
    if (!inRegister(med)) throw new BadRequestException('Ye dawai narcotic / controlled list me nahi hai');

    if (dto.batchId) {
      const batch = await db.productBatch.findFirst({ where: { id: dto.batchId, productId: dto.productId, tenantId } });
      if (!batch) throw new NotFoundException('Batch nahi mila');
    }
    if (dto.saleId && !(await db.sale.findFirst({ where: { id: dto.saleId, tenantId }, select: { id: true } }))) {
      throw new NotFoundException('Bill nahi mila');
    }

    const closing = Number(med.product?.stock ?? 0);
    const outgoing = OUTGOING_LOG_TYPES.includes(dto.logType);
    const opening = outgoing ? closing + quantity : closing - quantity;

    const year = new Date().getFullYear();
    let seq = (await db.controlledSubstanceLog.count({ where: { tenantId } })) + 1;
    let logNumber = `CSR-${year}-${String(seq).padStart(5, '0')}`;
    while (await db.controlledSubstanceLog.findFirst({ where: { tenantId, logNumber }, select: { id: true } })) {
      seq += 1;
      logNumber = `CSR-${year}-${String(seq).padStart(5, '0')}`;
    }

    return db.controlledSubstanceLog.create({
      data: {
        tenantId,
        productId: dto.productId,
        batchId: dto.batchId || undefined,
        saleId: dto.saleId || undefined,
        prescriptionId: dto.prescriptionId || undefined,
        logNumber,
        logType: dto.logType,
        quantity,
        unit: dto.unit || med.product?.unit || 'pcs',
        openingBalance: opening,
        closingBalance: closing,
        patientName: dto.patientName || undefined,
        patientCnic: dto.patientCnic || undefined,
        patientPhone: dto.patientPhone || undefined,
        patientAddress: dto.patientAddress || undefined,
        doctorName: dto.doctorName || undefined,
        doctorRegNumber: dto.doctorRegNumber || undefined,
        prescriptionNumber: dto.prescriptionNumber || undefined,
        dispensedBy: dto.dispensedBy || dispensedBy || undefined,
        supervisedBy: dto.supervisedBy || undefined,
        notes: dto.notes || undefined,
        attachmentUrls: dto.attachmentUrls ?? [],
      },
    });
  }

  /** Day keys (YYYY-MM-DD) use the shop's day; any other value is read as a date. */
  private async logDateRange(tenantId: string, from?: string, to?: string) {
    const key = /^\d{4}-\d{2}-\d{2}$/;
    if ((!from || key.test(from)) && (!to || key.test(to))) {
      const r = await dayRange(this.tz, tenantId, from, to);
      return r.gte || r.lt ? r : undefined;
    }
    return { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) };
  }

  async list(user: AuthenticatedUser, params: { productId?: string; from?: string; to?: string; logType?: string }) {
    const logDate = await this.logDateRange(user.tenantId, params.from, params.to);
    return this.prisma.controlledSubstanceLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.productId && { productId: params.productId }),
        ...(params.logType && { logType: params.logType }),
        ...(logDate && { logDate }),
      },
      orderBy: { logDate: 'desc' },
      take: 500,
    });
  }

  /**
   * Patient and doctor for a narcotic on a bill, filled in afterwards (for
   * bills made without them, or to correct them). One register line per
   * bill and medicine: an existing one is updated, never duplicated.
   */
  async saveSaleDetails(user: AuthenticatedUser, dto: SaleDetailsDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: dto.saleId, tenantId: user.tenantId },
      select: { id: true, status: true, items: { where: { productId: dto.productId }, select: { quantity: true } } },
    });
    if (!sale) throw new NotFoundException('Bill nahi mila');
    if (!sale.items.length) throw new BadRequestException('Ye dawai is bill me nahi');
    const details = {
      patientName: dto.patientName.trim(),
      patientCnic: dto.patientCnic?.trim() || null,
      patientPhone: dto.patientPhone?.trim() || null,
      patientAddress: dto.patientAddress?.trim() || null,
      doctorName: dto.doctorName.trim(),
      doctorRegNumber: dto.doctorRegNumber?.trim() || null,
      prescriptionNumber: dto.prescriptionNumber?.trim() || null,
    };
    const existing = await this.prisma.controlledSubstanceLog.findFirst({
      where: { tenantId: user.tenantId, saleId: sale.id, productId: dto.productId, logType: 'SALE' },
      select: { id: true },
    });
    if (existing) return this.prisma.controlledSubstanceLog.update({ where: { id: existing.id }, data: details });
    return this.record(this.prisma, user.tenantId, {
      productId: dto.productId,
      logType: 'SALE',
      quantity: sale.items.reduce((t, i) => t + Number(i.quantity), 0),
      saleId: sale.id,
      ...Object.fromEntries(Object.entries(details).filter(([, v]) => v)),
    } as CreateControlledLogDto, user.email);
  }

  /** Branch stock now: the branch row, or every branch when the view is "all shops". */
  private async stockNow(productId: string, scope: ShopScope): Promise<number> {
    if (!scope.shopId) {
      const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
      return Number(p?.stock ?? 0);
    }
    const row = await this.prisma.shopStock.findFirst({ where: { shopId: scope.shopId, productId, variantId: null }, select: { stock: true } });
    return Number(row?.stock ?? 0);
  }

  /**
   * Every narcotic medicine with its stock now, what came in and went out in
   * the period, and how many of its sales still lack patient or doctor.
   */
  async overview(user: AuthenticatedUser, scope: ShopScope, params: { from?: string; to?: string }) {
    const meds = await this.prisma.pharmacyMedicine.findMany({
      where: { tenantId: user.tenantId, ...IN_REGISTER },
      select: { productId: true, scheduleClass: true, dosageForm: true, product: { select: { name: true, unit: true, stock: true, isActive: true } } },
      orderBy: { product: { name: 'asc' } },
    });
    if (!meds.length) return { items: [], totals: { medicines: 0, sales: 0, missing: 0, out: 0 } };
    const ids = meds.map((m) => m.productId);
    const range = await dayRange(this.tz, user.tenantId, params.from, params.to);
    const when = range.gte || range.lt ? { createdAt: range } : {};

    const [moves, shopRows, sales] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where: { tenantId: user.tenantId, productId: { in: ids }, ...scope.where, ...when },
        select: { productId: true, quantity: true },
      }),
      scope.shopId
        ? this.prisma.shopStock.findMany({ where: { shopId: scope.shopId, productId: { in: ids }, variantId: null }, select: { productId: true, stock: true } })
        : Promise.resolve([] as Array<{ productId: string; stock: number }>),
      this.saleLines(user.tenantId, scope, ids, range),
    ]);
    const stockOf = new Map(shopRows.map((r) => [r.productId, Number(r.stock)]));

    const items = meds.map((m) => {
      const mine = moves.filter((x) => x.productId === m.productId);
      const lines = sales.filter((s) => s.productId === m.productId);
      return {
        productId: m.productId,
        name: m.product.name,
        unit: m.product.unit,
        isActive: m.product.isActive,
        scheduleClass: m.scheduleClass,
        dosageForm: m.dosageForm,
        stock: scope.shopId ? stockOf.get(m.productId) ?? 0 : Number(m.product.stock),
        inQty: round2(mine.filter((x) => x.quantity > 0).reduce((t, x) => t + x.quantity, 0)),
        outQty: round2(-mine.filter((x) => x.quantity < 0).reduce((t, x) => t + x.quantity, 0)),
        sales: lines.length,
        missing: lines.filter((l) => l.missing).length,
      };
    });
    return {
      items,
      totals: {
        medicines: items.length,
        sales: items.reduce((t, i) => t + i.sales, 0),
        missing: items.reduce((t, i) => t + i.missing, 0),
        out: round2(items.reduce((t, i) => t + i.outQty, 0)),
      },
    };
  }

  /**
   * Narcotic lines on live bills in the period, with the patient and doctor
   * found for each: the register line, else the bill line's note, else the
   * bill's customer (patient only).
   */
  private async saleLines(tenantId: string, scope: ShopScope, productIds: string[], range: { gte?: Date; lt?: Date }) {
    const items = await this.prisma.saleItem.findMany({
      where: {
        productId: { in: productIds },
        sale: { tenantId, status: { not: 'VOIDED' }, ...scope.where, ...((range.gte || range.lt) && { soldAt: range }) },
      },
      select: {
        id: true, productId: true, quantity: true, note: true, saleId: true,
        sale: { select: { saleNumber: true, soldAt: true, customer: { select: { name: true, phone: true, cnic: true } } } },
      },
      take: 5000,
    });
    if (!items.length) return [];
    const logs = await this.prisma.controlledSubstanceLog.findMany({
      where: { tenantId, saleId: { in: [...new Set(items.map((i) => i.saleId))] }, productId: { in: productIds }, logType: 'SALE' },
    });
    const logOf = new Map(logs.map((l) => [`${l.saleId}:${l.productId}`, l]));
    return items.map((i) => {
      const party = this.partyFor(logOf.get(`${i.saleId}:${i.productId}`), i.note, i.sale.customer);
      return { ...i, party, missing: !party.patientName || !party.doctorName };
    });
  }

  private partyFor(
    log: { patientName: string | null; patientCnic: string | null; patientPhone: string | null; doctorName: string | null; doctorRegNumber: string | null; prescriptionNumber: string | null; id?: string } | undefined,
    note: string | null,
    customer: { name: string; phone: string | null; cnic: string | null } | null,
  ): RxParty & { logId?: string } {
    const fromNote = parseRxNote(note);
    const pick = (...v: Array<string | null | undefined>) => v.find((x) => !!x?.trim()) ?? undefined;
    return {
      logId: log?.id,
      patientName: pick(log?.patientName, fromNote.patientName, customer?.name),
      patientCnic: pick(log?.patientCnic, fromNote.patientCnic, customer?.cnic),
      patientPhone: pick(log?.patientPhone, customer?.phone),
      doctorName: pick(log?.doctorName, fromNote.doctorName),
      doctorRegNumber: pick(log?.doctorRegNumber, fromNote.doctorRegNumber),
      prescriptionNumber: pick(log?.prescriptionNumber, fromNote.prescriptionNumber),
    };
  }

  /**
   * The register of one narcotic for a period: every stock movement in order
   * with opening and closing balance, and for sales the patient and doctor.
   * Balances run back from the stock on hand now, so they always end at the
   * real shelf count.
   */
  async register(user: AuthenticatedUser, scope: ShopScope, productId: string, params: { from?: string; to?: string }) {
    const med = await this.prisma.pharmacyMedicine.findFirst({
      where: { productId, tenantId: user.tenantId },
      select: { isNarcotic: true, scheduleClass: true, registrationNumber: true, dosageForm: true, product: { select: { id: true, name: true, unit: true } } },
    });
    if (!med) throw new NotFoundException('Dawai nahi mili');
    const range = await dayRange(this.tz, user.tenantId, params.from, params.to);
    const base = { tenantId: user.tenantId, productId, ...scope.where };

    const [now, later, moves] = await Promise.all([
      this.stockNow(productId, scope),
      range.lt
        ? this.prisma.stockMovement.aggregate({ where: { ...base, createdAt: { gte: range.lt } }, _sum: { quantity: true } })
        : Promise.resolve({ _sum: { quantity: 0 } }),
      this.prisma.stockMovement.findMany({
        where: { ...base, ...((range.gte || range.lt) && { createdAt: range }) },
        orderBy: { createdAt: 'asc' },
        take: 2000,
      }),
    ]);
    const closing = round2(now - Number(later._sum.quantity ?? 0));
    const opening = round2(closing - moves.reduce((t, m) => t + m.quantity, 0));

    const refs = [...new Set(moves.map((m) => m.reference).filter(Boolean) as string[])];
    const [sales, returns] = refs.length
      ? await Promise.all([
        this.prisma.sale.findMany({
          where: { tenantId: user.tenantId, saleNumber: { in: refs } },
          select: {
            id: true, saleNumber: true, status: true,
            customer: { select: { name: true, phone: true, cnic: true } },
            items: { where: { productId }, select: { note: true } },
          },
        }),
        this.prisma.saleReturn.findMany({
          where: { tenantId: user.tenantId, returnNumber: { in: refs } },
          select: { returnNumber: true, sale: { select: { saleNumber: true } } },
        }),
      ])
      : [[], []];
    const saleBy = new Map(sales.map((s) => [s.saleNumber, s]));
    const logs = sales.length
      ? await this.prisma.controlledSubstanceLog.findMany({ where: { tenantId: user.tenantId, productId, logType: 'SALE', saleId: { in: sales.map((s) => s.id) } } })
      : [];
    const logBy = new Map(logs.map((l) => [l.saleId, l]));
    const returnBy = new Map(returns.map((r) => [r.returnNumber, r.sale.saleNumber]));

    let balance = opening;
    const rows = moves.map((m, i) => {
      const before = balance;
      balance = round2(balance + m.quantity);
      const sale = m.type === 'SALE_OUT' && m.reference ? saleBy.get(m.reference) : undefined;
      const party = sale ? this.partyFor(logBy.get(sale.id), sale.items.map((it) => it.note).filter(Boolean).join(' • '), sale.customer) : undefined;
      const voidOf = m.type === 'RETURN_IN' && m.reference && saleBy.has(m.reference) ? m.reference : undefined;
      return {
        no: i + 1,
        id: m.id,
        at: m.createdAt,
        type: m.type,
        label: voidOf ? 'Bill void' : MOVE_LABEL[m.type] ?? m.type,
        reference: m.reference,
        returnOf: m.reference ? returnBy.get(m.reference) : undefined,
        note: m.note,
        inQty: m.quantity > 0 ? round2(m.quantity) : 0,
        outQty: m.quantity < 0 ? round2(-m.quantity) : 0,
        opening: before,
        closing: balance,
        saleId: sale?.id,
        saleVoided: sale?.status === 'VOIDED',
        party,
        missing: !!sale && sale.status !== 'VOIDED' && (!party?.patientName || !party?.doctorName),
      };
    });

    return {
      medicine: { ...med.product, isNarcotic: med.isNarcotic, scheduleClass: med.scheduleClass, registrationNumber: med.registrationNumber, dosageForm: med.dosageForm },
      opening,
      closing,
      inQty: round2(rows.reduce((t, r) => t + r.inQty, 0)),
      outQty: round2(rows.reduce((t, r) => t + r.outQty, 0)),
      missing: rows.filter((r) => r.missing).length,
      rows,
    };
  }
}

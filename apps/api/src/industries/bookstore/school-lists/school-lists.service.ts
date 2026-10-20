import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SchoolListStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { cleanInput } from '../bookstore-common';

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const STATUSES: SchoolListStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'];
const ITEM_TYPES = ['BOOK', 'STATIONERY', 'UNIFORM', 'OTHER'];
const text = (v: unknown) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

interface ItemInput {
  productId?: string | null; itemName?: string; itemType?: string; quantity?: number; unit?: string;
  unitPrice?: number; discount?: number; subject?: string; isRequired?: boolean; isOptional?: boolean; notes?: string;
}

/**
 * School book lists: the books and stationery one class needs for a
 * session. An active list is sold at the counter as a set in one go (the
 * POS splits the set price over its products, so stock, cost and profit
 * stay per book). Lines not in the catalog (uniform from elsewhere) stay
 * on the printed list only.
 */
@Injectable()
export class SchoolListsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Checks the lines and fills names and prices from linked products. */
  private async buildItems(tenantId: string, raw: unknown) {
    if (!Array.isArray(raw)) throw new BadRequestException('List ki cheezein bhejein');
    const input = raw as ItemInput[];
    const ids = [...new Set(input.map((i) => i?.productId).filter((v): v is string => typeof v === 'string' && v.length > 0))];
    const products = ids.length
      ? await this.prisma.product.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, name: true, price: true, unit: true } })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));
    if (byId.size !== ids.length) throw new BadRequestException('List me koi cheez is dukaan ki nahi');

    return input.map((it, i) => {
      const p = it.productId ? byId.get(it.productId) : undefined;
      const itemName = text(it.itemName) ?? p?.name;
      if (!itemName) throw new BadRequestException(`Line ${i + 1}: naam likhein`);
      const quantity = Math.floor(Number(it.quantity ?? 1));
      if (!(quantity >= 1)) throw new BadRequestException(`${itemName}: quantity kam se kam 1`);
      const unitPrice = r2(it.unitPrice === undefined || it.unitPrice === null ? (p?.price ?? 0) : Number(it.unitPrice));
      const discount = r2(Number(it.discount ?? 0));
      if (unitPrice < 0 || discount < 0) throw new BadRequestException(`${itemName}: price ya discount manfi nahi ho sakta`);
      if (discount > unitPrice * quantity) throw new BadRequestException(`${itemName}: discount line ki amount se zyada hai`);
      const itemType = ITEM_TYPES.includes(String(it.itemType ?? '').toUpperCase()) ? String(it.itemType).toUpperCase() : 'BOOK';
      const isOptional = !!it.isOptional;
      return {
        productId: p?.id ?? null,
        itemName,
        itemType,
        quantity,
        unit: text(it.unit) ?? p?.unit ?? 'piece',
        unitPrice,
        discount,
        total: r2(unitPrice * quantity - discount),
        subject: text(it.subject),
        isRequired: !isOptional,
        isOptional,
        notes: text(it.notes),
        displayOrder: i,
      };
    });
  }

  /** Header fields from a request body; ownership and stats are never taken from it. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
  private header(dto: any, partial: boolean) {
    const src = cleanInput(dto);
    const out: Prisma.SchoolBookListUncheckedUpdateInput = {};
    for (const k of ['session', 'grade', 'section', 'medium', 'title', 'description', 'imageUrl'] as const) {
      if (src[k] !== undefined) out[k] = text(src[k]) as never;
    }
    if (!partial || src.session !== undefined) { if (!out.session) throw new BadRequestException('Session likhein (jaise 2026-2027)'); }
    if (!partial || src.grade !== undefined) { if (!out.grade) throw new BadRequestException('Class likhein'); }
    if (src.title !== undefined && !out.title) delete out.title;
    if (src.discountPct !== undefined) {
      const d = Number(src.discountPct);
      if (!Number.isFinite(d) || d < 0 || d > 100) throw new BadRequestException('Discount 0 se 100% tak');
      out.discountPct = d;
    }
    if (src.status !== undefined) {
      if (!STATUSES.includes(src.status)) throw new BadRequestException('Status sahi nahi');
      out.status = src.status;
    }
    if (src.bundlePrice !== undefined) {
      const b = src.bundlePrice === null || src.bundlePrice === '' ? null : Number(src.bundlePrice);
      if (b !== null && (!Number.isFinite(b) || b < 0)) throw new BadRequestException('Set ki qeemat sahi likhein');
      out.bundlePrice = b === null ? null : r2(b);
    }
    return out;
  }

  /** Set price: the fixed bundle price, else the lines less the list discount. */
  private setPrice(items: Array<{ total: number; isOptional: boolean }>, discountPct: number, bundlePrice?: number | null) {
    if (bundlePrice !== undefined && bundlePrice !== null) return r2(bundlePrice);
    const sum = items.filter((i) => !i.isOptional).reduce((s, i) => s + i.total, 0);
    return r2(sum * (1 - (Number(discountPct) || 0) / 100));
  }

  private async school(tenantId: string, schoolId: unknown) {
    if (typeof schoolId !== 'string' || !schoolId) throw new BadRequestException('School chunein');
    const school = await this.prisma.school.findFirst({ where: { id: schoolId, tenantId }, select: { id: true } });
    if (!school) throw new NotFoundException('School nahi mila');
    return school.id;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
  async create(user: AuthenticatedUser, dto: any) {
    const schoolId = await this.school(user.tenantId, dto?.schoolId);
    const head = this.header(dto, false);
    const items = await this.buildItems(user.tenantId, dto?.items ?? []);
    const discountPct = Number(head.discountPct ?? 0);
    return this.prisma.schoolBookList.create({
      data: {
        tenantId: user.tenantId,
        schoolId,
        session: head.session as string,
        grade: head.grade as string,
        section: (head.section as string | null) ?? null,
        medium: (head.medium as string | null) ?? null,
        title: (head.title as string | undefined) ?? `${head.grade} - ${head.session}`,
        description: (head.description as string | null) ?? null,
        imageUrl: (head.imageUrl as string | null) ?? null,
        status: (head.status as SchoolListStatus | undefined) ?? 'DRAFT',
        discountPct,
        bundlePrice: this.setPrice(items, discountPct, head.bundlePrice as number | null | undefined),
        totalItems: items.length,
        items: { create: items },
      },
      include: { items: { orderBy: { displayOrder: 'asc' } }, school: true },
    });
  }

  async list(user: AuthenticatedUser, params: { schoolId?: string; session?: string; grade?: string; status?: string; search?: string }) {
    return this.prisma.schoolBookList.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.schoolId && { schoolId: params.schoolId }),
        ...(params.session && { session: params.session }),
        ...(params.grade && { grade: params.grade }),
        ...(params.status && STATUSES.includes(params.status as SchoolListStatus) && { status: params.status as SchoolListStatus }),
        ...(params.search && {
          OR: [
            { title: { contains: params.search, mode: 'insensitive' } },
            { grade: { contains: params.search, mode: 'insensitive' } },
            { school: { name: { contains: params.search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: { school: true, items: { orderBy: { displayOrder: 'asc' } } },
      orderBy: [{ session: 'desc' }, { grade: 'asc' }],
      take: 300,
    });
  }

  /**
   * Active lists for the counter, with each line's current product price
   * and stock, so a set can be sold whole or line by line.
   */
  async forPos(user: AuthenticatedUser) {
    const lists = await this.prisma.schoolBookList.findMany({
      where: { tenantId: user.tenantId, status: 'ACTIVE', school: { isActive: true } },
      include: { school: { select: { id: true, name: true } }, items: { orderBy: { displayOrder: 'asc' } } },
      orderBy: [{ grade: 'asc' }],
      take: 300,
    });
    const ids = [...new Set(lists.flatMap((l) => l.items.map((i) => i.productId)).filter((v): v is string => !!v))];
    const products = ids.length
      ? await this.prisma.product.findMany({ where: { tenantId: user.tenantId, id: { in: ids }, isActive: true }, select: { id: true, price: true } })
      : [];
    const price = new Map(products.map((p) => [p.id, p.price]));
    return lists.map((l) => ({
      id: l.id,
      title: l.title,
      grade: l.grade,
      section: l.section,
      session: l.session,
      school: l.school,
      bundlePrice: l.bundlePrice,
      discountPct: l.discountPct,
      items: l.items.map((i) => ({
        id: i.id, productId: i.productId && price.has(i.productId) ? i.productId : null, itemName: i.itemName, itemType: i.itemType,
        quantity: i.quantity, unitPrice: i.unitPrice, total: i.total, isOptional: i.isOptional, subject: i.subject,
        currentPrice: i.productId ? price.get(i.productId) ?? null : null,
      })),
    }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const list = await this.prisma.schoolBookList.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { school: true, items: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!list) throw new NotFoundException('School list nahi mili');
    return list;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
  async update(user: AuthenticatedUser, id: string, dto: any) {
    const list = await this.prisma.schoolBookList.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: true } });
    if (!list) throw new NotFoundException('School list nahi mili');
    const head = this.header(dto, true);
    if (dto?.schoolId !== undefined) head.schoolId = await this.school(user.tenantId, dto.schoolId);
    const items = dto?.items !== undefined ? await this.buildItems(user.tenantId, dto.items) : null;
    const discountPct = head.discountPct !== undefined ? Number(head.discountPct) : list.discountPct;
    const lines = items ?? list.items;
    // A fixed set price stays unless the form sends a new one (or clears it).
    const fixed = dto?.bundlePrice !== undefined ? (head.bundlePrice as number | null) : (items || head.discountPct !== undefined ? null : list.bundlePrice);
    head.bundlePrice = this.setPrice(lines, discountPct, fixed);

    return this.prisma.$transaction(async (tx) => {
      if (items) {
        // Lines are the list's own rows (no sale points at them), so they are replaced as a whole.
        await tx.schoolBookListItem.deleteMany({ where: { listId: id } });
        if (items.length) await tx.schoolBookListItem.createMany({ data: items.map((it) => ({ ...it, listId: id })) });
        head.totalItems = items.length;
      }
      return tx.schoolBookList.update({
        where: { id },
        data: head,
        include: { school: true, items: { orderBy: { displayOrder: 'asc' } } },
      });
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    if (!STATUSES.includes(status as SchoolListStatus)) throw new BadRequestException('Status sahi nahi');
    const list = await this.prisma.schoolBookList.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!list) throw new NotFoundException('School list nahi mili');
    return this.prisma.schoolBookList.update({ where: { id }, data: { status: status as SchoolListStatus } });
  }

  /** Lists are archived, never erased: last season's list is next season's starting point. */
  async remove(user: AuthenticatedUser, id: string) {
    const list = await this.prisma.schoolBookList.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!list) throw new NotFoundException('School list nahi mili');
    return this.prisma.schoolBookList.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  /** Copies a list into a new session as a draft, with today's product prices. */
  async duplicate(user: AuthenticatedUser, id: string, newSession: string) {
    const session = text(newSession);
    if (!session) throw new BadRequestException('Naya session likhein');
    const list = await this.prisma.schoolBookList.findFirst({ where: { id, tenantId: user.tenantId }, include: { items: { orderBy: { displayOrder: 'asc' } } } });
    if (!list) throw new NotFoundException('School list nahi mili');
    const items = await this.buildItems(user.tenantId, list.items.map((it) => ({
      ...it, unitPrice: it.productId ? undefined : it.unitPrice,
    })));
    return this.prisma.schoolBookList.create({
      data: {
        tenantId: user.tenantId,
        schoolId: list.schoolId,
        session,
        grade: list.grade,
        section: list.section,
        medium: list.medium,
        title: list.title.includes(list.session) ? list.title.replace(list.session, session) : `${list.title} (${session})`,
        description: list.description,
        status: 'DRAFT',
        discountPct: list.discountPct,
        bundlePrice: this.setPrice(items, list.discountPct, null),
        totalItems: items.length,
        imageUrl: list.imageUrl,
        items: { create: items },
      },
      include: { school: true, items: true },
    });
  }
}

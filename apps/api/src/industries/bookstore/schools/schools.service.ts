import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { cleanInput } from '../bookstore-common';

/** Fields a school form may set; stats and ownership are never taken from the body. */
const FIELDS = [
  'name', 'code', 'type', 'board', 'medium', 'address', 'city', 'phone', 'email', 'principalName',
  'contactPerson', 'contactPhone', 'discountPct', 'creditDays', 'creditLimit', 'logoUrl', 'notes', 'isActive',
] as const;
const NUMBERS = new Set(['discountPct', 'creditDays', 'creditLimit']);

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
function pick(dto: any): Record<string, unknown> {
  const src = cleanInput(dto);
  const out: Record<string, unknown> = {};
  for (const k of FIELDS) {
    if (src[k] === undefined) continue;
    if (NUMBERS.has(k)) {
      const n = Number(src[k]);
      if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${k} sahi likhein`);
      if (k === 'discountPct' && n > 100) throw new BadRequestException('Discount 100% se zyada nahi ho sakta');
      out[k] = k === 'creditDays' ? Math.round(n) : n;
    } else if (k === 'isActive') {
      out[k] = !!src[k];
    } else {
      const s = src[k] === null ? null : String(src[k]).trim();
      out[k] = s === '' ? null : s;
    }
  }
  return out;
}

/**
 * Schools and institutions the shop supplies. A school that buys on credit
 * gets a customer khata of the same name: its bills, payments and balance
 * then run through the shared khata, day book and reports.
 */
@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: unknown) {
    const data = pick(dto);
    const name = String(data.name ?? '').trim();
    if (!name) throw new BadRequestException('School ka naam likhein');
    const dup = await this.prisma.school.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' } } });
    if (dup) throw new BadRequestException(`School "${name}" pehle se hai`);
    return this.prisma.school.create({ data: { ...data, name, tenantId: user.tenantId } });
  }

  async list(user: AuthenticatedUser, params: { active?: boolean; type?: string; board?: string; city?: string; search?: string }) {
    const schools = await this.prisma.school.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.type && { type: params.type }),
        ...(params.board && { board: params.board }),
        ...(params.city && { city: params.city }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
            { city: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { bookLists: true } } },
      orderBy: { name: 'asc' },
    });
    const khata = await this.khataFor(user.tenantId, schools.map((s) => s.name));
    return schools.map((s) => ({ ...s, customer: khata.get(s.name.toLowerCase()) ?? null }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.school.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { bookLists: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!s) throw new NotFoundException('School nahi mila');
    const khata = await this.khataFor(user.tenantId, [s.name]);
    return { ...s, customer: khata.get(s.name.toLowerCase()) ?? null };
  }

  async update(user: AuthenticatedUser, id: string, dto: unknown) {
    const s = await this.prisma.school.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('School nahi mila');
    const data = pick(dto);
    if (data.name !== undefined) {
      const name = String(data.name ?? '').trim();
      if (!name) throw new BadRequestException('School ka naam likhein');
      const dup = await this.prisma.school.findFirst({ where: { tenantId: user.tenantId, name: { equals: name, mode: 'insensitive' }, NOT: { id } } });
      if (dup) throw new BadRequestException(`School "${name}" pehle se hai`);
    }
    return this.prisma.school.update({ where: { id }, data });
  }

  /** Switches a school off; its lists, bills and khata stay. */
  async remove(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.school.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('School nahi mila');
    return this.prisma.school.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Opens (or finds) the school's khata: a customer with the school's name.
   * Its credit limit follows the school's; bills sold to it on udhaar land
   * on this khata like any other customer's.
   */
  async openKhata(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.school.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!s) throw new NotFoundException('School nahi mila');
    const found = await this.prisma.customer.findFirst({
      where: { tenantId: user.tenantId, name: { equals: s.name, mode: 'insensitive' } },
      select: { id: true, name: true, balance: true, creditLimit: true, isActive: true },
    });
    if (found) {
      if (!found.isActive || (s.creditLimit > 0 && found.creditLimit !== s.creditLimit)) {
        return this.prisma.customer.update({
          where: { id: found.id },
          data: { isActive: true, ...(s.creditLimit > 0 && { creditLimit: s.creditLimit }) },
          select: { id: true, name: true, balance: true, creditLimit: true },
        });
      }
      return found;
    }
    return this.prisma.customer.create({
      data: {
        tenantId: user.tenantId,
        shopId: user.shopId ?? null,
        name: s.name,
        phone: s.contactPhone || s.phone || null,
        email: s.email,
        address: s.address,
        city: s.city,
        creditLimit: s.creditLimit,
        notes: 'School / institution khata',
      },
      select: { id: true, name: true, balance: true, creditLimit: true },
    });
  }

  /** Khata of each school, matched by name (case does not matter). */
  private async khataFor(tenantId: string, names: string[]) {
    const map = new Map<string, { id: string; balance: number; creditLimit: number }>();
    if (!names.length) return map;
    const rows = await this.prisma.customer.findMany({
      where: { tenantId, isActive: true, OR: names.map((n) => ({ name: { equals: n, mode: 'insensitive' as const } })) },
      select: { id: true, name: true, balance: true, creditLimit: true },
    });
    for (const r of rows) map.set(r.name.toLowerCase(), { id: r.id, balance: r.balance, creditLimit: r.creditLimit });
    return map;
  }
}

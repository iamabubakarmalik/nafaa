/**
 * Karigars (artisans): who they are, their rates, and the gold they hold.
 * Gold given and taken back goes through the metal ledger, so metal stock
 * and each karigar's balance always agree.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JewelryPurity } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { issueToKarigar, receiveFromKarigar } from '../common/karigar-metal';

const FIELDS = ['fullName', 'fatherName', 'cnic', 'phone', 'address', 'photoUrl', 'specializations', 'skillLevel', 'isActive', 'isInHouse', 'notes'] as const;
const pick = (dto: any) => Object.fromEntries(FIELDS.filter((k) => dto?.[k] !== undefined).map((k) => [k, dto[k] === '' ? null : dto[k]]));
const num = (v: unknown) => (v === undefined ? undefined : v === null || v === '' ? null : Number(v));
const PURITIES = Object.values(JewelryPurity) as string[];

@Injectable()
export class KarigarsService {
  constructor(private readonly prisma: PrismaService) {}

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

  /** Gold moved with a karigar and the orders given to them. */
  async ledger(user: AuthenticatedUser, id: string) {
    const k = await this.getOne(user, id);
    const [metal, orders] = await Promise.all([
      this.prisma.jewelryMetalStock.findMany({ where: { tenantId: user.tenantId, karigarId: id }, orderBy: { entryDate: 'desc' }, take: 200 }),
      this.prisma.jewelryCustomOrder.findMany({
        where: { tenantId: user.tenantId, assignedKarigarId: id }, orderBy: { orderDate: 'desc' }, take: 100,
        select: { id: true, orderNumber: true, customerName: true, status: true, purity: true, promisedDate: true, metalIssuedGrams: true, metalReceivedGrams: true, wastageGrams: true, designDescription: true },
      }),
    ]);
    return { karigar: k, metal, orders };
  }

  async recordOrder(user: AuthenticatedUser, id: string, earnings: number) {
    const k = await this.getOne(user, id);
    if (!(Number(earnings) >= 0)) throw new BadRequestException('Mazdoori sahi likhein');
    return this.prisma.jewelryKarigar.update({
      where: { id },
      data: {
        totalOrders: k.totalOrders + 1,
        completedOrders: k.completedOrders + 1,
        totalEarnings: k.totalEarnings + Number(earnings),
      },
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

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { dayKey, dayRange, parseDay } from '../meat-common';
import { mustChange, r2, r3, str, withNextNumber } from '../meat-money';
import { convertStock } from '../meat-stock';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- request bodies here are untyped
type Body = any;

/** What a job keeps in its `cutsProduced` JSON: the carcass item and, once done, the cuts. */
interface CutsJson {
  source?: { productId: string; name: string } | null;
  cuts?: Array<{ productId: string; name: string; qty: number; unitCost: number }>;
  value?: number;
}

const asCuts = (v: unknown): CutsJson => (v && typeof v === 'object' && !Array.isArray(v) ? (v as CutsJson) : {});

/**
 * Cutting: a carcass (or dressed birds) becomes boneless, qeema, chops,
 * mixed and so on. On completion the input kg leave the carcass item and
 * each cut comes into stock with its share of the cost (by sale value);
 * bones and fat thrown away carry no value.
 */
@Injectable()
export class CuttingJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, scope: ShopScope, dto: Body) {
    const inputKg = r3(Number(dto?.inputWeightKg));
    if (!(inputKg > 0)) throw new BadRequestException('Wazan (kg) likhein');
    const slaughterLogId = str(dto?.slaughterLogId);
    if (slaughterLogId) {
      const log = await this.prisma.meatSlaughterLog.findFirst({ where: { id: slaughterLogId, tenantId: user.tenantId }, select: { id: true } });
      if (!log) throw new NotFoundException('Zibah ka record nahi mila');
    }
    const source = await this.product(user, str(dto?.sourceProductId));
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto?.shopId);
    const year = dayKey().slice(0, 4);
    return withNextNumber(
      async (prefix) => (await this.prisma.meatCuttingJob.findFirst({ where: { tenantId: user.tenantId, jobNumber: { startsWith: prefix } }, orderBy: { jobNumber: 'desc' }, select: { jobNumber: true } }))?.jobNumber,
      `CUT-${year}-`, 4,
      (jobNumber) => this.prisma.meatCuttingJob.create({
        data: {
          tenantId: user.tenantId, shopId, jobNumber, slaughterLogId,
          butcherId: str(dto?.butcherId), butcherName: str(dto?.butcherName, 120),
          inputWeightKg: inputKg, startedAt: parseDay(dto?.startedAt) ?? new Date(), status: 'IN_PROGRESS',
          notes: str(dto?.notes, 2000),
          cutsProduced: { source: source ? { productId: source.id, name: source.name } : null } as unknown as Prisma.InputJsonValue,
        },
      }),
    );
  }

  async list(user: AuthenticatedUser, params: { status?: string; butcherId?: string; from?: string; to?: string; search?: string }) {
    const range = dayRange(params.from, params.to);
    return this.prisma.meatCuttingJob.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.butcherId && { butcherId: params.butcherId }),
        ...(range && { startedAt: range }),
        ...(params.search && { OR: [{ jobNumber: { contains: params.search, mode: 'insensitive' } }, { butcherName: { contains: params.search, mode: 'insensitive' } }] }),
      },
      orderBy: { startedAt: 'desc' },
      take: 300,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const j = await this.prisma.meatCuttingJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!j) throw new NotFoundException('Cutting ka kaam nahi mila');
    return j;
  }

  async complete(user: AuthenticatedUser, scope: ShopScope, id: string, dto: Body) {
    const j = await this.getOne(user, id);
    if (j.status !== 'IN_PROGRESS') throw new BadRequestException(j.status === 'COMPLETED' ? 'Ye kaam pehle hi mukammal ho chuka hai' : 'Cancel kaam mukammal nahi ho sakta');
    const json = asCuts(j.cutsProduced);
    const cuts: Array<{ productId: string; qty: number }> = Array.isArray(dto?.cuts)
      ? dto.cuts.filter((c: Body) => c?.productId && Number(c.kg) > 0).map((c: Body) => ({ productId: String(c.productId), qty: r3(Number(c.kg)) }))
      : [];
    if (new Set(cuts.map((c) => c.productId)).size !== cuts.length) throw new BadRequestException('Ek cut do baar likha hai — wazan jor kar ek line rakhein');
    const outKg = r3(cuts.reduce((s, c) => s + c.qty, 0));
    const wasteKg = dto?.wasteWeightKg === undefined || dto?.wasteWeightKg === null || dto?.wasteWeightKg === '' ? r3(j.inputWeightKg - outKg) : r3(Number(dto.wasteWeightKg));
    if (!cuts.length) throw new BadRequestException('Kam se kam ek cut ka wazan likhein');
    if (!(wasteKg >= 0) || outKg + wasteKg > j.inputWeightKg + 0.0005) throw new BadRequestException(`Cuts (${outKg} kg) aur waste (${wasteKg} kg) mila kar ${j.inputWeightKg} kg se zyada nahi ho sakte`);
    const source = json.source?.productId ? json.source : await this.product(user, str(dto?.sourceProductId)).then((p) => (p ? { productId: p.id, name: p.name } : null));
    if (!source) throw new BadRequestException('Kis item se cutting hui (carcass / dressed) — chunein, taake stock aur cost theek rahe');
    const shopId = j.shopId ?? (await resolveWriteShopId(this.prisma, user.tenantId, scope, null));
    const completedAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      const done = await tx.meatCuttingJob.updateMany({ where: { id, tenantId: user.tenantId, status: 'IN_PROGRESS' }, data: { status: 'COMPLETED' } });
      mustChange(done.count);
      const res = await convertStock(tx, user, {
        shopId, reference: j.jobNumber, note: `Cutting: ${source.name} ${j.inputWeightKg} kg`,
        take: [{ productId: source.productId, qty: j.inputWeightKg }], give: cuts,
      });
      return tx.meatCuttingJob.update({
        where: { id },
        data: {
          outputWeightKg: outKg, wasteWeightKg: wasteKg, yieldPct: r2((outKg / j.inputWeightKg) * 100), completedAt,
          durationMin: Math.max(Math.round((completedAt.getTime() - j.startedAt.getTime()) / 60000), 0), shopId,
          cutsProduced: { source, cuts: res.given, value: res.value } as unknown as Prisma.InputJsonValue,
          ...(dto?.notes !== undefined && { notes: str(dto.notes, 2000) }),
        },
      });
    }, { timeout: 30_000 });
  }

  /** An open job that will not be done; nothing was moved yet. */
  async cancel(user: AuthenticatedUser, id: string, reason?: string) {
    const j = await this.getOne(user, id);
    if (j.status !== 'IN_PROGRESS') throw new BadRequestException('Sirf chalta hua kaam cancel ho sakta hai');
    const done = await this.prisma.meatCuttingJob.updateMany({
      where: { id, tenantId: user.tenantId, status: 'IN_PROGRESS' },
      data: { status: 'CANCELLED', notes: [j.notes, reason ? `Cancel: ${str(reason, 300)}` : 'Cancel'].filter(Boolean).join('\n') },
    });
    mustChange(done.count);
    return this.getOne(user, id);
  }

  private async product(user: AuthenticatedUser, id: string | null) {
    if (!id) return null;
    const p = await this.prisma.product.findFirst({ where: { id, tenantId: user.tenantId, isActive: true }, select: { id: true, name: true } });
    if (!p) throw new NotFoundException('Item nahi mila ya band hai');
    return p;
  }
}

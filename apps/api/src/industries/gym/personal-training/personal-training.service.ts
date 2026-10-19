import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PERMISSIONS } from '../../../common/constants/permissions.constants';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { postIndustrySale } from '../../_shared/industry-sale.helper';
import { DAY_MS, GYM_SALE, assertCan, gymClock, nextNumber, opt, r2 } from '../common/gym-common';
import { CreatePtDto, PtRateDto, PtStatusDto, PtWorkoutLogDto } from './dto/pt.dto';

const P = PERMISSIONS;
type Db = Prisma.TransactionClient;

/** The bill a single PT session was charged on. */
export const ptSaleNumber = (sessionNumber: string) => `${GYM_SALE}${sessionNumber}`;

@Injectable()
export class PersonalTrainingService {
  constructor(private readonly prisma: PrismaService, private readonly tz: TenantTimezoneService) {}

  /** The member's running membership with PT sessions still unused (counting sessions already booked). */
  private async packageFor(db: Db, tenantId: string, memberId: string, at: Date) {
    const rows = await db.gymMemberMembership.findMany({
      where: { tenantId, memberId, status: { in: ['ACTIVE', 'FROZEN'] }, endDate: { gte: at }, plan: { includesPersonalTraining: true } },
      include: { plan: { select: { name: true, personalTrainingSessions: true } } },
      orderBy: { endDate: 'asc' },
    });
    const booked = await db.gymPersonalTraining.count({ where: { tenantId, memberId, isFromPackage: true, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } } });
    let pending = booked;
    for (const m of rows) {
      const left = m.plan.personalTrainingSessions - m.ptSessionsUsed;
      if (left - pending > 0) return { membership: m, left: left - pending };
      pending = Math.max(pending - left, 0);
    }
    return null;
  }

  /** Books one session, or the same slot every week for `weeks` weeks. */
  async create(user: AuthenticatedUser, dto: CreatePtDto) {
    const tenantId = user.tenantId;
    const [trainer, member] = await Promise.all([
      this.prisma.gymTrainer.findFirst({ where: { id: dto.trainerId, tenantId, isActive: true } }),
      this.prisma.gymMember.findFirst({ where: { id: dto.memberId, tenantId, isActive: true } }),
    ]);
    if (!trainer) throw new NotFoundException('Trainer nahi mila');
    if (!member) throw new NotFoundException('Member nahi mila');
    const start = new Date(dto.scheduledStart);
    const minutes = dto.scheduledEnd ? Math.round((new Date(dto.scheduledEnd).getTime() - start.getTime()) / 60000) : dto.durationMinutes ?? 60;
    if (!(minutes >= 15 && minutes <= 240)) throw new BadRequestException('Session 15 minute se 4 ghante tak ka ho');
    if (start.getTime() < Date.now() - DAY_MS) throw new BadRequestException('Guzra hua waqt book nahi hota');
    const weeks = dto.weeks ?? 1;
    const price = dto.isFromPackage ? 0 : r2(dto.price ?? trainer.perSessionRate);
    const clock = await gymClock(this.tz, tenantId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isFromPackage) {
        const pkg = await this.packageFor(tx, tenantId, member.id, start);
        if (!pkg) throw new BadRequestException('Is member ke plan me PT sessions baqi nahi — single session book karein ya PT package bechein');
        if (pkg.left < weeks) throw new BadRequestException(`Plan me sirf ${pkg.left} PT sessions baqi hain`);
      }
      const made = [];
      for (let w = 0; w < weeks; w += 1) {
        const s = new Date(start.getTime() + w * 7 * DAY_MS);
        const e = new Date(s.getTime() + minutes * 60000);
        const clash = await tx.gymPersonalTraining.findFirst({
          where: { tenantId, trainerId: trainer.id, status: { in: ['SCHEDULED', 'IN_PROGRESS'] }, scheduledStart: { lt: e }, scheduledEnd: { gt: s } },
          select: { sessionNumber: true },
        });
        if (clash) throw new BadRequestException(`Trainer ${clock.keyOf(s)} ko is waqt ${clash.sessionNumber} me masroof hai`);
        const prefix = `PT-${clock.year(s)}-`;
        const sessionNumber = await nextNumber(tx, tenantId, prefix, async () => (await tx.gymPersonalTraining.findFirst({
          where: { tenantId, sessionNumber: { startsWith: prefix } }, orderBy: { sessionNumber: 'desc' }, select: { sessionNumber: true },
        }))?.sessionNumber);
        made.push(await tx.gymPersonalTraining.create({
          data: {
            tenantId,
            memberId: member.id,
            trainerId: trainer.id,
            sessionNumber,
            scheduledStart: s,
            scheduledEnd: e,
            durationMinutes: minutes,
            price,
            isFromPackage: !!dto.isFromPackage,
            focusArea: opt(dto.focusArea),
            trainerNotes: opt(dto.trainerNotes),
          },
          include: { trainer: true },
        }));
      }
      return weeks === 1 ? made[0] : { sessions: made, count: made.length };
    });
  }

  async list(user: AuthenticatedUser, params: { memberId?: string; trainerId?: string; status?: string; from?: string; to?: string; search?: string }) {
    const tenantId = user.tenantId;
    const clock = await gymClock(this.tz, tenantId);
    const keyRange = clock.range(params.from, params.to);
    const q = params.search?.trim();
    const matched = q
      ? await this.prisma.customer.findMany({ where: { tenantId, OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }, select: { id: true }, take: 500 })
      : [];
    const memberIds = q ? (await this.prisma.gymMember.findMany({ where: { tenantId, customerId: { in: matched.map((c) => c.id) } }, select: { id: true } })).map((m) => m.id) : [];
    const rows = await this.prisma.gymPersonalTraining.findMany({
      where: {
        tenantId,
        ...(params.memberId && { memberId: params.memberId }),
        ...(params.trainerId && { trainerId: params.trainerId }),
        ...(params.status && { status: params.status }),
        ...(keyRange
          ? { scheduledStart: { gte: keyRange.gte, lt: keyRange.lt } }
          : params.from || params.to
            ? { scheduledStart: { ...(params.from && { gte: new Date(params.from) }), ...(params.to && { lte: new Date(params.to) }) } }
            : {}),
        ...(q && { OR: [{ sessionNumber: { contains: q, mode: 'insensitive' } }, { memberId: { in: memberIds } }] }),
      },
      include: { trainer: true },
      orderBy: { scheduledStart: 'asc' },
      take: 500,
    });
    const members = await this.prisma.gymMember.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.memberId))] } }, select: { id: true, memberNumber: true, customerId: true } });
    const staff = await this.prisma.staff.findMany({ where: { tenantId, id: { in: [...new Set(rows.map((r) => r.trainer.staffId))] } }, select: { id: true, fullName: true } });
    const people = await this.prisma.customer.findMany({ where: { tenantId, id: { in: members.map((m) => m.customerId) } }, select: { id: true, name: true, phone: true } });
    const personOf = new Map(people.map((c) => [c.id, c]));
    const memberOf = new Map(members.map((m) => [m.id, { id: m.id, memberNumber: m.memberNumber, customer: personOf.get(m.customerId) ?? null }]));
    const staffOf = new Map(staff.map((s) => [s.id, s]));
    return rows.map((r) => ({ ...r, member: memberOf.get(r.memberId) ?? null, trainer: { ...r.trainer, staff: staffOf.get(r.trainer.staffId) ?? null } }));
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const s = await this.prisma.gymPersonalTraining.findFirst({ where: { id, tenantId: user.tenantId }, include: { trainer: true } });
    if (!s) throw new NotFoundException('Session nahi mila');
    return s;
  }

  /**
   * Moves a session along. Completing it earns the trainer's commission and,
   * for a single paid session, posts the bill (money taken now, the rest on
   * the member's khata). A package session uses one session of the plan.
   */
  async updateStatus(user: AuthenticatedUser, id: string, dto: PtStatusDto) {
    const tenantId = user.tenantId;
    const pt = await this.prisma.gymPersonalTraining.findFirst({ where: { id, tenantId }, include: { trainer: true } });
    if (!pt) throw new NotFoundException('Session nahi mila');
    const status = dto.status;
    if (pt.status === status) return pt;
    if (pt.status === 'COMPLETED') throw new BadRequestException('Mukammal session ka status nahi badalta — bill void ya return karein');
    if (pt.status === 'CANCELLED') throw new BadRequestException('Cancel session dobara nahi khulta');
    if (status === 'SCHEDULED' && pt.status !== 'NO_SHOW') throw new BadRequestException('Session pehle se schedule hai');
    const now = new Date();
    if ((status === 'COMPLETED' || status === 'IN_PROGRESS') && pt.scheduledStart.getTime() > now.getTime() + 12 * 3_600_000) {
      throw new BadRequestException('Ye session abhi aage hai — waqt par shuru ya mukammal karein');
    }
    const patch: Prisma.GymPersonalTrainingUpdateInput = { status };
    if (status === 'IN_PROGRESS') patch.actualStart = now;
    if (status === 'CANCELLED') { patch.cancelledAt = now; patch.cancellationReason = opt(dto.cancellationReason); }

    if (status !== 'COMPLETED') return this.prisma.gymPersonalTraining.update({ where: { id }, data: patch, include: { trainer: true } });

    const paid = r2(Math.min(Math.max(Number(dto.paidAmount) || 0, 0), pt.price));
    if (!pt.isFromPackage && pt.price > 0) assertCan(user, [P.POS_USE], 'Session ka bill banane');
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.gymMember.findFirst({ where: { id: pt.memberId, tenantId }, select: { customerId: true, shopId: true } });
      if (!member) throw new NotFoundException('Member nahi mila');
      let base = pt.price;
      if (pt.isFromPackage) {
        const rows = await tx.gymMemberMembership.findMany({
          where: { tenantId, memberId: pt.memberId, status: { in: ['ACTIVE', 'FROZEN'] }, endDate: { gte: pt.scheduledStart }, plan: { includesPersonalTraining: true } },
          include: { plan: { select: { personalTrainingSessions: true } } },
          orderBy: { endDate: 'asc' },
        });
        const pkg = rows.find((m) => m.ptSessionsUsed < m.plan.personalTrainingSessions);
        if (!pkg) throw new BadRequestException('Plan ke PT sessions khatam ho chuke — is session ko single session bana kar book karein');
        await tx.gymMemberMembership.update({ where: { id: pkg.id }, data: { ptSessionsUsed: { increment: 1 } } });
        // The trainer earns on the session's value: the per-session rate, or the plan's share.
        base = pt.trainer.perSessionRate > 0 ? pt.trainer.perSessionRate : r2(pkg.totalPrice / Math.max(pkg.plan.personalTrainingSessions, 1));
      } else if (pt.price > 0) {
        await postIndustrySale(tx, user, {
          saleNumber: ptSaleNumber(pt.sessionNumber),
          sourceRef: pt.sessionNumber,
          shopId: member.shopId,
          customerId: member.customerId,
          lines: [{ label: `Personal training ${pt.sessionNumber}`, amount: pt.price }],
          paidAmount: paid,
          paymentMethod: dto.paymentMethod,
        });
        await tx.gymMember.update({ where: { id: pt.memberId }, data: { totalSpent: { increment: pt.price } } });
      }
      const commissionAmount = r2((base * pt.trainer.commissionPct) / 100 + pt.trainer.commissionFixed);
      await tx.gymTrainer.update({
        where: { id: pt.trainerId },
        data: { totalSessions: { increment: 1 }, totalRevenue: { increment: pt.price }, totalCommission: { increment: commissionAmount } },
      });
      return tx.gymPersonalTraining.update({
        where: { id },
        data: { ...patch, actualStart: pt.actualStart ?? now, actualEnd: now, paidAmount: paid, commissionAmount },
        include: { trainer: true },
      });
    });
  }

  async rate(user: AuthenticatedUser, id: string, dto: PtRateDto) {
    const s = await this.prisma.gymPersonalTraining.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!s) throw new NotFoundException('Session nahi mila');
    return this.prisma.gymPersonalTraining.update({ where: { id }, data: { memberRating: dto.rating, memberFeedback: opt(dto.feedback) } });
  }

  async logWorkout(user: AuthenticatedUser, id: string, dto: PtWorkoutLogDto) {
    const s = await this.prisma.gymPersonalTraining.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!s) throw new NotFoundException('Session nahi mila');
    return this.prisma.gymPersonalTraining.update({
      where: { id },
      data: {
        focusArea: opt(dto.focusArea),
        caloriesBurned: dto.caloriesBurned,
        trainerNotes: opt(dto.trainerNotes),
        ...(dto.workoutPlan !== undefined && { workoutPlan: dto.workoutPlan as Prisma.InputJsonValue }),
        ...(dto.exercisesPerformed !== undefined && { exercisesPerformed: dto.exercisesPerformed as Prisma.InputJsonValue }),
      },
    });
  }
}

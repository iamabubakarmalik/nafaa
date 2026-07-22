import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class DispatchService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestTechnicians(user: AuthenticatedUser, jobId: string) {
    const job = await this.prisma.serviceJob.findFirst({ where: { id: jobId, tenantId: user.tenantId } });
    if (!job) throw new NotFoundException('Job not found');

    const now = new Date();
    const dayOfWeek = now.getDay();

    // Find technicians matching business type + city
    const candidates = await this.prisma.serviceTechnicianProfile.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        workingDays: { has: dayOfWeek },
        status: { in: ['AVAILABLE', 'ON_JOB'] },
        ...(job.businessType && {
          OR: [
            { primarySkill: job.businessType },
            { secondarySkills: { has: job.businessType } },
          ],
        }),
        ...(job.city && { serviceAreas: { has: job.city } }),
      },
    });

    const staffIds = candidates.map((c) => c.staffId);
    const staffs = await this.prisma.staff.findMany({ where: { id: { in: staffIds } } });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    // Score each: availability + rating + distance
    const scored = candidates.map((c) => {
      let score = 0;
      score += c.status === 'AVAILABLE' ? 50 : 20;
      score += (c.avgRating ?? 0) * 10;
      score += c.onTimePct * 0.3;
      score += c.completionPct * 0.2;

      // Distance if we have GPS on both
      let distanceKm = null;
      if (c.currentLat && c.currentLng && job.latitude && job.longitude) {
        distanceKm = this.calculateDistanceKm(c.currentLat, c.currentLng, job.latitude, job.longitude);
        score -= distanceKm * 2;
      }

      return {
        ...c,
        staff: staffMap.get(c.staffId),
        matchScore: Math.max(score, 0),
        distanceKm,
      };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
  }

  private calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async liveMap(user: AuthenticatedUser) {
    const [technicians, activeJobs] = await Promise.all([
      this.prisma.serviceTechnicianProfile.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
          currentLat: { not: null },
          currentLng: { not: null },
        },
      }),
      this.prisma.serviceJob.findMany({
        where: {
          tenantId: user.tenantId,
          status: { in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'] },
        },
      }),
    ]);

    const staffIds = technicians.map((t) => t.staffId);
    const staffs = await this.prisma.staff.findMany({ where: { id: { in: staffIds } } });
    const staffMap = new Map(staffs.map((s) => [s.id, s]));

    return {
      technicians: technicians.map((t) => ({
        id: t.id,
        staffId: t.staffId,
        name: staffMap.get(t.staffId),
        status: t.status,
        lat: t.currentLat,
        lng: t.currentLng,
        lastLocationAt: t.lastLocationAt,
      })),
      activeJobs: activeJobs.map((j) => ({
        id: j.id,
        jobNumber: j.jobNumber,
        serviceName: j.serviceName,
        customerName: j.customerName,
        status: j.status,
        priority: j.priority,
        lat: j.latitude,
        lng: j.longitude,
        address: j.serviceAddress,
        technicianId: j.primaryTechnicianId,
      })),
    };
  }
}

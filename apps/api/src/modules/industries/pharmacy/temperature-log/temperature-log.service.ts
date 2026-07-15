import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class TemperatureLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const isWithinRange =
      (dto.minLimit === undefined || dto.temperature >= dto.minLimit) &&
      (dto.maxLimit === undefined || dto.temperature <= dto.maxLimit);

    return this.prisma.temperatureLog.create({
      data: {
        tenantId: user.tenantId,
        shopId: dto.shopId,
        temperature: dto.temperature,
        humidity: dto.humidity,
        unit: dto.unit ?? 'celsius',
        location: dto.location,
        minLimit: dto.minLimit,
        maxLimit: dto.maxLimit,
        isWithinRange,
        recordedBy: dto.recordedBy ?? user.id,
        automated: dto.automated ?? false,
        notes: dto.notes,
      },
    });
  }

  async list(user: AuthenticatedUser, params: { location?: string; from?: string; to?: string; withinRange?: boolean }) {
    return this.prisma.temperatureLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.location && { location: params.location }),
        ...(params.withinRange !== undefined && { isWithinRange: params.withinRange }),
        ...(params.from || params.to ? {
          logDate: {
            ...(params.from && { gte: new Date(params.from) }),
            ...(params.to && { lte: new Date(params.to) }),
          },
        } : {}),
      },
      orderBy: { logDate: 'desc' },
      take: 200,
    });
  }

  async summary(user: AuthenticatedUser, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [total, breaches, byLocation] = await Promise.all([
      this.prisma.temperatureLog.count({ where: { tenantId: user.tenantId, logDate: { gte: since } } }),
      this.prisma.temperatureLog.count({ where: { tenantId: user.tenantId, logDate: { gte: since }, isWithinRange: false } }),
      this.prisma.temperatureLog.groupBy({
        by: ['location'],
        where: { tenantId: user.tenantId, logDate: { gte: since } },
        _avg: { temperature: true, humidity: true },
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      breaches,
      compliancePct: total > 0 ? ((total - breaches) / total) * 100 : 100,
      byLocation,
    };
  }
}

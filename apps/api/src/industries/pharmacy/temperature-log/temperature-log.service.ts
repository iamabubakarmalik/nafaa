import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { ShopScope, resolveWriteShopId } from '../../../common/shop-scope';
import { TenantTimezoneService } from '../../../common/helpers/tenant-timezone.service';
import { dayRange, round2 } from '../common/pharmacy-time';
import { CreateTemperatureLogDto } from './dto/create-temperature-log.dto';

@Injectable()
export class TemperatureLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tz: TenantTimezoneService,
  ) {}

  /** One reading; it is out of range when it falls outside the limits given. */
  async create(user: AuthenticatedUser, scope: ShopScope, dto: CreateTemperatureLogDto) {
    if (dto.minLimit != null && dto.maxLimit != null && dto.minLimit > dto.maxLimit) {
      throw new BadRequestException('Kam se kam had zyada wali se bari nahi ho sakti');
    }
    const shopId = await resolveWriteShopId(this.prisma, user.tenantId, scope, dto.shopId);
    const isWithinRange = (dto.minLimit == null || dto.temperature >= dto.minLimit) && (dto.maxLimit == null || dto.temperature <= dto.maxLimit);
    return this.prisma.temperatureLog.create({
      data: {
        tenantId: user.tenantId,
        shopId,
        temperature: dto.temperature,
        humidity: dto.humidity,
        unit: dto.unit ?? 'celsius',
        location: dto.location.trim(),
        minLimit: dto.minLimit,
        maxLimit: dto.maxLimit,
        isWithinRange,
        recordedBy: user.email,
        automated: dto.automated ?? false,
        notes: dto.notes?.trim() || undefined,
      },
    });
  }

  async list(user: AuthenticatedUser, scope: ShopScope, params: { location?: string; from?: string; to?: string; withinRange?: boolean }) {
    const logDate = await dayRange(this.tz, user.tenantId, params.from, params.to);
    return this.prisma.temperatureLog.findMany({
      where: {
        tenantId: user.tenantId,
        ...scope.whereLoose,
        ...(params.location && { location: params.location }),
        ...(params.withinRange !== undefined && { isWithinRange: params.withinRange }),
        ...((logDate.gte || logDate.lt) && { logDate }),
      },
      orderBy: { logDate: 'desc' },
      take: 500,
    });
  }

  /** Readings, breaches and averages per place over the last `days` days. */
  async summary(user: AuthenticatedUser, scope: ShopScope, days = 7) {
    const since = new Date(Date.now() - Math.min(Math.max(days, 1), 365) * 86_400_000);
    const where = { tenantId: user.tenantId, ...scope.whereLoose, logDate: { gte: since } };
    const [total, breaches, byLocation, last] = await Promise.all([
      this.prisma.temperatureLog.count({ where }),
      this.prisma.temperatureLog.count({ where: { ...where, isWithinRange: false } }),
      this.prisma.temperatureLog.groupBy({
        by: ['location'],
        where,
        _avg: { temperature: true, humidity: true },
        _min: { temperature: true },
        _max: { temperature: true },
        _count: { _all: true },
      }),
      this.prisma.temperatureLog.findFirst({ where: { tenantId: user.tenantId, ...scope.whereLoose }, orderBy: { logDate: 'desc' }, select: { logDate: true } }),
    ]);

    return {
      total,
      breaches,
      compliancePct: total > 0 ? round2(((total - breaches) / total) * 100) : 100,
      lastReadingAt: last?.logDate ?? null,
      byLocation,
    };
  }
}

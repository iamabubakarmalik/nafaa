import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateSizeChartDto, UpdateSizeChartDto } from './dto/create-chart.dto';

/** Size rows keep only short text cells (pk, uk, eu, us, cm…). */
function cleanRows(rows: Array<Record<string, unknown>>) {
  return rows.map((r) => Object.fromEntries(Object.entries(r ?? {}).filter(([k, v]) => /^[a-z]{1,6}$/i.test(k) && v != null && String(v).trim()).map(([k, v]) => [k.toLowerCase(), String(v).trim().slice(0, 12)])))
    .filter((r) => Object.keys(r).length > 0);
}

@Injectable()
export class ShoeSizeChartsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateSizeChartDto) {
    const dup = await this.prisma.shoeSizeChart.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (dup) throw new BadRequestException(`"${dto.name}" naam ka chart pehle se hai`);
    const mappings = cleanRows(dto.mappings);
    if (!mappings.length) throw new BadRequestException('Kam az kam ek size likhein');
    return this.prisma.shoeSizeChart.create({
      data: { tenantId: user.tenantId, ...dto, mappings, isActive: dto.isActive ?? true },
    });
  }

  async list(user: AuthenticatedUser, params: {
    brandId?: string;
    gender?: string;
    categoryType?: string;
    active?: boolean;
  }) {
    return this.prisma.shoeSizeChart.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.brandId && { brandId: params.brandId }),
        ...(params.gender && { gender: params.gender as any }),
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.shoeSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Size chart not found');
    return c;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateSizeChartDto) {
    const c = await this.prisma.shoeSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Size chart not found');
    if (dto.name && dto.name !== c.name && await this.prisma.shoeSizeChart.count({ where: { tenantId: user.tenantId, name: dto.name } })) {
      throw new BadRequestException(`"${dto.name}" naam ka chart pehle se hai`);
    }
    const mappings = dto.mappings ? cleanRows(dto.mappings) : undefined;
    if (mappings && !mappings.length) throw new BadRequestException('Kam az kam ek size likhein');
    return this.prisma.shoeSizeChart.update({ where: { id }, data: { ...dto, ...(mappings && { mappings }) } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.shoeSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Size chart not found');
    return this.prisma.shoeSizeChart.update({ where: { id }, data: { isActive: false } });
  }
}

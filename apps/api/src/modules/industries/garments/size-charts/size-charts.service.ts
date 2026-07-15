import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertSizeChartDto } from './dto/upsert-size-chart.dto';

@Injectable()
export class SizeChartsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertSizeChartDto) {
    const dup = await this.prisma.garmentSizeChart.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Size chart "${dto.name}" already exists`);
    return this.prisma.garmentSizeChart.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { categoryType?: string; gender?: string; active?: boolean }) {
    return this.prisma.garmentSizeChart.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.categoryType && { categoryType: params.categoryType as any }),
        ...(params.gender && { gender: params.gender as any }),
        ...(params.active !== undefined && { isActive: params.active }),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const chart = await this.prisma.garmentSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!chart) throw new NotFoundException('Size chart not found');
    return chart;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertSizeChartDto) {
    const chart = await this.prisma.garmentSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!chart) throw new NotFoundException('Size chart not found');
    return this.prisma.garmentSizeChart.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const chart = await this.prisma.garmentSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!chart) throw new NotFoundException('Size chart not found');
    return this.prisma.garmentSizeChart.update({ where: { id }, data: { isActive: false } });
  }
}

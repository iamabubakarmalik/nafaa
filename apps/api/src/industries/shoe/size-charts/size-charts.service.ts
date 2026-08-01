import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateSizeChartDto } from './dto/create-chart.dto';

@Injectable()
export class ShoeSizeChartsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateSizeChartDto) {
    const dup = await this.prisma.shoeSizeChart.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (dup) throw new BadRequestException(`Chart "${dto.name}" already exists`);
    return this.prisma.shoeSizeChart.create({
      data: { tenantId: user.tenantId, ...dto, isActive: dto.isActive ?? true },
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

  async update(user: AuthenticatedUser, id: string, dto: Partial<CreateSizeChartDto>) {
    const c = await this.prisma.shoeSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Size chart not found');
    return this.prisma.shoeSizeChart.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.shoeSizeChart.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Size chart not found');
    return this.prisma.shoeSizeChart.delete({ where: { id } });
  }
}

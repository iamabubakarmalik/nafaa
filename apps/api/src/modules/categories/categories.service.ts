import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (exists) throw new ConflictException('Category already exists');

    return this.prisma.category.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        color: dto.color ?? '#2c9466',
        icon: dto.icon,
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    const categories = await this.prisma.category.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return categories;
  }

  async remove(user: AuthenticatedUser, id: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }
}

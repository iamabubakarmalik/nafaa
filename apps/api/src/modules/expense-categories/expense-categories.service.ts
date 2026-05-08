import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateExpenseCategoryDto) {
    const exists = await this.prisma.expenseCategory.findFirst({
      where: { tenantId: user.tenantId, name: dto.name },
    });
    if (exists) throw new ConflictException('Expense category already exists');

    return this.prisma.expenseCategory.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name,
        color: dto.color ?? '#f59e0b',
        icon: dto.icon,
      },
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.expenseCategory.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { expenses: true } },
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const cat = await this.prisma.expenseCategory.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    await this.prisma.expenseCategory.delete({ where: { id } });
    return { message: 'Expense category deleted successfully' };
  }
}

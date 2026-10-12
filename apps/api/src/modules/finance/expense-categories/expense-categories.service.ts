import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../auth/interfaces/jwt-payload.interface';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/create-expense-category.dto';

const clean = (name: string) => name.trim().replace(/\s+/g, ' ');

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws when another category of the tenant already has this name (case blind). */
  private async nameFree(tenantId: string, name: string, exceptId?: string) {
    const taken = await this.prisma.expenseCategory.findFirst({
      where: { tenantId, name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (taken) throw new ConflictException('Is naam ki category pehle se hai');
  }

  async create(user: AuthenticatedUser, dto: CreateExpenseCategoryDto) {
    const name = clean(dto.name);
    await this.nameFree(user.tenantId, name);
    return this.prisma.expenseCategory.create({
      data: { tenantId: user.tenantId, name, color: dto.color ?? '#f59e0b', icon: dto.icon },
    });
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.expenseCategory.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { expenses: true } } },
    });
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateExpenseCategoryDto) {
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true } });
    if (!cat) throw new NotFoundException('Category not found');
    const name = dto.name !== undefined ? clean(dto.name) : undefined;
    if (name) await this.nameFree(user.tenantId, name, id);
    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dto.color && { color: dto.color }),
        ...(dto.icon !== undefined && { icon: dto.icon || null }),
      },
      include: { _count: { select: { expenses: true } } },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const cat = await this.prisma.expenseCategory.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!cat) throw new NotFoundException('Category not found');

    // Expenses keep their amounts and move to "no category" (onDelete: SetNull).
    await this.prisma.expenseCategory.delete({ where: { id } });
    return { message: 'Expense category deleted successfully' };
  }
}

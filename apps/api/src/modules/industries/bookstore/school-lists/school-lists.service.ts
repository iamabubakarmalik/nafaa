import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';

@Injectable()
export class SchoolListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    const school = await this.prisma.school.findFirst({ where: { id: dto.schoolId, tenantId: user.tenantId } });
    if (!school) throw new NotFoundException('School not found');

    const items = (dto.items || []).map((it: any, i: number) => ({
      productId: it.productId,
      itemName: it.itemName,
      itemType: it.itemType || 'BOOK',
      quantity: it.quantity ?? 1,
      unit: it.unit || 'piece',
      unitPrice: it.unitPrice ?? 0,
      discount: it.discount ?? 0,
      total: ((it.unitPrice ?? 0) * (it.quantity ?? 1)) - (it.discount ?? 0),
      subject: it.subject,
      isRequired: it.isRequired ?? true,
      isOptional: it.isOptional ?? false,
      notes: it.notes,
      displayOrder: i,
    }));

    const totalItems = items.length;
    const bundlePrice = items.reduce((s: number, it: any) => s + it.total, 0);

    return this.prisma.schoolBookList.create({
      data: {
        tenantId: user.tenantId,
        schoolId: dto.schoolId,
        session: dto.session,
        grade: dto.grade,
        section: dto.section,
        medium: dto.medium,
        title: dto.title || `${dto.grade} - ${dto.session}`,
        description: dto.description,
        status: dto.status || 'DRAFT',
        discountPct: dto.discountPct ?? 0,
        bundlePrice: dto.bundlePrice ?? bundlePrice,
        totalItems,
        imageUrl: dto.imageUrl,
        items: { create: items },
      },
      include: { items: true, school: true },
    });
  }

  async list(user: AuthenticatedUser, params: any) {
    return this.prisma.schoolBookList.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.schoolId && { schoolId: params.schoolId }),
        ...(params.session && { session: params.session }),
        ...(params.grade && { grade: params.grade }),
        ...(params.status && { status: params.status }),
      },
      include: {
        school: true,
        items: { orderBy: { displayOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const list = await this.prisma.schoolBookList.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        school: true,
        items: { orderBy: { displayOrder: 'asc' } },
      },
    });
    if (!list) throw new NotFoundException('School list not found');
    return list;
  }

  async update(user: AuthenticatedUser, id: string, dto: any) {
    const list = await this.prisma.schoolBookList.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!list) throw new NotFoundException('School list not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.schoolBookListItem.deleteMany({ where: { listId: id } });
        const items = dto.items.map((it: any, i: number) => ({
          listId: id,
          productId: it.productId,
          itemName: it.itemName,
          itemType: it.itemType || 'BOOK',
          quantity: it.quantity ?? 1,
          unit: it.unit || 'piece',
          unitPrice: it.unitPrice ?? 0,
          discount: it.discount ?? 0,
          total: ((it.unitPrice ?? 0) * (it.quantity ?? 1)) - (it.discount ?? 0),
          subject: it.subject,
          isRequired: it.isRequired ?? true,
          isOptional: it.isOptional ?? false,
          notes: it.notes,
          displayOrder: i,
        }));
        if (items.length > 0) {
          await tx.schoolBookListItem.createMany({ data: items });
        }

        const totalItems = items.length;
        const bundlePrice = items.reduce((s: number, it: any) => s + it.total, 0);

        const { items: _drop, ...rest } = dto;

        return tx.schoolBookList.update({
          where: { id },
          data: { ...rest, totalItems, bundlePrice: dto.bundlePrice ?? bundlePrice },
          include: { school: true, items: { orderBy: { displayOrder: 'asc' } } },
        });
      }

      return tx.schoolBookList.update({
        where: { id },
        data: dto,
        include: { school: true, items: { orderBy: { displayOrder: 'asc' } } },
      });
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, status: string) {
    const list = await this.prisma.schoolBookList.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!list) throw new NotFoundException('School list not found');
    return this.prisma.schoolBookList.update({ where: { id }, data: { status: status as any } });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const list = await this.prisma.schoolBookList.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!list) throw new NotFoundException('School list not found');
    return this.prisma.schoolBookList.delete({ where: { id } });
  }

  async duplicate(user: AuthenticatedUser, id: string, newSession: string) {
    const list = await this.prisma.schoolBookList.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { items: true },
    });
    if (!list) throw new NotFoundException('School list not found');

    return this.prisma.schoolBookList.create({
      data: {
        tenantId: user.tenantId,
        schoolId: list.schoolId,
        session: newSession,
        grade: list.grade,
        section: list.section,
        medium: list.medium,
        title: `${list.title} (${newSession})`,
        description: list.description,
        status: 'DRAFT',
        discountPct: list.discountPct,
        bundlePrice: list.bundlePrice,
        totalItems: list.totalItems,
        imageUrl: list.imageUrl,
        items: {
          create: list.items.map((it) => ({
            productId: it.productId,
            itemName: it.itemName,
            itemType: it.itemType,
            quantity: it.quantity,
            unit: it.unit,
            unitPrice: it.unitPrice,
            discount: it.discount,
            total: it.total,
            subject: it.subject,
            isRequired: it.isRequired,
            isOptional: it.isOptional,
            notes: it.notes,
            displayOrder: it.displayOrder,
          })),
        },
      },
      include: { school: true, items: true },
    });
  }
}

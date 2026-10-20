import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { cleanInput } from '../bookstore-common';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';

@Injectable()
export class ReadingListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: any) {
    return this.prisma.customerReadingList.create({
      data: { ...cleanInput(dto), tenantId: user.tenantId },
    });
  }

  async listByCustomer(user: AuthenticatedUser, customerId: string) {
    return this.prisma.customerReadingList.findMany({
      where: { tenantId: user.tenantId, customerId },
      include: { items: true },
    });
  }

  async addItem(user: AuthenticatedUser, listId: string, dto: any) {
    const list = await this.prisma.customerReadingList.findFirst({ where: { id: listId, tenantId: user.tenantId } });
    if (!list) throw new NotFoundException('Reading list nahi mili');

    const item = await this.prisma.customerReadingListItem.upsert({
      where: { listId_productId: { listId, productId: dto.productId } },
      create: { ...cleanInput(dto), listId },
      update: { ...cleanInput(dto), listId },
    });

    const total = await this.prisma.customerReadingListItem.count({ where: { listId } });
    await this.prisma.customerReadingList.update({ where: { id: listId }, data: { totalItems: total } });

    return item;
  }

  async removeItem(user: AuthenticatedUser, listId: string, itemId: string) {
    const list = await this.prisma.customerReadingList.findFirst({ where: { id: listId, tenantId: user.tenantId }, select: { id: true } });
    if (!list) throw new NotFoundException('Reading list nahi mili');
    const item = await this.prisma.customerReadingListItem.findFirst({ where: { id: itemId, listId }, select: { id: true } });
    if (!item) throw new NotFoundException('Item nahi mila');
    await this.prisma.customerReadingListItem.delete({ where: { id: itemId } });
    const total = await this.prisma.customerReadingListItem.count({ where: { listId } });
    return this.prisma.customerReadingList.update({ where: { id: listId }, data: { totalItems: total } });
  }

  async markAsRead(user: AuthenticatedUser, itemId: string) {
    const item = await this.prisma.customerReadingListItem.findFirst({ where: { id: itemId, list: { tenantId: user.tenantId } }, select: { id: true } });
    if (!item) throw new NotFoundException('Item nahi mila');
    return this.prisma.customerReadingListItem.update({
      where: { id: itemId },
      data: { isRead: true, readAt: new Date() },
    });
  }
}

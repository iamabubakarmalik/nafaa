import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpsertNoteDto } from './dto/upsert-note.dto';

@Injectable()
export class AdminNotesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.tenantNote.findMany({
      where: { tenantId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  create(authorId: string, dto: UpsertNoteDto) {
    return this.prisma.tenantNote.create({
      data: {
        tenantId: dto.tenantId,
        authorId,
        title: dto.title,
        content: dto.content,
        isPinned: dto.isPinned ?? false,
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async update(id: string, dto: Partial<UpsertNoteDto>) {
    const note = await this.prisma.tenantNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');

    return this.prisma.tenantNote.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        isPinned: dto.isPinned,
      },
      include: {
        author: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(id: string) {
    const note = await this.prisma.tenantNote.findUnique({ where: { id } });
    if (!note) throw new NotFoundException('Note not found');

    await this.prisma.tenantNote.delete({ where: { id } });
    return { message: 'Note deleted' };
  }
}

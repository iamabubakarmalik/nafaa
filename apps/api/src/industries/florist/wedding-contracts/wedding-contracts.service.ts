import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../modules/auth/interfaces/jwt-payload.interface';
import { CreateWeddingContractDto, RecordWeddingPaymentDto, UpdateContractStatusDto } from './dto/create-contract.dto';

@Injectable()
export class WeddingContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateWeddingContractDto) {
    const count = await this.prisma.floristWeddingContract.count({ where: { tenantId: user.tenantId } });
    const year = new Date().getFullYear();
    const contractNumber = `WED-${year}-${String(count + 1).padStart(4, '0')}`;
    const advance = dto.advanceAmount ?? 0;
    const balance = dto.quotedAmount - advance;

    return this.prisma.floristWeddingContract.create({
      data: {
        tenantId: user.tenantId,
        contractNumber,
        ...dto,
        weddingDate: new Date(dto.weddingDate),
        siteVisitDate: dto.siteVisitDate ? new Date(dto.siteVisitDate) : null,
        setupStartTime: dto.setupStartTime ? new Date(dto.setupStartTime) : null,
        advanceAmount: advance,
        balanceAmount: balance,
        colorTheme: dto.colorTheme ?? [],
        primaryFlowers: dto.primaryFlowers ?? [],
        moodBoardUrls: dto.moodBoardUrls ?? [],
        handledById: user.id,
        status: 'QUOTED',
      },
    });
  }

  async list(user: AuthenticatedUser, params: { status?: string; upcoming?: boolean; search?: string }) {
    return this.prisma.floristWeddingContract.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.status && { status: params.status }),
        ...(params.upcoming && { weddingDate: { gte: new Date() } }),
        ...(params.search && {
          OR: [
            { contractNumber: { contains: params.search, mode: 'insensitive' } },
            { brideName: { contains: params.search, mode: 'insensitive' } },
            { groomName: { contains: params.search, mode: 'insensitive' } },
            { contactPerson: { contains: params.search, mode: 'insensitive' } },
            { contactPhone: { contains: params.search } },
          ],
        }),
      },
      orderBy: { weddingDate: 'asc' },
      take: 200,
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    return c;
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateContractStatusDto) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    const patch: any = { status: dto.status };
    if (dto.status === 'CONFIRMED' && !c.confirmedAt) patch.confirmedAt = new Date();
    if (dto.notes) patch.internalNotes = ((c.internalNotes || '') + '\n' + dto.notes).trim();
    return this.prisma.floristWeddingContract.update({ where: { id }, data: patch });
  }

  async update(user: AuthenticatedUser, id: string, dto: Partial<CreateWeddingContractDto>) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    const patch: any = { ...dto };
    if (dto.weddingDate) patch.weddingDate = new Date(dto.weddingDate);
    if (dto.siteVisitDate) patch.siteVisitDate = new Date(dto.siteVisitDate);
    if (dto.setupStartTime) patch.setupStartTime = new Date(dto.setupStartTime);
    if (dto.quotedAmount !== undefined) {
      patch.balanceAmount = dto.quotedAmount - Number(c.advanceAmount || 0);
    }
    return this.prisma.floristWeddingContract.update({ where: { id }, data: patch });
  }

  async recordPayment(user: AuthenticatedUser, id: string, dto: RecordWeddingPaymentDto) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive');
    const newAdvance = Number(c.advanceAmount || 0) + dto.amount;
    const newBalance = Math.max(Number(c.quotedAmount || 0) - newAdvance, 0);
    return this.prisma.floristWeddingContract.update({
      where: { id },
      data: {
        advanceAmount: newAdvance,
        balanceAmount: newBalance,
        internalNotes: dto.notes ? ((c.internalNotes || '') + '\nPayment: ' + dto.notes).trim() : undefined,
      },
    });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const c = await this.prisma.floristWeddingContract.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!c) throw new NotFoundException('Contract not found');
    return this.prisma.floristWeddingContract.delete({ where: { id } });
  }

  async upcomingWeddings(user: AuthenticatedUser, days = 30) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    return this.prisma.floristWeddingContract.findMany({
      where: {
        tenantId: user.tenantId,
        weddingDate: { gte: now, lte: future },
        status: { in: ['QUOTED', 'CONFIRMED'] },
      },
      orderBy: { weddingDate: 'asc' },
    });
  }
}

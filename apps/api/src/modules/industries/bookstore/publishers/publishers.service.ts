import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuthenticatedUser } from '../../../auth/interfaces/jwt-payload.interface';
import { UpsertPublisherDto } from './dto/upsert-publisher.dto';

@Injectable()
export class PublishersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: UpsertPublisherDto) {
    const dup = await this.prisma.publisher.findFirst({ where: { tenantId: user.tenantId, name: dto.name } });
    if (dup) throw new BadRequestException(`Publisher "${dto.name}" exists`);
    return this.prisma.publisher.create({ data: { tenantId: user.tenantId, ...dto } });
  }

  async list(user: AuthenticatedUser, params: { search?: string; active?: boolean; country?: string }) {
    return this.prisma.publisher.findMany({
      where: {
        tenantId: user.tenantId,
        ...(params.active !== undefined && { isActive: params.active }),
        ...(params.country && { country: params.country }),
        ...(params.search && {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { code: { contains: params.search, mode: 'insensitive' } },
            { city: { contains: params.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: { _count: { select: { books: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getOne(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.publisher.findFirst({
      where: { id, tenantId: user.tenantId },
      include: { books: { take: 50, orderBy: { updatedAt: 'desc' } } },
    });
    if (!p) throw new NotFoundException('Publisher not found');
    return p;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpsertPublisherDto) {
    const p = await this.prisma.publisher.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Publisher not found');
    return this.prisma.publisher.update({ where: { id }, data: dto });
  }

  async remove(user: AuthenticatedUser, id: string) {
    const p = await this.prisma.publisher.findFirst({ where: { id, tenantId: user.tenantId } });
    if (!p) throw new NotFoundException('Publisher not found');
    return this.prisma.publisher.update({ where: { id }, data: { isActive: false } });
  }

  async seedPakistaniPublishers(user: AuthenticatedUser) {
    const publishers = [
      { name: 'Oxford University Press Pakistan', country: 'Pakistan', city: 'Karachi' },
      { name: 'Ferozsons', country: 'Pakistan', city: 'Lahore' },
      { name: 'Sang-e-Meel Publications', country: 'Pakistan', city: 'Lahore' },
      { name: 'Ilmi Kutab Khana', country: 'Pakistan', city: 'Lahore' },
      { name: 'Maktaba-tul-Madina', country: 'Pakistan', city: 'Karachi' },
      { name: 'Dar-us-Salam', country: 'Pakistan', city: 'Riyadh' },
      { name: 'Idara Islamiat', country: 'Pakistan', city: 'Lahore' },
      { name: 'Feroz Sons Publishers', country: 'Pakistan', city: 'Lahore' },
      { name: 'Punjab Textbook Board', country: 'Pakistan', city: 'Lahore' },
      { name: 'Sindh Textbook Board', country: 'Pakistan', city: 'Jamshoro' },
      { name: 'KPK Textbook Board', country: 'Pakistan', city: 'Peshawar' },
      { name: 'Federal Board', country: 'Pakistan', city: 'Islamabad' },
      { name: 'Paramount Books', country: 'Pakistan', city: 'Karachi' },
      { name: 'Mavra Publishers', country: 'Pakistan', city: 'Karachi' },
      { name: 'Readings', country: 'Pakistan', city: 'Lahore' },
      { name: 'National Book Foundation', country: 'Pakistan', city: 'Islamabad' },
      { name: 'Cambridge University Press', country: 'UK', city: 'Cambridge' },
      { name: 'Pearson Education', country: 'UK', city: 'London' },
      { name: 'McGraw-Hill', country: 'USA', city: 'New York' },
      { name: 'Penguin Random House', country: 'USA', city: 'New York' },
      { name: 'HarperCollins', country: 'USA', city: 'New York' },
      { name: 'Scholastic', country: 'USA', city: 'New York' },
      { name: 'Wiley', country: 'USA', city: 'New Jersey' },
      { name: 'Springer', country: 'Germany', city: 'Berlin' },
    ];
    let count = 0;
    for (const p of publishers) {
      const exists = await this.prisma.publisher.findFirst({ where: { tenantId: user.tenantId, name: p.name } });
      if (!exists) {
        await this.prisma.publisher.create({ data: { tenantId: user.tenantId, ...p } });
        count++;
      }
    }
    return { created: count, total: publishers.length };
  }
}

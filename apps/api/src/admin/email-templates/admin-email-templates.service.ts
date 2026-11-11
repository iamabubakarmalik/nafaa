import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertEmailTemplateDto } from './dto/upsert-template.dto';

@Injectable()
export class AdminEmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Without `paged` this returns every template (old behavior). With it, one searched page plus counts. */
  async list(q: { paged?: boolean; page?: number; limit?: number; search?: string; active?: string } = {}) {
    if (!q.paged) return this.prisma.emailTemplate.findMany({ orderBy: { name: 'asc' } });
    const limit = Math.min(100, Math.max(1, q.limit ?? 25));
    const page = Math.max(1, q.page ?? 1);
    const term = q.search?.trim();
    const where = {
      ...(q.active === 'yes' ? { isActive: true } : q.active === 'no' ? { isActive: false } : {}),
      ...(term ? { OR: [{ name: { contains: term, mode: 'insensitive' as const } }, { slug: { contains: term, mode: 'insensitive' as const } }, { subject: { contains: term, mode: 'insensitive' as const } }] } : {}),
    };
    const [items, total, all, active] = await Promise.all([
      this.prisma.emailTemplate.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.emailTemplate.count({ where }),
      this.prisma.emailTemplate.count(),
      this.prisma.emailTemplate.count({ where: { isActive: true } }),
    ]);
    return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, stats: { total: all, active, inactive: all - active } };
  }

  async getOne(id: string) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async create(dto: UpsertEmailTemplateDto) {
    const exists = await this.prisma.emailTemplate.findUnique({
      where: { slug: dto.slug },
    });
    if (exists) throw new ConflictException('Slug already exists');

    return this.prisma.emailTemplate.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText,
        variables: dto.variables ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: Partial<UpsertEmailTemplateDto>) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');

    return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText,
        variables: dto.variables,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template not found');

    await this.prisma.emailTemplate.delete({ where: { id } });
    return { message: 'Template deleted' };
  }

  async seedDefaults() {
    const existing = await this.prisma.emailTemplate.count();
    if (existing > 0) return { skipped: true };

    const templates = [
      {
        slug: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to Nafaa! 🎉',
        bodyHtml: '<h1>Welcome {{name}}!</h1><p>Aap ka account ban gaya hai. Ab apni dukan online manage karein.</p>',
        bodyText: 'Welcome {{name}}! Aap ka account ban gaya hai.',
      },
      {
        slug: 'payment-approved',
        name: 'Payment Approved',
        subject: 'Payment Approved ✅',
        bodyHtml: '<p>Aap ka Rs {{amount}} payment approve ho gaya hai.</p>',
        bodyText: 'Payment Rs {{amount}} approved.',
      },
      {
        slug: 'payment-rejected',
        name: 'Payment Rejected',
        subject: 'Payment Rejected ❌',
        bodyHtml: '<p>Aap ka payment reject ho gaya. Reason: {{reason}}</p>',
        bodyText: 'Payment rejected. Reason: {{reason}}',
      },
      {
        slug: 'subscription-expiring',
        name: 'Subscription Expiring',
        subject: 'Your subscription expires soon ⏰',
        bodyHtml: '<p>{{days}} din mein aap ki subscription expire ho jayegi.</p>',
        bodyText: '{{days}} din mein subscription expire.',
      },
      {
        slug: 'low-stock-alert',
        name: 'Low Stock Alert',
        subject: 'Low Stock Warning ⚠️',
        bodyHtml: '<p>{{productName}} ka stock kam ho raha hai.</p>',
        bodyText: '{{productName}} low stock.',
      },
    ];

    await this.prisma.emailTemplate.createMany({ data: templates });
    return { seeded: templates.length };
  }
}

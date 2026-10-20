/**
 * Real customers and their testimonials (API-CONTRACT 8.8, ARCH 5.6).
 *
 * Nothing about a customer reaches the site without recorded consent:
 * - a customer becomes public only with a consent date, evidence and scope;
 * - logos need LOGO, quotes need QUOTE (and the customer public), photos
 *   need PHOTO, a named business needs NAME, case studies need CASE_STUDY.
 * The public read API checks the same rules again on every read, so taking
 * consent away hides the content at once.
 */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CmsStatus, Prisma, type CmsCustomer, type CmsTestimonial } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_LOCALE,
  cacheTags,
  type AdminCustomer,
  type AdminTestimonial,
  type ConsentScope,
  type CreateCustomerBody,
  type CreateTestimonialBody,
  type CustomerConsentBody,
  type Paginated,
  type PatchCustomerBody,
  type PatchTestimonialBody,
  type TestimonialSourceType,
} from '../contract/cms-contract';
import { slugCandidate, slugify } from '../paths/cms-paths';
import { checksFailed, iso } from '../public/cms-http';
import { PUBLIC_MEDIA_SELECT, toPublicMedia } from '../public/cms-media-view';
import { CmsSiteEvents } from '../public/cms-site-events.service';
import { LIVE_WHERE } from '../public/cms-snapshot';
import { paginated, parsePagination } from '../../_shared/helpers/pagination.helper';

const CUSTOMER_INCLUDE = {
  logo: { select: PUBLIC_MEDIA_SELECT },
  _count: { select: { testimonials: true } },
} satisfies Prisma.CmsCustomerInclude;
type CustomerRow = Prisma.CmsCustomerGetPayload<{ include: typeof CUSTOMER_INCLUDE }>;

const TESTIMONIAL_INCLUDE = {
  photo: { select: PUBLIC_MEDIA_SELECT },
  customer: { select: { id: true, name: true, isPublic: true, consentScope: true } },
} satisfies Prisma.CmsTestimonialInclude;
type TestimonialRow = Prisma.CmsTestimonialGetPayload<{ include: typeof TESTIMONIAL_INCLUDE }>;

/** True when the customer has recorded consent for `scope`. */
export function hasConsent(customer: Pick<CmsCustomer, 'consentScope' | 'consentAt'>, scope: ConsentScope): boolean {
  return customer.consentAt !== null && customer.consentScope.includes(scope);
}

export interface CustomersQuery {
  q?: string | undefined;
  public?: boolean | undefined;
  page: number;
  limit: number;
}

export interface TestimonialsQuery {
  customerId?: string | undefined;
  status?: CmsStatus | undefined;
  page: number;
  limit: number;
}

@Injectable()
export class CmsCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: CmsSiteEvents,
  ) {}

  // ─── Customers ───

  private toAdminCustomer(row: CustomerRow): AdminCustomer {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoId: row.logoId,
      logo: row.logo ? toPublicMedia(row.logo) : null,
      cityEntryId: row.cityEntryId,
      industryEntryId: row.industryEntryId,
      website: row.website,
      tenantId: row.tenantId,
      consentScope: row.consentScope as ConsentScope[],
      consentAt: iso(row.consentAt),
      consentEvidence: row.consentEvidence,
      verifiedById: row.verifiedById,
      verifiedAt: iso(row.verifiedAt),
      isPublic: row.isPublic,
      sortOrder: row.sortOrder,
      notes: row.notes,
      createdById: row.createdById,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      testimonialsCount: row._count.testimonials,
    };
  }

  private async customerOrThrow(id: string): Promise<CustomerRow> {
    const row = await this.prisma.cmsCustomer.findUnique({ where: { id }, include: CUSTOMER_INCLUDE });
    if (!row) throw new NotFoundException('Customer nahi mila');
    return row;
  }

  /** Checks ids a customer points at; throws 422 with the field that is wrong. */
  private async checkCustomerRefs(body: PatchCustomerBody): Promise<void> {
    const problems: { field: string; message: string }[] = [];
    if (body.logoId) {
      const media = await this.prisma.cmsMedia.findFirst({ where: { id: body.logoId, deletedAt: null }, select: { id: true } });
      if (!media) problems.push({ field: 'logoId', message: 'Logo media library me nahi mila' });
    }
    for (const [field, type] of [['cityEntryId', 'CITY'], ['industryEntryId', 'INDUSTRY']] as const) {
      const id = body[field];
      if (!id) continue;
      const entry = await this.prisma.cmsEntry.findUnique({ where: { id }, select: { type: true } });
      if (!entry || entry.type !== type) problems.push({ field, message: `${type === 'CITY' ? 'City' : 'Industry'} entry nahi mili` });
    }
    if (problems.length > 0) {
      throw checksFailed(problems.map((p) => ({ code: 'MISSING_DATA' as const, severity: 'error' as const, field: p.field, message: p.message })), 'Customer data theek nahi');
    }
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    const root = slugify(base) || 'customer';
    for (let attempt = 1; attempt < 200; attempt++) {
      const slug = slugCandidate(root, attempt);
      const taken = await this.prisma.cmsCustomer.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
      if (!taken) return slug;
    }
    return `${root}-${Date.now().toString(36)}`;
  }

  async listCustomers(query: CustomersQuery): Promise<Paginated<AdminCustomer>> {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.CmsCustomerWhereInput = {};
    if (query.public !== undefined) where.isPublic = query.public;
    if (query.q) where.OR = [{ name: { contains: query.q, mode: 'insensitive' } }, { slug: { contains: query.q, mode: 'insensitive' } }];
    const [rows, total] = await Promise.all([
      this.prisma.cmsCustomer.findMany({ where, include: CUSTOMER_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], skip, take: limit }),
      this.prisma.cmsCustomer.count({ where }),
    ]);
    return paginated(rows.map((r) => this.toAdminCustomer(r)), total, page, limit);
  }

  async getCustomer(id: string): Promise<AdminCustomer> {
    return this.toAdminCustomer(await this.customerOrThrow(id));
  }

  async createCustomer(body: CreateCustomerBody, userId: string | null): Promise<AdminCustomer> {
    await this.checkCustomerRefs(body);
    const slug = body.slug
      ? (await this.prisma.cmsCustomer.findUnique({ where: { slug: body.slug }, select: { id: true } }))
        ? await this.uniqueSlug(body.slug)
        : body.slug
      : await this.uniqueSlug(body.name);
    const row = await this.prisma.cmsCustomer.create({
      data: {
        name: body.name,
        slug,
        logoId: body.logoId ?? null,
        cityEntryId: body.cityEntryId ?? null,
        industryEntryId: body.industryEntryId ?? null,
        website: body.website ?? null,
        tenantId: body.tenantId ?? null,
        notes: body.notes ?? null,
        createdById: userId,
      },
      include: CUSTOMER_INCLUDE,
    });
    return this.toAdminCustomer(row);
  }

  async updateCustomer(id: string, body: PatchCustomerBody): Promise<AdminCustomer> {
    const current = await this.customerOrThrow(id);
    await this.checkCustomerRefs(body);
    if (body.slug && body.slug !== current.slug) {
      const taken = await this.prisma.cmsCustomer.findFirst({ where: { slug: body.slug, id: { not: id } }, select: { id: true } });
      if (taken) throw new ConflictException('Yeh slug kisi aur customer ka hai');
    }
    const row = await this.prisma.cmsCustomer.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.logoId !== undefined ? { logoId: body.logoId } : {}),
        ...(body.cityEntryId !== undefined ? { cityEntryId: body.cityEntryId } : {}),
        ...(body.industryEntryId !== undefined ? { industryEntryId: body.industryEntryId } : {}),
        ...(body.website !== undefined ? { website: body.website } : {}),
        ...(body.tenantId !== undefined ? { tenantId: body.tenantId } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: CUSTOMER_INCLUDE,
    });
    if (row.isPublic) await this.events.changed({ tags: [cacheTags.customers], reason: 'customers' });
    return this.toAdminCustomer(row);
  }

  async setConsent(id: string, body: CustomerConsentBody, userId: string | null): Promise<AdminCustomer> {
    await this.customerOrThrow(id);
    const row = await this.prisma.cmsCustomer.update({
      where: { id },
      data: {
        consentScope: body.scope,
        consentAt: new Date(body.consentAt),
        consentEvidence: body.evidence,
        verifiedById: userId,
        verifiedAt: new Date(),
      },
      include: CUSTOMER_INCLUDE,
    });
    if (row.isPublic) await this.events.changed({ tags: [cacheTags.customers], reason: 'customers' });
    return this.toAdminCustomer(row);
  }

  async setVisibility(id: string, isPublic: boolean): Promise<AdminCustomer & { revalidation: { ok: boolean; error?: string } }> {
    const current = await this.customerOrThrow(id);
    if (isPublic && (!current.consentAt || current.consentScope.length === 0 || !current.consentEvidence)) {
      throw checksFailed(
        [{ code: 'NO_CONSENT', severity: 'error', field: 'consentScope', message: 'Pehle customer ki ijazat (consent) darj karein: scope, tareekh aur saboot' }],
        'Consent missing',
      );
    }
    const row = await this.prisma.cmsCustomer.update({ where: { id }, data: { isPublic }, include: CUSTOMER_INCLUDE });
    const revalidation = await this.events.changed({ tags: [cacheTags.customers], reason: 'customers' });
    return { ...this.toAdminCustomer(row), revalidation };
  }

  async removeCustomer(id: string): Promise<void> {
    const current = await this.customerOrThrow(id);
    const caseStudies = await this.prisma.cmsEntry.findMany({
      where: { ...LIVE_WHERE, type: 'CASE_STUDY' },
      select: { title: true, published: true, data: true },
    });
    const usedBy = caseStudies.filter((e) => {
      const snap = e.published as { data?: { customerId?: unknown } } | null;
      const data = (snap?.data ?? e.data) as { customerId?: unknown } | null;
      return data?.customerId === id;
    });
    if (usedBy.length > 0) {
      throw new ConflictException(`Yeh customer live case study "${usedBy[0]?.title}" me hai. Pehle usay unpublish karein.`);
    }
    await this.prisma.cmsCustomer.delete({ where: { id } });
    if (current.isPublic) await this.events.changed({ tags: [cacheTags.customers], reason: 'customers' });
  }

  // ─── Testimonials ───

  private toAdminTestimonial(row: TestimonialRow): AdminTestimonial {
    return {
      id: row.id,
      customerId: row.customerId,
      locale: row.locale,
      personName: row.personName,
      personRole: row.personRole,
      quote: row.quote,
      photoId: row.photoId,
      photo: row.photo ? toPublicMedia(row.photo) : null,
      sourceType: row.sourceType as TestimonialSourceType,
      sourceUrl: row.sourceUrl,
      collectedAt: iso(row.collectedAt),
      status: row.status,
      sortOrder: row.sortOrder,
      createdById: row.createdById,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      customer: {
        id: row.customer.id,
        name: row.customer.name,
        isPublic: row.customer.isPublic,
        consentScope: row.customer.consentScope as ConsentScope[],
      },
    };
  }

  private async testimonialOrThrow(id: string): Promise<TestimonialRow> {
    const row = await this.prisma.cmsTestimonial.findUnique({ where: { id }, include: TESTIMONIAL_INCLUDE });
    if (!row) throw new NotFoundException('Testimonial nahi mila');
    return row;
  }

  private async checkTestimonialRefs(body: PatchTestimonialBody): Promise<void> {
    if (body.customerId) {
      const c = await this.prisma.cmsCustomer.findUnique({ where: { id: body.customerId }, select: { id: true } });
      if (!c) throw new NotFoundException('Customer nahi mila');
    }
    if (body.photoId) {
      const m = await this.prisma.cmsMedia.findFirst({ where: { id: body.photoId, deletedAt: null }, select: { id: true } });
      if (!m) throw checksFailed([{ code: 'MISSING_DATA', severity: 'error', field: 'photoId', message: 'Photo media library me nahi mili' }], 'Testimonial data theek nahi');
    }
  }

  async listTestimonials(query: TestimonialsQuery): Promise<Paginated<AdminTestimonial>> {
    const { page, limit, skip } = parsePagination(query);
    const where: Prisma.CmsTestimonialWhereInput = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;
    const [rows, total] = await Promise.all([
      this.prisma.cmsTestimonial.findMany({ where, include: TESTIMONIAL_INCLUDE, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], skip, take: limit }),
      this.prisma.cmsTestimonial.count({ where }),
    ]);
    return paginated(rows.map((r) => this.toAdminTestimonial(r)), total, page, limit);
  }

  async createTestimonial(body: CreateTestimonialBody, userId: string | null): Promise<AdminTestimonial> {
    await this.checkTestimonialRefs(body);
    const row = await this.prisma.cmsTestimonial.create({
      data: {
        customerId: body.customerId,
        locale: body.locale ?? DEFAULT_LOCALE,
        personName: body.personName,
        personRole: body.personRole ?? null,
        quote: body.quote,
        photoId: body.photoId ?? null,
        sourceType: body.sourceType,
        sourceUrl: body.sourceUrl ?? null,
        collectedAt: body.collectedAt ? new Date(body.collectedAt) : null,
        createdById: userId,
      },
      include: TESTIMONIAL_INCLUDE,
    });
    return this.toAdminTestimonial(row);
  }

  async updateTestimonial(id: string, body: PatchTestimonialBody): Promise<AdminTestimonial> {
    const current = await this.testimonialOrThrow(id);
    await this.checkTestimonialRefs(body);
    const row = await this.prisma.cmsTestimonial.update({
      where: { id },
      data: {
        ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
        ...(body.locale !== undefined ? { locale: body.locale } : {}),
        ...(body.personName !== undefined ? { personName: body.personName } : {}),
        ...(body.personRole !== undefined ? { personRole: body.personRole } : {}),
        ...(body.quote !== undefined ? { quote: body.quote } : {}),
        ...(body.photoId !== undefined ? { photoId: body.photoId } : {}),
        ...(body.sourceType !== undefined ? { sourceType: body.sourceType } : {}),
        ...(body.sourceUrl !== undefined ? { sourceUrl: body.sourceUrl } : {}),
        ...(body.collectedAt !== undefined ? { collectedAt: body.collectedAt ? new Date(body.collectedAt) : null } : {}),
        // A live quote that changes customer must pass the consent check again.
        ...(current.status === CmsStatus.PUBLISHED && body.customerId && body.customerId !== current.customerId ? { status: CmsStatus.DRAFT } : {}),
      },
      include: TESTIMONIAL_INCLUDE,
    });
    if (current.status === CmsStatus.PUBLISHED) await this.events.changed({ tags: [cacheTags.customers], reason: 'customers' });
    return this.toAdminTestimonial(row);
  }

  async publishTestimonial(id: string): Promise<AdminTestimonial & { revalidation: { ok: boolean; error?: string } }> {
    const current = await this.testimonialOrThrow(id);
    const customer = await this.prisma.cmsCustomer.findUnique({ where: { id: current.customerId } });
    if (!customer || !customer.isPublic || !hasConsent(customer, 'QUOTE')) {
      throw checksFailed(
        [{
          code: 'NO_CONSENT',
          severity: 'error',
          field: 'customerId',
          message: !customer?.isPublic
            ? 'Customer public nahi. Pehle consent darj karke customer ko public karein.'
            : 'Customer ki QUOTE consent darj nahi, quote publish nahi ho sakta.',
        }],
        'Consent missing',
      );
    }
    const row = await this.prisma.cmsTestimonial.update({ where: { id }, data: { status: CmsStatus.PUBLISHED }, include: TESTIMONIAL_INCLUDE });
    const revalidation = await this.events.changed({ tags: [cacheTags.customers], reason: 'customers' });
    return { ...this.toAdminTestimonial(row), revalidation };
  }

  async unpublishTestimonial(id: string): Promise<AdminTestimonial> {
    await this.testimonialOrThrow(id);
    const row = await this.prisma.cmsTestimonial.update({ where: { id }, data: { status: CmsStatus.DRAFT }, include: TESTIMONIAL_INCLUDE });
    await this.events.changed({ tags: [cacheTags.customers], reason: 'customers' });
    return this.toAdminTestimonial(row);
  }

  async removeTestimonial(id: string): Promise<void> {
    const current: CmsTestimonial = await this.testimonialOrThrow(id);
    await this.prisma.cmsTestimonial.delete({ where: { id } });
    if (current.status === CmsStatus.PUBLISHED) await this.events.changed({ tags: [cacheTags.customers], reason: 'customers' });
  }
}

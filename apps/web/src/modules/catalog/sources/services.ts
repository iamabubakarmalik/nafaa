/**
 * Catalog data sources for service businesses: clinic services, gym plans,
 * trainers and classes, and services-biz jobs. They show rates and durations
 * the same way products show prices; stock does not apply.
 */

import { formatPKR } from '@core/lib/format';
import { clinicServicesApi, type ClinicService } from '@industries/clinic/api/services.api';
import { SERVICE_CATEGORIES } from '@industries/clinic/api/constants';
import { membershipPlansApi, type MembershipPlan, type PlanType } from '@industries/gym/api/membership-plans.api';
import { trainersApi, type Trainer } from '@industries/gym/api/trainers.api';
import { classesApi, type GymClass } from '@industries/gym/api/classes.api';
import { catalogApi as servicesCatalogApi, type ChargeType, type ServiceCatalogItem } from '@industries/services-biz/api/catalog.api';
import type { CatalogEntry, CatalogSource } from '../types';
import { pretty, specs } from './products';

const mins = (n?: number | null) => (!n ? null : n >= 60 ? `${Math.floor(n / 60)} ghanta${n % 60 ? ` ${n % 60} min` : ''}` : `${n} min`);

export const clinicSource: CatalogSource = {
  key: 'clinic',
  load: async () => {
    const list = await clinicServicesApi.list({ active: true });
    return (Array.isArray(list) ? list : []).filter((s) => s.isActive !== false).map((s: ClinicService): CatalogEntry => {
      const p = s.product ?? {};
      const cat = SERVICE_CATEGORIES.find((c) => c.value === s.category);
      const base = Number(s.basePrice || p.price || 0);
      const discounted = s.isDiscounted && Number(s.discountedPrice) > 0 && Number(s.discountedPrice) < base;
      const images = [...(p.images ?? []).map((i: { url: string }) => i.url), ...(s.imageUrls ?? [])].filter(Boolean);
      return {
        id: s.id, productId: s.productId, name: p.name || 'Service',
        price: discounted ? Number(s.discountedPrice) : base, oldPrice: discounted ? base : null,
        per: mins(s.durationMin) ?? undefined,
        priceTiers: [
          { label: 'Dobara check-up', price: Number(s.followUpPrice ?? 0) }, { label: 'Emergency', price: Number(s.emergencyPrice ?? 0) },
          { label: 'Online (video)', price: Number(s.telemedicinePrice ?? 0) }, { label: 'Ghar par', price: Number(s.homeVisitPrice ?? 0) },
        ].filter((t) => t.price > 0),
        image: images[0] ?? null, images, emoji: cat?.emoji ?? '🩺',
        description: s.descriptionLong || p.description || null,
        category: cat ? { id: cat.value, name: cat.label } : null,
        featured: s.isFeatured, inStock: null,
        badges: [
          ...(s.isPopular ? [{ label: 'Mashhoor', tone: 'pink' as const }] : []),
          ...(discounted ? [{ label: 'Discount', tone: 'red' as const }] : []),
        ],
        chips: [
          ...(s.durationMin ? [{ label: mins(s.durationMin)!, tone: 'slate' as const }] : []),
          ...(s.requiresAppointment ? [{ label: 'Appointment', tone: 'blue' as const }] : []),
          ...(s.requiresFasting ? [{ label: 'Khali pait', tone: 'amber' as const }] : []),
        ],
        specs: specs([
          ['Code', s.serviceCode], ['Waqt', mins(s.durationMin)], ['Doctor', s.requiresDoctor ? 'Doctor dekhenge' : null],
          ['Pehle kya karein', s.prepInstructions || s.requiresPrepInstructions], ['Baad me', s.postCareInstructions],
        ]),
        includes: s.packageIncludes,
        facets: { ...(s.isPopular ? { tag: 'popular' } : {}), ...(discounted ? { offer: 'yes' } : {}) },
        keywords: [s.serviceCode, s.subcategory].filter(Boolean).join(' '),
      };
    });
  },
};

export const PLAN_LABELS: Record<PlanType, string> = {
  DAILY: 'Ek din', WEEKLY: 'Hafta', MONTHLY: 'Mahina', QUARTERLY: '3 mahine', HALF_YEARLY: '6 mahine',
  YEARLY: 'Saal', LIFETIME: 'Hamesha', PAY_PER_VISIT: 'Har visit', CUSTOM: 'Khaas',
};
const PLAN_EMOJI: Partial<Record<PlanType, string>> = { DAILY: '☀️', WEEKLY: '📅', MONTHLY: '🗓️', QUARTERLY: '💪', HALF_YEARLY: '🏋️', YEARLY: '🏆', LIFETIME: '👑' };
const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export const gymPlansSource: CatalogSource = {
  key: 'gym-plans',
  load: async () => {
    const plans = await membershipPlansApi.list({ active: true });
    return (Array.isArray(plans) ? plans : []).filter((p) => p.isActive !== false)
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((p: MembershipPlan): CatalogEntry => ({
        id: p.id, name: p.name, price: p.price,
        per: p.planType === 'PAY_PER_VISIT' ? 'visit' : `${p.durationDays} din`,
        image: p.imageUrl ?? null, emoji: PLAN_EMOJI[p.planType] ?? '⭐', description: p.description ?? null,
        category: { id: p.planType, name: PLAN_LABELS[p.planType] ?? pretty(p.planType) },
        featured: p.isFeatured, inStock: null,
        chips: [
          { label: p.isUnlimited ? 'Jitni dafa chahein' : `${p.visitLimit ?? 0} visits`, tone: 'blue' },
          ...(p.includesPersonalTraining ? [{ label: `${p.personalTrainingSessions} PT`, tone: 'violet' as const }] : []),
        ],
        specs: specs([
          ['Muddat', `${p.durationDays} din`],
          ['Waqt', p.accessAllHours ? '24 ghante' : p.accessTimeStart && p.accessTimeEnd ? `${p.accessTimeStart} – ${p.accessTimeEnd}` : null],
          ['Din', p.accessDays?.length && p.accessDays.length < 7 ? p.accessDays.map((d) => DAYS[d] ?? d).join(', ') : null],
          ['Admission fee', p.registrationFee > 0 ? formatPKR(p.registrationFee) : null],
          ['Security', p.securityDeposit > 0 ? `${formatPKR(p.securityDeposit)} (wapas milegi)` : null],
          ['Rokna (freeze)', p.allowFreeze ? `${p.maxFreezeDays} din tak` : null],
        ]),
        includes: [
          ...(p.includesClasses ? [p.classesLimit ? `${p.classesLimit} group classes` : 'Group classes'] : []),
          ...(p.includesPersonalTraining ? [`${p.personalTrainingSessions} personal training sessions`] : []),
          ...(p.includesNutritionPlan ? ['Diet plan'] : []),
          ...(p.includesLockerFacility ? ['Locker'] : []),
          ...(p.includesTowelService ? ['Towel'] : []),
          ...(p.includesSteamSauna ? ['Steam aur sauna'] : []),
          ...(p.includesSwimmingPool ? ['Swimming pool'] : []),
          ...(p.includesGuestPasses > 0 ? [`${p.includesGuestPasses} mehmaan pass`] : []),
          ...(p.benefits ?? []),
        ],
        facets: { plan: p.planType },
        keywords: p.code ?? '',
      }));
  },
};

export const gymTrainersSource: CatalogSource = {
  key: 'gym-trainers',
  load: async () => {
    const list = await trainersApi.list({ available: true });
    return (Array.isArray(list) ? list : []).filter((t) => t.isActive !== false).map((t: Trainer): CatalogEntry => {
      const name = `${t.staff?.firstName ?? ''} ${t.staff?.lastName ?? ''}`.trim() || t.staff?.fullName || 'Trainer';
      return {
        id: t.id, name, price: t.perSessionRate, per: 'session', priceNote: t.perSessionRate > 0 ? undefined : 'Rate poochein',
        image: t.photoUrl ?? null, emoji: '💪', description: t.bio ?? null,
        category: { id: t.role, name: pretty(t.role) }, featured: false, inStock: null,
        chips: [
          ...(t.experienceYears ? [{ label: `${t.experienceYears}+ saal tajurba`, tone: 'blue' as const }] : []),
          ...(t.avgRating ? [{ label: `★ ${t.avgRating.toFixed(1)}`, tone: 'amber' as const }] : []),
        ],
        specs: specs([
          ['Kaam', pretty(t.role)], ['Tajurba', t.experienceYears ? `${t.experienceYears} saal` : null],
          ['Waqt', t.workStartTime && t.workEndTime ? `${t.workStartTime} – ${t.workEndTime}` : null],
          ['Din', t.workingDays?.length ? t.workingDays.map((d) => DAYS[d] ?? d).join(', ') : null],
          ['Zabaan', t.languages?.join(', ')], ['Certificate', t.certifications?.join(', ')],
        ]),
        includes: t.specializations,
        keywords: t.trainerNumber,
      };
    });
  },
};

export const gymClassesSource: CatalogSource = {
  key: 'gym-classes',
  load: async () => {
    const now = new Date();
    const list = await classesApi.calendar(now.toISOString(), new Date(now.getTime() + 7 * 86_400_000).toISOString());
    return (Array.isArray(list) ? list : []).filter((c) => c.status !== 'CANCELLED').map((c: GymClass): CatalogEntry => {
      const when = new Date(c.scheduledStart).toLocaleString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      const seats = c.maxParticipants - c.currentEnrolled;
      return {
        id: c.id, name: c.name, price: c.isFree ? 0 : c.memberPrice, per: 'class', priceNote: c.isFree ? 'Muft' : undefined,
        priceTiers: !c.isFree && c.dropInPrice > 0 && c.dropInPrice !== c.memberPrice ? [{ label: 'Member', price: c.memberPrice }, { label: 'Bina membership', price: c.dropInPrice }] : undefined,
        image: c.imageUrl ?? null, emoji: '📅', description: c.description ?? null,
        category: { id: c.classType, name: pretty(c.classType) }, featured: false,
        inStock: seats > 0, stockNote: seats > 0 ? `${seats} jagah baqi` : undefined, createdAt: c.scheduledStart,
        chips: [{ label: when, tone: 'blue' }, { label: `${c.durationMinutes} min`, tone: 'slate' }],
        specs: specs([
          ['Kab', when], ['Waqt', `${c.durationMinutes} minute`],
          ['Trainer', c.trainer?.staff ? `${c.trainer.staff.firstName ?? ''} ${c.trainer.staff.lastName ?? ''}`.trim() : null],
          ['Jagah', c.roomName || c.location], ['Level', c.difficultyLevel ? pretty(c.difficultyLevel) : null],
          ['Kis ke liye', c.targetAudience], ['Seats', `${c.currentEnrolled} / ${c.maxParticipants}`],
        ]),
      };
    });
  },
};

const CHARGE_PER: Partial<Record<ChargeType, string>> = { HOURLY: 'ghanta', PER_VISIT: 'visit', FIXED: 'kaam' };

export const servicesBizSource: CatalogSource = {
  key: 'services-biz',
  load: async () => {
    const list = await servicesCatalogApi.list({ active: true });
    return (Array.isArray(list) ? list : []).filter((s) => s.isActive !== false).map((s: ServiceCatalogItem): CatalogEntry => {
      const price = Number(s.baseCharge || s.visitCharge || s.hourlyRate || 0);
      const quote = s.requiresQuote || s.chargeType === 'QUOTE_BASED';
      return {
        id: s.id, name: s.name, price, per: CHARGE_PER[s.chargeType],
        priceNote: price > 0 ? undefined : quote ? 'Dekh kar rate' : 'Rate poochein',
        priceTiers: [
          { label: 'Visit', price: Number(s.visitCharge) }, { label: 'Fi ghanta', price: Number(s.hourlyRate) },
          { label: 'Kam se kam', price: Number(s.minCharge) }, { label: 'Emergency', price: Number(s.emergencyCharge) },
          { label: 'Chhutti wala din', price: Number(s.weekendCharge) }, { label: 'Raat', price: Number(s.nightCharge) },
          { label: 'Shehar se bahar', price: Number(s.outOfCityCharge) },
        ].filter((t) => t.price > 0 && t.price !== price),
        image: s.imageUrl || s.imageUrls?.[0] || null, images: [s.imageUrl, ...(s.imageUrls ?? [])].filter(Boolean) as string[],
        emoji: '🛠️', description: s.description ?? null,
        category: { id: s.category, name: pretty(s.category) }, featured: s.isFeatured, inStock: null, createdAt: s.createdAt,
        badges: [
          ...(s.isEmergency ? [{ label: '24/7', tone: 'red' as const }] : []),
          ...(s.isPopular ? [{ label: 'Mashhoor', tone: 'pink' as const }] : []),
        ],
        chips: [
          ...(s.estimatedDurationMin ? [{ label: mins(s.estimatedDurationMin)!, tone: 'slate' as const }] : []),
          ...(s.warrantyDays > 0 ? [{ label: `${s.warrantyDays} din warranty`, tone: 'blue' as const }] : []),
          ...(s.isRemoteAvailable ? [{ label: 'Online bhi', tone: 'violet' as const }] : []),
          ...(quote ? [{ label: 'Dekh kar rate', tone: 'amber' as const }] : []),
        ],
        specs: specs([
          ['Kaam ka waqt', mins(s.estimatedDurationMin)], ['Kaun karega', pretty(s.requiredSkillLevel)],
          ['Warranty', s.warrantyDays > 0 ? `${s.warrantyDays} din${s.warrantyType && s.warrantyType !== 'NONE' ? ` (${pretty(s.warrantyType)})` : ''}` : null],
          ['Warranty ki shartein', s.warrantyTerms], ['Advance', s.requiresAdvance ? `${s.advancePct}% pehle` : null],
          ['License', s.requiresLicense ? s.licenseType || 'Haan' : null],
        ]),
        facets: { ...(s.businessType ? { biz: s.businessType } : {}), ...(s.isEmergency ? { emergency: 'yes' } : {}) },
        keywords: s.code ?? '',
      };
    });
  },
};

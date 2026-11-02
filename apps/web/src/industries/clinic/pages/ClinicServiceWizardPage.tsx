/**
 * Clinic item editor on the shared product editor. Two kinds:
 *   service   consultation, procedure, lab test, X-ray: no stock; the
 *             clinical details (category, time, preparation) are saved to
 *             the clinic service after the product
 *   medicine  stock the clinic keeps and sells at the counter (tablets,
 *             syrups, dressing): price and opening stock like any product
 */

import { ClipboardList, Clock, FlaskConical, Pill, Stethoscope } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { NumberField, Section, TextField, Tiles, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { SERVICE_CATEGORIES } from '../api/constants';
import { clinicServicesApi, type ServiceCategory } from '../api/services.api';
import { t } from '@core/i18n';

type Kind = 'service' | 'item';

export interface ClinicExtra {
  kind: Kind;
  serviceId: string | null;
  category: ServiceCategory;
  serviceCode: string;
  durationMin: number | null;
  requiresDoctor: boolean;
  requiresRoom: boolean;
  requiresPrep: boolean;
  prepInstructions: string;
}

const initial: ClinicExtra = {
  kind: 'service', serviceId: null, category: 'CONSULTATION', serviceCode: '', durationMin: 15,
  requiresDoctor: true, requiresRoom: false, requiresPrep: false, prepInstructions: '',
};

const SERVICE_UNITS = ['service', 'session', 'visit', 'procedure', 'test'];

function KindPick({ ctx }: { ctx: StepContext<ClinicExtra> }) {
  const x = ctx.draft.extra;
  return (
    <Tiles<Kind> value={x.kind} columns="grid-cols-2"
      onChange={(kind) => {
        ctx.setExtra({ kind });
        ctx.setCore({ unit: kind === 'service' ? 'service' : 'pcs', productType: kind === 'service' ? 'SERVICE' : null });
      }}
      options={[
        { value: 'service', label: t('Service / test'), hint: t('Consultation, procedure, lab — stock nahi'), icon: Stethoscope },
        { value: 'item', label: t('Dawai / saman'), hint: t('Clinic ka stock, counter par bikta hai'), icon: Pill },
      ]} />
  );
}

function Clinical({ ctx }: { ctx: StepContext<ClinicExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div className="space-y-4">
      <Section icon={ClipboardList} title={t('Service ka type')} hint={t('Counter aur Lab page par isi se alag dikhti hai')}>
        <Tiles<ServiceCategory> value={x.category} onChange={(category) => ctx.setExtra({ category })} columns="grid-cols-2 sm:grid-cols-4"
          options={SERVICE_CATEGORIES.map((c) => ({ value: c.value as ServiceCategory, label: c.label, icon: c.emoji }))} />
      </Section>
      <Section icon={Clock} title={t('Waqt aur tayyari')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label={t('Kitna waqt')} allowEmpty value={x.durationMin} onChange={(durationMin) => ctx.setExtra({ durationMin })} suffix="min" error={ctx.errors.durationMin} />
          <TextField label={t('Service code')} value={x.serviceCode} onChange={(serviceCode) => ctx.setExtra({ serviceCode })} placeholder={t('CBC-01')} hint={t('Marzi — lab ke code ke liye')} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Toggle on={x.requiresDoctor} onChange={(requiresDoctor) => ctx.setExtra({ requiresDoctor })} title={t('Doctor zaroori')} />
          <Toggle on={x.requiresRoom} onChange={(requiresRoom) => ctx.setExtra({ requiresRoom })} title={t('Alag kamra')} />
          <Toggle on={x.requiresPrep} onChange={(requiresPrep) => ctx.setExtra({ requiresPrep })} icon={FlaskConical} title={t('Tayyari (khaali pait…)')} />
        </div>
        {x.requiresPrep && (
          <div className="mt-3"><TextField label={t('Mareez ko hidayat')} value={x.prepInstructions} onChange={(prepInstructions) => ctx.setExtra({ prepInstructions })} placeholder={t('8 ghante khaali pait aayein')} /></div>
        )}
      </Section>
    </div>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'service', label: t('Service') }, { value: 'session', label: t('Session') }, { value: 'visit', label: t('Visit') }, { value: 'procedure', label: t('Procedure') },
    { value: 'test', label: t('Test') }, { value: 'tablet', label: t('Tablet') }, { value: 'strip', label: t('Strip') }, { value: 'bottle', label: t('Bottle') },
    { value: 'vial', label: t('Vial') }, { value: 'pcs', label: t('Adad (pcs)') },
  ],
  skuPrefix: 'CLN',
  packs: true,
  variants: false,
  batches: true,
  markups: [10, 20, 30, 50],
};

const clinicalStep: StepDef<ClinicExtra> = {
  id: 'clinical', title: t('Service'), hint: t('Type, waqt, tayyari'), icon: Stethoscope,
  render: (ctx) => <Clinical ctx={ctx} />,
  when: (d) => d.extra.kind === 'service',
  validate: (d): Errors => (d.extra.durationMin != null && !(d.extra.durationMin > 0 && d.extra.durationMin <= 600) ? { durationMin: t('1 se 600 minute') } : {}),
};

const config: EditorConfig<ClinicExtra> = {
  label: t('Clinic'),
  draftKey: 'nafaa.product-editor.clinic',
  paths: { list: '/products', detail: (id) => `/clinic-services/${id}`, create: '/clinic-services/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const s = await clinicServicesApi.byProduct(productId).catch(() => null);
      if (!s) return { kind: 'item' };
      return {
        kind: 'service', serviceId: s.id, category: s.category, serviceCode: s.serviceCode ?? '', durationMin: s.durationMin ?? null,
        requiresDoctor: s.requiresDoctor, requiresRoom: !!(s as { requiresRoom?: boolean }).requiresRoom, requiresPrep: !!s.requiresFasting, prepInstructions: s.prepInstructions ?? '',
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      if (x.kind !== 'service') return;
      const body = {
        productId, category: x.category, serviceCode: x.serviceCode.trim() || undefined, durationMin: x.durationMin ?? undefined, basePrice: d.core.price,
        requiresDoctor: x.requiresDoctor, requiresRoom: x.requiresRoom, requiresPrep: x.requiresPrep, prepInstructions: x.requiresPrep ? x.prepInstructions.trim() : '', isActive: d.core.isActive,
      } as Record<string, unknown>;
      if (x.serviceId) await clinicServicesApi.update(x.serviceId, body);
      else await clinicServicesApi.upsert(body);
    },
    // A service never holds stock; the server skips stock checks for it.
    product: (d, payload) => (d.extra.kind === 'service' ? { ...payload, productType: 'SERVICE', stock: 0, lowStockAlert: 0, unit: SERVICE_UNITS.includes(d.core.unit) ? d.core.unit : 'service' } : payload),
  },
  steps: [
    basicStep<ClinicExtra>(core, {
      extra: (ctx) => <KindPick ctx={ctx} />, namePlaceholder: t('Jaise: Consultation, CBC test, Dressing, Panadol 500'),
      categorySuggestions: ['Consultation', 'Procedure', 'Lab test', 'X-ray / Ultrasound', 'Dawai', 'Injection', 'Surgical saman'],
    }),
    clinicalStep,
    priceStep<ClinicExtra>(core),
    { ...stockStep<ClinicExtra>(core, { quick: [10, 30, 100, 300] }), when: (d) => d.extra.kind === 'item' },
  ],
  summary: (d) => (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-600">
      <p>{d.extra.kind === 'service' ? SERVICE_CATEGORIES.find((c) => c.value === d.extra.category)?.label : t('Dawai / saman (stock)')}</p>
      {d.extra.kind === 'service' && d.extra.durationMin ? <p>{t('{{durationMin}} minute{{value}}', { durationMin: d.extra.durationMin, value: d.extra.requiresPrep ? t(' · tayyari zaroori') : '' })}</p> : null}
    </div>
  ),
  refresh: ['clinic-services', 'clinic-service-detail', 'products'],
  guide: [
    { icon: Stethoscope, color: '#0891b2', title: t('Service ya dawai'), text: t('Consultation, procedure aur test "Service" hain — stock nahi hota. Clinic me rakhi dawai "Dawai / saman" — stock aur expiry ke saath.') },
    { icon: FlaskConical, color: '#d97706', title: t('Lab test'), text: t('Category "Lab test" rakhein — Lab order me rate khud aa jata hai.') },
  ],
};

export default function ClinicServiceWizardPage() {
  return <ProductEditorPage config={config} />;
}

/**
 * Service-business dashboard: the standard dashboard plus open jobs, the
 * field team, AMC renewals and technician ranking.
 */

import {
  BarChart3, BookOpen, Briefcase, BriefcaseBusiness, FileText, MapPin, Plus, Receipt, ShieldCheck, ShieldPlus,
  ShoppingCart, Users, Wrench,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useServicesOps } from './useServicesOps';
import {
  ServicesAmc, ServicesField, ServicesJobs, ServicesTopTechnicians, servicesKpis, useServicesAttention,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/services-biz-services/${id}`;

function useServicesActions(): QuickAction[] {
  const { data } = useOverview();
  const { work, techs, quotes, amc, services } = useServicesOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/services-biz/jobs/new', icon: Plus, label: t('Nayi job'), hint: t('Complaint likhein') },
    { to: '/services-biz/jobs', icon: Briefcase, label: t('Jobs'), hint: t('{{active}} chaalu', { active: work.active }) },
    { to: '/services-biz/dispatch', icon: MapPin, label: t('Dispatch'), hint: work.unassigned ? t('{{unassigned}} banda lagana', { unassigned: work.unassigned }) : t('Live map') },
    { to: '/services-biz/technicians', icon: Users, label: t('Technicians'), hint: t('{{free}}/{{total}} free', { free: techs.free, total: techs.total }) },
    { to: '/services-biz/quotes', icon: FileText, label: t('Quotes'), hint: quotes ? t('{{quotes}} khule', { quotes }) : t('Naya quote') },
    { to: '/services-biz/amc', icon: ShieldCheck, label: t('AMC'), hint: amc.count ? t('{{count}} renewal', { count: amc.count }) : t('Contracts') },
    { to: '/services-biz/warranty', icon: ShieldPlus, label: t('Warranty'), hint: t('Claims') },
    { to: '/services-biz/catalog', icon: Wrench, label: t('Services'), hint: t('{{services}} services', { services }) },
    { to: '/services-biz-services/new', icon: BriefcaseBusiness, label: t('Nayi service'), hint: t('Rate list me daalein') },
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Bill banayein') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Bill record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const servicesBizDashboard = createDashboard({
  label: t('Services'),
  productPath,
  openFrom: 9,
  primaryAction: { to: '/services-biz/jobs/new', label: t('Nayi job'), icon: Plus },
  kpis: servicesKpis,
  defaultKpis: ['services-jobs', 'services-urgent', 'services-techs', 'sales', 'profit', 'services-job-due'],
  useAttention: useServicesAttention,
  widgets: [
    { id: 'services-jobs', title: t('Chaalu jobs'), description: t('Khuli jobs — urgent aur late upar'), size: 'half', sizes: ANY_SIZE, Component: ServicesJobs },
    { id: 'services-field', title: t('Field ka haal'), description: t('Free technician, raaste me, site par aur rating'), size: 'third', sizes: ['third', 'half'], Component: ServicesField },
    { id: 'services-amc', title: t('AMC renewal'), description: t('30 din me khatam hone wale contract'), size: 'third', sizes: ANY_SIZE, Component: ServicesAmc },
  ],
  lateWidgets: [
    { id: 'services-top-technicians', title: t('Behtareen technician'), description: t('30 din me sab se zyada kaam karne wale'), size: 'third', sizes: ANY_SIZE, Component: ServicesTopTechnicians },
  ],
  useQuickActions: useServicesActions,
  omit: ['slow-movers'],
  guide: [
    { icon: Briefcase, title: t('Jobs aur field'), text: t('Har khuli job, urgent aur late sab se upar. Kitne technician free hain, kitne raaste me aur kitne site par — banda lagana ho to seedha Dispatch.') },
    { icon: ShieldCheck, title: t('AMC aur quotes'), text: t('Jo AMC contract agle 30 din me khatam ho raha hai us ke customer se pehle baat karein — renewal naye customer se sasta parta hai. Khule quotes ka follow up bhi yahin.') },
  ],
});

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

const productPath = (id: string) => `/services-biz-services/${id}`;

function useServicesActions(): QuickAction[] {
  const { data } = useOverview();
  const { work, techs, quotes, amc, services } = useServicesOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/services-biz/jobs/new', icon: Plus, label: 'Nayi job', hint: 'Complaint likhein' },
    { to: '/services-biz/jobs', icon: Briefcase, label: 'Jobs', hint: `${work.active} chaalu` },
    { to: '/services-biz/dispatch', icon: MapPin, label: 'Dispatch', hint: work.unassigned ? `${work.unassigned} banda lagana` : 'Live map' },
    { to: '/services-biz/technicians', icon: Users, label: 'Technicians', hint: `${techs.free}/${techs.total} free` },
    { to: '/services-biz/quotes', icon: FileText, label: 'Quotes', hint: quotes ? `${quotes} khule` : 'Naya quote' },
    { to: '/services-biz/amc', icon: ShieldCheck, label: 'AMC', hint: amc.count ? `${amc.count} renewal` : 'Contracts' },
    { to: '/services-biz/warranty', icon: ShieldPlus, label: 'Warranty', hint: 'Claims' },
    { to: '/services-biz/catalog', icon: Wrench, label: 'Services', hint: `${services} services` },
    { to: '/services-biz-services/new', icon: BriefcaseBusiness, label: 'Nayi service', hint: 'Rate list me daalein' },
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Bill banayein' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Bill record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const servicesBizDashboard = createDashboard({
  label: 'Services',
  productPath,
  openFrom: 9,
  primaryAction: { to: '/services-biz/jobs/new', label: 'Nayi job', icon: Plus },
  kpis: servicesKpis,
  defaultKpis: ['services-jobs', 'services-urgent', 'services-techs', 'sales', 'profit', 'services-job-due'],
  useAttention: useServicesAttention,
  widgets: [
    { id: 'services-jobs', title: 'Chaalu jobs', description: 'Khuli jobs — urgent aur late upar', size: 'half', sizes: ANY_SIZE, Component: ServicesJobs },
    { id: 'services-field', title: 'Field ka haal', description: 'Free technician, raaste me, site par aur rating', size: 'third', sizes: ['third', 'half'], Component: ServicesField },
    { id: 'services-amc', title: 'AMC renewal', description: '30 din me khatam hone wale contract', size: 'third', sizes: ANY_SIZE, Component: ServicesAmc },
  ],
  lateWidgets: [
    { id: 'services-top-technicians', title: 'Behtareen technician', description: '30 din me sab se zyada kaam karne wale', size: 'third', sizes: ANY_SIZE, Component: ServicesTopTechnicians },
  ],
  useQuickActions: useServicesActions,
  omit: ['slow-movers'],
  guide: [
    { icon: Briefcase, title: 'Jobs aur field', text: 'Har khuli job, urgent aur late sab se upar. Kitne technician free hain, kitne raaste me aur kitne site par — banda lagana ho to seedha Dispatch.' },
    { icon: ShieldCheck, title: 'AMC aur quotes', text: 'Jo AMC contract agle 30 din me khatam ho raha hai us ke customer se pehle baat karein — renewal naye customer se sasta parta hai. Khule quotes ka follow up bhi yahin.' },
  ],
});

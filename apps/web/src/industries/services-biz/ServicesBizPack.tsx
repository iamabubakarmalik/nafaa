import { Award, Briefcase, FileText, LayoutDashboard, MapPin, Package, Plus, ShieldCheck, Users, Wrench } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import ServicesBizDashboard from './dashboard/ServicesBizDashboard';
import ServicesBizServiceWizardPage from './pages/ServicesBizServiceWizardPage';
import ServicesBizServiceDetailPage from './pages/ServicesBizServiceDetailPage';
import CatalogPage from './pages/CatalogPage';
import JobsListPage from './pages/JobsListPage';
import JobDetailPage from './pages/JobDetailPage';
import NewJobPage from './pages/NewJobPage';
import QuotesPage from './pages/QuotesPage';
import TechniciansPage from './pages/TechniciansPage';
import DispatchPage from './pages/DispatchPage';
import AmcPage from './pages/AmcPage';
import WarrantyPage from './pages/WarrantyPage';
import { t } from '@core/i18n';

/**
 * Services business pack: repair shops, AC / electrician / plumber
 * services, printing and job shops. Job cards from intake to bill,
 * technicians and commission, quotes, dispatch, AMC contracts and
 * work warranty; the counter, products and sales history run on the
 * shared pages with this industry's config.
 */
export const ServicesBizPack: IndustryPack = {
  id: 'services-biz',
  name: 'Services Business',
  shortName: t('Services'),
  emoji: '🛠️',
  priority: 56,
  description:
    t('Field service jobs, technician dispatch, quotes, AMC contracts, warranty — plumbers, electricians, AC techs, IT support, cleaners.'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('SERVICE') ||
      type.includes('PLUMBER') ||
      type.includes('PLUMBING') ||
      type.includes('ELECTRICIAN') ||
      type.includes('ELECTRICAL') ||
      type.includes('AC_TECH') ||
      type.includes('HVAC') ||
      type.includes('APPLIANCE') ||
      type.includes('CLEANING') ||
      type.includes('IT_SUPPORT') ||
      type.includes('FIELD_SERVICE') ||
      type.includes('MAINTENANCE') ||
      type.includes('CONTRACTOR')
    );
  },

  navGroups: [
    {
      label: t('Services business'),
      icon: Wrench,
      emoji: '🛠️',
      color: '#0ea5e9',
      order: 20,
      items: [
        { to: '/services-biz/jobs/new', label: t('New job'), icon: Plus, badge: t('FAST') },
        { to: '/services-biz/jobs', label: t('Jobs'), icon: Briefcase },
        { to: '/services-biz/dispatch', label: t('Dispatch'), icon: MapPin },
        { to: '/services-biz/quotes', label: t('Quotes'), icon: FileText },
        { to: '/services-biz/catalog', label: t('Service catalog'), icon: Package },
        { to: '/services-biz/technicians', label: t('Technicians'), icon: Users },
        { to: '/services-biz/amc', label: t('AMC contracts'), icon: Award },
        { to: '/services-biz/warranty', label: t('Warranty'), icon: ShieldCheck },
        { to: '/services-biz/dashboard', label: t('Services dashboard'), icon: LayoutDashboard },
      ],
    },
  ],

  routes: [
    { path: '/services-biz-services/new', element: ServicesBizServiceWizardPage },
    { path: '/services-biz-services/:id/edit', element: ServicesBizServiceWizardPage },
    { path: '/services-biz-services/:id', element: ServicesBizServiceDetailPage },
    { path: '/services-biz', element: ServicesBizDashboard },
    { path: '/services-biz/dashboard', element: ServicesBizDashboard },
    { path: '/services-biz/jobs/new', element: NewJobPage },
    { path: '/services-biz/jobs/:id/edit', element: NewJobPage },
    { path: '/services-biz/jobs/:id', element: JobDetailPage },
    { path: '/services-biz/jobs', element: JobsListPage },
    { path: '/services-biz/dispatch', element: DispatchPage },
    { path: '/services-biz/catalog', element: CatalogPage },
    { path: '/services-biz/quotes', element: QuotesPage },
    { path: '/services-biz/technicians', element: TechniciansPage },
    { path: '/services-biz/amc', element: AmcPage },
    { path: '/services-biz/warranty', element: WarrantyPage },
  ],

  dashboardComponent: ServicesBizDashboard,

  productForm: {
    defaultUnit: 'service',
    unitOptions: [
      { value: 'service', label: t('Service Call'), hint: '🛠️', group: t('Service') },
      { value: 'visit', label: t('Visit'), hint: '🚪', group: t('Service') },
      { value: 'job', label: t('Job / Work Order'), hint: '📋', group: t('Service') },
      { value: 'hour', label: t('Labor Hour'), hint: '⏰', group: t('Labor') },
      { value: 'day', label: t('Day (bulk labor)'), hint: '📅', group: t('Labor') },
      { value: 'quarter-hour', label: t('Quarter Hour (15 min)'), hint: '⏱️', group: t('Labor') },
      { value: 'installation', label: t('Installation'), hint: '⚙️', group: t('Package') },
      { value: 'repair', label: t('Repair'), hint: '🔧', group: t('Package') },
      { value: 'inspection', label: t('Inspection'), hint: '🔍', group: t('Package') },
      { value: 'contract', label: t('Contract / AMC'), hint: '📄', group: t('Contract') },
      { value: 'pcs', label: t('Piece (parts)'), hint: '🔢', group: t('Parts') },
      { value: 'meter', label: t('Meter (cable/pipe)'), hint: '📏', group: t('Parts') },
      { value: 'feet', label: t('Feet'), hint: '📏', group: t('Parts') },
      { value: 'liter', label: t('Liter (fluids)'), hint: '🥛', group: t('Parts') },
      { value: 'kg', label: t('Kilogram'), hint: '⚖️', group: t('Parts') },
    ],
  },

  featureFlags: [
    { key: 'servicesJobs', label: t('Field Jobs / Work Orders'), defaultEnabled: true },
    { key: 'servicesDispatch', label: t('Dispatch Board'), defaultEnabled: true },
    { key: 'servicesQuotes', label: t('Quotes / Estimates'), defaultEnabled: true },
    { key: 'servicesAmc', label: t('AMC Contracts'), defaultEnabled: false },
    { key: 'servicesWarranty', label: t('Warranty Register'), defaultEnabled: false },
    { key: 'servicesZones', label: t('Zone-based Dispatch'), defaultEnabled: false },
  ],
};

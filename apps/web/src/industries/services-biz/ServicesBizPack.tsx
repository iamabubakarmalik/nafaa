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
  shortName: 'Services',
  emoji: '🛠️',
  priority: 56,
  description:
    'Field service jobs, technician dispatch, quotes, AMC contracts, warranty — plumbers, electricians, AC techs, IT support, cleaners.',

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
      label: 'Services business',
      icon: Wrench,
      emoji: '🛠️',
      color: '#0ea5e9',
      order: 20,
      items: [
        { to: '/services-biz/jobs/new', label: 'New job', icon: Plus, badge: 'FAST' },
        { to: '/services-biz/jobs', label: 'Jobs', icon: Briefcase },
        { to: '/services-biz/dispatch', label: 'Dispatch', icon: MapPin },
        { to: '/services-biz/quotes', label: 'Quotes', icon: FileText },
        { to: '/services-biz/catalog', label: 'Service catalog', icon: Package },
        { to: '/services-biz/technicians', label: 'Technicians', icon: Users },
        { to: '/services-biz/amc', label: 'AMC contracts', icon: Award },
        { to: '/services-biz/warranty', label: 'Warranty', icon: ShieldCheck },
        { to: '/services-biz/dashboard', label: 'Services dashboard', icon: LayoutDashboard },
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
      { value: 'service', label: 'Service Call', hint: '🛠️', group: 'Service' },
      { value: 'visit', label: 'Visit', hint: '🚪', group: 'Service' },
      { value: 'job', label: 'Job / Work Order', hint: '📋', group: 'Service' },
      { value: 'hour', label: 'Labor Hour', hint: '⏰', group: 'Labor' },
      { value: 'day', label: 'Day (bulk labor)', hint: '📅', group: 'Labor' },
      { value: 'quarter-hour', label: 'Quarter Hour (15 min)', hint: '⏱️', group: 'Labor' },
      { value: 'installation', label: 'Installation', hint: '⚙️', group: 'Package' },
      { value: 'repair', label: 'Repair', hint: '🔧', group: 'Package' },
      { value: 'inspection', label: 'Inspection', hint: '🔍', group: 'Package' },
      { value: 'contract', label: 'Contract / AMC', hint: '📄', group: 'Contract' },
      { value: 'pcs', label: 'Piece (parts)', hint: '🔢', group: 'Parts' },
      { value: 'meter', label: 'Meter (cable/pipe)', hint: '📏', group: 'Parts' },
      { value: 'feet', label: 'Feet', hint: '📏', group: 'Parts' },
      { value: 'liter', label: 'Liter (fluids)', hint: '🥛', group: 'Parts' },
      { value: 'kg', label: 'Kilogram', hint: '⚖️', group: 'Parts' },
    ],
  },

  featureFlags: [
    { key: 'servicesJobs', label: 'Field Jobs / Work Orders', defaultEnabled: true },
    { key: 'servicesDispatch', label: 'Dispatch Board', defaultEnabled: true },
    { key: 'servicesQuotes', label: 'Quotes / Estimates', defaultEnabled: true },
    { key: 'servicesAmc', label: 'AMC Contracts', defaultEnabled: false },
    { key: 'servicesWarranty', label: 'Warranty Register', defaultEnabled: false },
    { key: 'servicesZones', label: 'Zone-based Dispatch', defaultEnabled: false },
  ],
};

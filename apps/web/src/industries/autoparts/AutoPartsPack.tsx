import { Bell, Car, Package, Plus, Recycle, Truck, UserCog, Wrench } from 'lucide-react';
import { PERMISSIONS } from '@core/lib/permissions';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import AutoPartsDashboard from './dashboard/AutoPartsDashboard';
import VehicleMakesPage from './pages/VehicleMakesPage';
import CustomerVehiclesPage from './pages/CustomerVehiclesPage';
import PartsPage from './pages/PartsPage';
import WorkshopJobsPage from './pages/WorkshopJobsPage';
import NewWorkshopJobPage from './pages/NewWorkshopJobPage';
import WorkshopJobDetailPage from './pages/WorkshopJobDetailPage';
import MechanicsPage from './pages/MechanicsPage';
import ServiceRemindersPage from './pages/ServiceRemindersPage';
import CoreReturnsPage from './pages/CoreReturnsPage';
import AutoPartWizardPage from './pages/AutoPartWizardPage';
import AutoPartDetailPage from './pages/AutoPartDetailPage';
import { t } from '@core/i18n';

/**
 * Auto parts shop and workshop: parts with part numbers, quality and the
 * vehicles they fit on the shared product pages and counter; workshop job
 * cards that bill through the shared sale; customer vehicles with service
 * history; mechanics; and service reminders.
 */
export const AutoPartsPack: IndustryPack = {
  id: 'autoparts',
  name: 'Auto Parts / Workshop',
  shortName: t('Auto Parts'),
  emoji: '🔧',
  priority: 58,
  description:
    t('Vehicle makes/models, customer vehicles, part fitment, workshop jobs, mechanics, service reminders (oil/token/insurance).'),

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    // "CAR" only as a whole word, so CARPET or SKIN_CARE never land here.
    const words = type.split(/[^A-Z]+/);
    return ['AUTO', 'WORKSHOP', 'GARAGE', 'MECHANIC', 'SPARE', 'MOTOR', 'VEHICLE'].some((w) => type.includes(w)) || words.includes('CAR') || words.includes('CARS');
  },

  navGroups: [
    {
      label: t('Auto parts / workshop'),
      icon: Car,
      emoji: '🔧',
      color: '#475569',
      order: 20,
      items: [
        { to: '/autoparts/jobs/new', label: t('New job'), icon: Plus, permission: PERMISSIONS.SERVICE_JOBS_MANAGE },
        { to: '/autoparts/jobs', label: t('Workshop jobs'), icon: Wrench, permission: PERMISSIONS.SERVICE_JOBS_VIEW },
        { to: '/autoparts/parts', label: t('Parts'), icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/autoparts/vehicles', label: t('Vehicles'), icon: Car, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/autoparts/reminders', label: t('Service reminders'), icon: Bell, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/autoparts/core-returns', label: t('Old parts'), icon: Recycle, permission: PERMISSIONS.RETURNS_VIEW },
        { to: '/autoparts/mechanics', label: t('Mechanics'), icon: UserCog, permission: PERMISSIONS.SERVICE_JOBS_VIEW },
        { to: '/autoparts/makes', label: t('Make / model'), icon: Truck, permission: PERMISSIONS.PRODUCTS_VIEW },
      ],
    },
  ],

  routes: [
    // Parts on the shared product editor and detail.
    { path: '/autoparts-parts/new', element: AutoPartWizardPage, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/autoparts-parts/:id/edit', element: AutoPartWizardPage, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/autoparts-parts/:id', element: AutoPartDetailPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/autoparts/parts', element: PartsPage, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/autoparts', element: AutoPartsDashboard },
    { path: '/autoparts/dashboard', element: AutoPartsDashboard },
    { path: '/autoparts/jobs/new', element: NewWorkshopJobPage, permission: PERMISSIONS.SERVICE_JOBS_MANAGE },
    { path: '/autoparts/jobs/:id', element: WorkshopJobDetailPage, permission: PERMISSIONS.SERVICE_JOBS_VIEW },
    { path: '/autoparts/jobs', element: WorkshopJobsPage, permission: PERMISSIONS.SERVICE_JOBS_VIEW },
    { path: '/autoparts/vehicles', element: CustomerVehiclesPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/autoparts/makes', element: VehicleMakesPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/autoparts/models', element: VehicleMakesPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/autoparts/mechanics', element: MechanicsPage, permission: PERMISSIONS.SERVICE_JOBS_VIEW },
    { path: '/autoparts/reminders', element: ServiceRemindersPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/autoparts/core-returns', element: CoreReturnsPage, permission: PERMISSIONS.RETURNS_VIEW },
  ],

  dashboardComponent: AutoPartsDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: t('Pieces'), hint: '🔢', group: t('Count') },
      { value: 'set', label: t('Set'), hint: '📦', group: t('Count') },
      { value: 'pair', label: t('Pair'), hint: '🔗', group: t('Count') },
      { value: 'liter', label: t('Liter (oils/fluids)'), hint: '🛢️', group: t('Volume') },
      { value: 'ml', label: t('Milliliter'), hint: '🛢️', group: t('Volume') },
      { value: 'meter', label: t('Meter (wires/hoses)'), hint: '📏', group: t('Length') },
      { value: 'feet', label: t('Feet'), hint: '📏', group: t('Length') },
      { value: 'kg', label: t('Kilogram'), hint: '⚖️', group: t('Weight') },
    ],
  },

  featureFlags: [
    { key: 'autoVehicleRegistry', label: t('Customer Vehicles'), defaultEnabled: true },
    { key: 'autoPartFitment', label: t('Part Compatibility'), defaultEnabled: true },
    { key: 'autoWorkshopJobs', label: t('Workshop Jobs'), defaultEnabled: true },
    { key: 'autoMechanics', label: t('Mechanic Profiles'), defaultEnabled: true },
    { key: 'autoReminders', label: t('Service Reminders'), defaultEnabled: true },
  ],
};

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

/**
 * Auto parts shop and workshop: parts with part numbers, quality and the
 * vehicles they fit on the shared product pages and counter; workshop job
 * cards that bill through the shared sale; customer vehicles with service
 * history; mechanics; and service reminders.
 */
export const AutoPartsPack: IndustryPack = {
  id: 'autoparts',
  name: 'Auto Parts / Workshop',
  shortName: 'Auto Parts',
  emoji: '🔧',
  priority: 58,
  description:
    'Vehicle makes/models, customer vehicles, part fitment, workshop jobs, mechanics, service reminders (oil/token/insurance).',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    // "CAR" only as a whole word, so CARPET or SKIN_CARE never land here.
    const words = type.split(/[^A-Z]+/);
    return ['AUTO', 'WORKSHOP', 'GARAGE', 'MECHANIC', 'SPARE', 'MOTOR', 'VEHICLE'].some((w) => type.includes(w)) || words.includes('CAR') || words.includes('CARS');
  },

  navGroups: [
    {
      label: 'Auto parts / workshop',
      icon: Car,
      emoji: '🔧',
      color: '#475569',
      order: 20,
      items: [
        { to: '/autoparts/jobs/new', label: 'New job', icon: Plus, permission: PERMISSIONS.SERVICE_JOBS_MANAGE },
        { to: '/autoparts/jobs', label: 'Workshop jobs', icon: Wrench, permission: PERMISSIONS.SERVICE_JOBS_VIEW },
        { to: '/autoparts/parts', label: 'Parts', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/autoparts/vehicles', label: 'Vehicles', icon: Car, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/autoparts/reminders', label: 'Service reminders', icon: Bell, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/autoparts/core-returns', label: 'Old parts', icon: Recycle, permission: PERMISSIONS.RETURNS_VIEW },
        { to: '/autoparts/mechanics', label: 'Mechanics', icon: UserCog, permission: PERMISSIONS.SERVICE_JOBS_VIEW },
        { to: '/autoparts/makes', label: 'Make / model', icon: Truck, permission: PERMISSIONS.PRODUCTS_VIEW },
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
      { value: 'pcs', label: 'Pieces', hint: '🔢', group: 'Count' },
      { value: 'set', label: 'Set', hint: '📦', group: 'Count' },
      { value: 'pair', label: 'Pair', hint: '🔗', group: 'Count' },
      { value: 'liter', label: 'Liter (oils/fluids)', hint: '🛢️', group: 'Volume' },
      { value: 'ml', label: 'Milliliter', hint: '🛢️', group: 'Volume' },
      { value: 'meter', label: 'Meter (wires/hoses)', hint: '📏', group: 'Length' },
      { value: 'feet', label: 'Feet', hint: '📏', group: 'Length' },
      { value: 'kg', label: 'Kilogram', hint: '⚖️', group: 'Weight' },
    ],
  },

  featureFlags: [
    { key: 'autoVehicleRegistry', label: 'Customer Vehicles', defaultEnabled: true },
    { key: 'autoPartFitment', label: 'Part Compatibility', defaultEnabled: true },
    { key: 'autoWorkshopJobs', label: 'Workshop Jobs', defaultEnabled: true },
    { key: 'autoMechanics', label: 'Mechanic Profiles', defaultEnabled: true },
    { key: 'autoReminders', label: 'Service Reminders', defaultEnabled: true },
  ],
};

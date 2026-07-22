import { Car, LayoutDashboard, Wrench, Package, Truck, Cog, Users, Bell, Sparkles } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import AutoPartsDashboardPage from './pages/AutoPartsDashboardPage';
import VehicleMakesPage from './pages/VehicleMakesPage';
import VehicleModelsPage from './pages/VehicleModelsPage';
import CustomerVehiclesPage from './pages/CustomerVehiclesPage';
import PartsPage from './pages/PartsPage';
import WorkshopJobsPage from './pages/WorkshopJobsPage';
import NewWorkshopJobPage from './pages/NewWorkshopJobPage';
import WorkshopJobDetailPage from './pages/WorkshopJobDetailPage';
import MechanicsPage from './pages/MechanicsPage';
import ServiceRemindersPage from './pages/ServiceRemindersPage';
import AutoPartWizardPage from './pages/AutoPartWizardPage';
import AutoPartDetailPage from './pages/AutoPartDetailPage';

/**
 * Auto Parts / Workshop / Mechanic / Garage industry pack.
 * Vehicle registry, part compatibility, workshop jobs, mechanics, reminders.
 */
export const AutoPartsPack: IndustryPack = {
  id: 'autoparts',
  name: 'Auto Parts / Workshop',
  shortName: 'Auto Parts',
  emoji: '🔧',
  themeColor: '#475569',
  priority: 58,
  description:
    'Vehicle makes/models, customer vehicles, part fitment, workshop jobs, mechanics, service reminders (oil/token/insurance).',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('AUTO') ||
      type.includes('WORKSHOP') ||
      type.includes('GARAGE') ||
      type.includes('MECHANIC') ||
      type.includes('SPARE') ||
      type.includes('MOTOR') ||
      type.includes('VEHICLE') ||
      type.includes('CAR')
    );
  },

  navGroups: [
    {
      label: 'Auto Parts / Workshop',
      icon: Car,
      emoji: '🔧',
      color: '#475569',
      order: 20,
      items: [
        { to: '/autoparts-products/new', label: '+ Add Auto Part', icon: Sparkles, badge: 'FAST' },
        { to: '/autoparts/dashboard', label: 'Workshop Dashboard', icon: LayoutDashboard },
        { to: '/autoparts/jobs', label: 'Workshop Jobs', icon: Wrench },
        { to: '/autoparts/vehicles', label: 'Customer Vehicles', icon: Car },
        { to: '/autoparts/parts', label: 'Parts Catalog', icon: Package },
        { to: '/autoparts/makes', label: 'Vehicle Makes', icon: Truck },
        { to: '/autoparts/models', label: 'Vehicle Models', icon: Cog },
        { to: '/autoparts/mechanics', label: 'Mechanics', icon: Users },
        { to: '/autoparts/reminders', label: 'Service Reminders', icon: Bell },
      ],
    },
  ],

  routes: [
    // Wizard + Detail — highest priority auto part routes
    { path: '/autoparts-products/new', element: AutoPartWizardPage },
    { path: '/autoparts-products/:id/edit', element: AutoPartWizardPage },
    { path: '/autoparts-products/:id', element: AutoPartDetailPage },

    // Existing pages
    { path: '/autoparts', element: AutoPartsDashboardPage },
    { path: '/autoparts/dashboard', element: AutoPartsDashboardPage },
    { path: '/autoparts/jobs/new', element: NewWorkshopJobPage },
    { path: '/autoparts/jobs/:id', element: WorkshopJobDetailPage },
    { path: '/autoparts/jobs', element: WorkshopJobsPage },
    { path: '/autoparts/vehicles', element: CustomerVehiclesPage },
    { path: '/autoparts/parts', element: PartsPage },
    { path: '/autoparts/makes', element: VehicleMakesPage },
    { path: '/autoparts/models', element: VehicleModelsPage },
    { path: '/autoparts/mechanics', element: MechanicsPage },
    { path: '/autoparts/reminders', element: ServiceRemindersPage },
  ],

  dashboardComponent: AutoPartsDashboardPage,

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

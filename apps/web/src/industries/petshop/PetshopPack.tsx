import { LayoutDashboard, PawPrint, Scissors, Heart, Users } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';

import PetshopDashboard from './dashboard/PetshopDashboard';
import PetshopProductsPage from './pages/PetshopProductsPage';
import PetshopProductWizardPage from './pages/PetshopProductWizardPage';
import PetshopProductDetailPage from './pages/PetshopProductDetailPage';
import PetshopPosPage from './pages/PetshopPosPage';
import LiveAnimalsPage from './pages/LiveAnimalsPage';
import LiveAnimalFormPage from './pages/LiveAnimalFormPage';
import LiveAnimalDetailPage from './pages/LiveAnimalDetailPage';
import GroomingPage from './pages/GroomingPage';
import GroomingFormPage from './pages/GroomingFormPage';
import GroomersPage from './pages/GroomersPage';

export const PetshopPack: IndustryPack = {
  id: 'petshop',
  name: 'Pet Shop & Vet Store',
  shortName: 'Pet Shop',
  emoji: '🐾',
  priority: 76,
  description:
    'Pet food, accessories, aquarium, vet medicine, live animals with health tracking, grooming appointments.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('PET') || type.includes('VET') ||
      type.includes('AQUARIUM') || type.includes('ANIMAL')
    );
  },

  navGroups: [
    {
      label: 'Pet shop',
      icon: PawPrint,
      emoji: '🐾',
      color: '#f59e0b',
      order: 20,
      items: [
        { to: '/petshop/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/petshop/live-animals', label: 'Live animals', icon: Heart },
        { to: '/petshop/grooming', label: 'Grooming', icon: Scissors },
        { to: '/petshop/groomers', label: 'Groomers', icon: Users },
      ],
    },
  ],

  routes: [
    { path: '/pos', element: PetshopPosPage },

    { path: '/petshop-products/new', element: PetshopProductWizardPage },
    { path: '/petshop-products/:id/edit', element: PetshopProductWizardPage },
    { path: '/petshop-products/:id', element: PetshopProductDetailPage },
    { path: '/petshop-products', element: PetshopProductsPage },

    { path: '/petshop', element: PetshopDashboard },
    { path: '/petshop/dashboard', element: PetshopDashboard },

    { path: '/petshop/live-animals/new', element: LiveAnimalFormPage },
    { path: '/petshop/live-animals/:id/edit', element: LiveAnimalFormPage },
    { path: '/petshop/live-animals/:id', element: LiveAnimalDetailPage },
    { path: '/petshop/live-animals', element: LiveAnimalsPage },

    { path: '/petshop/grooming/new', element: GroomingFormPage },
    { path: '/petshop/grooming/:id/edit', element: GroomingFormPage },
    { path: '/petshop/grooming', element: GroomingPage },

    { path: '/petshop/groomers', element: GroomersPage },
  ],

  dashboardComponent: PetshopDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Pieces', hint: '🐾', group: 'Count' },
      { value: 'kg', label: 'Kilograms', hint: '⚖️', group: 'Weight' },
      { value: 'g', label: 'Grams', hint: '⚖️', group: 'Weight' },
      { value: 'ml', label: 'Milliliters', hint: '🧴', group: 'Volume' },
      { value: 'l', label: 'Liters', hint: '🧴', group: 'Volume' },
      { value: 'pack', label: 'Pack', hint: '📦', group: 'Count' },
    ],
  },

  featureFlags: [
    { key: 'petshopLiveAnimals', label: 'Live Animals Inventory', defaultEnabled: true },
    { key: 'petshopGrooming', label: 'Grooming Appointments', defaultEnabled: true },
    { key: 'petshopVetMedicine', label: 'Vet Medicine + Expiry Tracking', defaultEnabled: true },
    { key: 'petshopAquarium', label: 'Aquarium Products', defaultEnabled: true },
  ],
};

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
import { t } from '@core/i18n';

export const PetshopPack: IndustryPack = {
  id: 'petshop',
  name: 'Pet Shop & Vet Store',
  shortName: t('Pet Shop'),
  emoji: '🐾',
  priority: 76,
  description:
    t('Pet food, accessories, aquarium, vet medicine, live animals with health tracking, grooming appointments.'),

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
      label: t('Pet shop'),
      icon: PawPrint,
      emoji: '🐾',
      color: '#f59e0b',
      order: 20,
      items: [
        { to: '/petshop/dashboard', label: t('Dashboard'), icon: LayoutDashboard },
        { to: '/petshop/live-animals', label: t('Live animals'), icon: Heart },
        { to: '/petshop/grooming', label: t('Grooming'), icon: Scissors },
        { to: '/petshop/groomers', label: t('Groomers'), icon: Users },
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
      { value: 'pcs', label: t('Pieces'), hint: '🐾', group: t('Count') },
      { value: 'kg', label: t('Kilograms'), hint: '⚖️', group: t('Weight') },
      { value: 'g', label: t('Grams'), hint: '⚖️', group: t('Weight') },
      { value: 'ml', label: t('Milliliters'), hint: '🧴', group: t('Volume') },
      { value: 'l', label: t('Liters'), hint: '🧴', group: t('Volume') },
      { value: 'pack', label: t('Pack'), hint: '📦', group: t('Count') },
    ],
  },

  featureFlags: [
    { key: 'petshopLiveAnimals', label: t('Live Animals Inventory'), defaultEnabled: true },
    { key: 'petshopGrooming', label: t('Grooming Appointments'), defaultEnabled: true },
    { key: 'petshopVetMedicine', label: t('Vet Medicine + Expiry Tracking'), defaultEnabled: true },
    { key: 'petshopAquarium', label: t('Aquarium Products'), defaultEnabled: true },
  ],
};

/**
 * Nafaa Stores (website builder), merchant side: every website page,
 * loaded lazily by the router.
 */

import { lazy } from 'react';

export const WebsiteHomePage = lazy(() => import('./pages/WebsiteHomePage'));
export const SetupWizardPage = lazy(() => import('./pages/SetupWizardPage'));
export const ThemeEditorPage = lazy(() => import('./pages/ThemeEditorPage'));
export const PagesPage = lazy(() => import('./pages/PagesPage'));
export const ContentEditPage = lazy(() => import('./pages/ContentEditPage'));
export const NavigationPage = lazy(() => import('./pages/NavigationPage'));
export const CollectionsPage = lazy(() => import('./pages/CollectionsPage'));
export const CollectionEditPage = lazy(() => import('./pages/CollectionEditPage'));
export const WebsiteProductsPage = lazy(() => import('./pages/WebsiteProductsPage'));
export const DomainsPage = lazy(() => import('./pages/DomainsPage'));
export const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
export const ShippingPage = lazy(() => import('./pages/ShippingPage'));
export const PoliciesPage = lazy(() => import('./pages/PoliciesPage'));
export const PreferencesPage = lazy(() => import('./pages/PreferencesPage'));
export const WebsiteAnalyticsPage = lazy(() => import('./pages/WebsiteAnalyticsPage'));
export const ShopifyMovePage = lazy(() => import('./pages/ShopifyMovePage'));
export const ThemeImportPage = lazy(() => import('./pages/ThemeImportPage'));

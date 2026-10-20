import { BookOpen, LayoutDashboard, Plus, Users, Building2, School, ClipboardList, Palette, Pencil, Timer } from 'lucide-react';
import type { IndustryPack } from '@industries/_shared/types/industry-pack';
import { PERMISSIONS } from '@core/lib/permissions';

import BookstoreDashboard from './dashboard/BookstoreDashboard';
import BooksPage from './pages/BooksPage';
import AuthorsPage from './pages/AuthorsPage';
import PublishersPage from './pages/PublishersPage';
import SchoolsPage from './pages/SchoolsPage';
import SchoolListsPage from './pages/SchoolListsPage';
import StationeryPage from './pages/StationeryPage';
import ArtSuppliesPage from './pages/ArtSuppliesPage';
import RentalsPage from './pages/RentalsPage';
import BookstoreProductWizardPage from './pages/BookstoreProductWizardPage';
import BookstoreProductDetailPage from './pages/BookstoreProductDetailPage';

/**
 * Bookstore, stationery and art supplies: books with ISBN, authors and
 * publishers (each linked to its supplier, whose discount fills purchase
 * costs), textbooks by board and grade, school book lists sold as a set
 * at the counter, and book rentals with a deposit.
 */
export const BookstorePack: IndustryPack = {
  id: 'bookstore',
  name: 'Bookstore / Stationery / Art Supplies',
  shortName: 'Bookstore',
  emoji: '📚',
  priority: 65,
  description:
    'Books with ISBN/authors/publishers, textbooks (grade/board), stationery, art supplies, school lists, book rentals.',

  matches: (tenant) => {
    if (!tenant) return false;
    const type = (tenant.businessType ?? '').toUpperCase();
    return (
      type.includes('BOOKSTORE') ||
      type.includes('BOOK') ||
      type.includes('STATIONERY') ||
      type.includes('ART_SUPPLY') ||
      type.includes('ART_SUPPLIES') ||
      type.includes('LIBRARY') ||
      type.includes('SCHOOL_STORE')
    );
  },

  navGroups: [
    {
      label: 'Bookstore',
      icon: BookOpen,
      emoji: '📚',
      color: '#d97706',
      order: 20,
      items: [
        { to: '/bookstore/dashboard', label: 'Bookstore dashboard', icon: LayoutDashboard },
        { to: '/bookstore-products/new', label: 'Nayi kitab / item', icon: Plus, permission: PERMISSIONS.PRODUCTS_CREATE },
        { to: '/bookstore/books', label: 'Books', icon: BookOpen, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/bookstore/stationery', label: 'Stationery', icon: Pencil, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/bookstore/art-supplies', label: 'Art supplies', icon: Palette, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/bookstore/authors', label: 'Authors', icon: Users, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/bookstore/publishers', label: 'Publishers', icon: Building2, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/bookstore/schools', label: 'Schools', icon: School, permission: PERMISSIONS.CUSTOMERS_VIEW },
        { to: '/bookstore/school-lists', label: 'School book lists', icon: ClipboardList, permission: PERMISSIONS.PRODUCTS_VIEW },
        { to: '/bookstore/rentals', label: 'Book rentals', icon: Timer, permission: PERMISSIONS.POS_USE },
      ],
    },
  ],

  routes: [
    { path: '/bookstore-products/new', element: BookstoreProductWizardPage, permission: PERMISSIONS.PRODUCTS_CREATE },
    { path: '/bookstore-products/:id/edit', element: BookstoreProductWizardPage, permission: PERMISSIONS.PRODUCTS_EDIT },
    { path: '/bookstore-products/:id', element: BookstoreProductDetailPage, permission: PERMISSIONS.PRODUCTS_VIEW },

    { path: '/bookstore', element: BookstoreDashboard },
    { path: '/bookstore/dashboard', element: BookstoreDashboard },
    { path: '/bookstore/books', element: BooksPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/bookstore/stationery', element: StationeryPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/bookstore/art-supplies', element: ArtSuppliesPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/bookstore/authors', element: AuthorsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/bookstore/publishers', element: PublishersPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/bookstore/schools', element: SchoolsPage, permission: PERMISSIONS.CUSTOMERS_VIEW },
    { path: '/bookstore/school-lists', element: SchoolListsPage, permission: PERMISSIONS.PRODUCTS_VIEW },
    { path: '/bookstore/rentals', element: RentalsPage, permission: PERMISSIONS.POS_USE },
  ],

  dashboardComponent: BookstoreDashboard,

  productForm: {
    defaultUnit: 'pcs',
    unitOptions: [
      { value: 'pcs', label: 'Piece', hint: '🔢', group: 'Count' },
      { value: 'set', label: 'Set', hint: '📦', group: 'Count' },
      { value: 'pack', label: 'Pack', hint: '📦', group: 'Count' },
      { value: 'box', label: 'Box', hint: '📦', group: 'Count' },
      { value: 'dozen', label: 'Dozen', hint: '📦', group: 'Count' },
      { value: 'kg', label: 'Kg', hint: '⚖️', group: 'Weight' },
      { value: 'gram', label: 'Gram', hint: '⚖️', group: 'Weight' },
      { value: 'ml', label: 'ML', hint: '🥛', group: 'Volume' },
    ],
  },

  featureFlags: [
    { key: 'bookstoreBooks', label: 'Book Profiles (ISBN, Publishers)', defaultEnabled: true },
    { key: 'bookstoreAuthors', label: 'Author Management', defaultEnabled: true },
    { key: 'bookstoreStationery', label: 'Stationery Profiles', defaultEnabled: true },
    { key: 'bookstoreArtSupplies', label: 'Art Supplies Profiles', defaultEnabled: true },
    { key: 'bookstoreSchools', label: 'School Integration', defaultEnabled: true },
    { key: 'bookstoreSchoolLists', label: 'School Book Lists', defaultEnabled: true },
    { key: 'bookstoreRentals', label: 'Book Rentals', defaultEnabled: false },
  ],
};

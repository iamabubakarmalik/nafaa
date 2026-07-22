import { BookOpen, LayoutDashboard, Sparkles, Users, Building2, School, ClipboardList, Palette, Pencil, Timer } from 'lucide-react';
import type { IndustryPack } from '@/features/industries/_shared/types/industry-pack';

// Existing pages
import BookstoreDashboardPage from './pages/BookstoreDashboardPage';
import BooksPage from './pages/BooksPage';
import AuthorsPage from './pages/AuthorsPage';
import PublishersPage from './pages/PublishersPage';
import SchoolsPage from './pages/SchoolsPage';
import SchoolListsPage from './pages/SchoolListsPage';
import StationeryPage from './pages/StationeryPage';
import ArtSuppliesPage from './pages/ArtSuppliesPage';
import RentalsPage from './pages/RentalsPage';

// Wizard pages
import BookstoreProductWizardPage from './pages/BookstoreProductWizardPage';
import BookstoreProductDetailPage from './pages/BookstoreProductDetailPage';

/**
 * Bookstore / Stationery / Art Supply industry pack.
 * Books (ISBN, authors, publishers, textbooks with grade/board),
 * stationery (pens, notebooks, files),
 * art supplies (paints, brushes, canvas).
 * Plus: school integrations, book rentals.
 */
export const BookstorePack: IndustryPack = {
  id: 'bookstore',
  name: 'Bookstore / Stationery / Art Supplies',
  shortName: 'Bookstore',
  emoji: '📚',
  themeColor: '#d97706',
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
      label: 'Bookstore Industry',
      icon: BookOpen,
      emoji: '📚',
      color: '#d97706',
      order: 20,
      items: [
        { to: '/bookstore-products/new', label: '+ Add Product', icon: Sparkles, badge: 'FAST' },
        { to: '/bookstore/dashboard', label: 'Bookstore Dashboard', icon: LayoutDashboard },
        { to: '/bookstore/books', label: 'Books', icon: BookOpen },
        { to: '/bookstore/stationery', label: 'Stationery', icon: Pencil },
        { to: '/bookstore/art-supplies', label: 'Art Supplies', icon: Palette },
        { to: '/bookstore/authors', label: 'Authors', icon: Users },
        { to: '/bookstore/publishers', label: 'Publishers', icon: Building2 },
        { to: '/bookstore/schools', label: 'Schools', icon: School },
        { to: '/bookstore/school-lists', label: 'School Book Lists', icon: ClipboardList },
        { to: '/bookstore/rentals', label: 'Book Rentals', icon: Timer },
      ],
    },
  ],

  routes: [
    // Wizard + Detail — highest priority
    { path: '/bookstore-products/new', element: BookstoreProductWizardPage },
    { path: '/bookstore-products/:id/edit', element: BookstoreProductWizardPage },
    { path: '/bookstore-products/:id', element: BookstoreProductDetailPage },

    // Existing pages
    { path: '/bookstore', element: BookstoreDashboardPage },
    { path: '/bookstore/dashboard', element: BookstoreDashboardPage },
    { path: '/bookstore/books', element: BooksPage },
    { path: '/bookstore/stationery', element: StationeryPage },
    { path: '/bookstore/art-supplies', element: ArtSuppliesPage },
    { path: '/bookstore/authors', element: AuthorsPage },
    { path: '/bookstore/publishers', element: PublishersPage },
    { path: '/bookstore/schools', element: SchoolsPage },
    { path: '/bookstore/school-lists', element: SchoolListsPage },
    { path: '/bookstore/rentals', element: RentalsPage },
  ],

  dashboardComponent: BookstoreDashboardPage,

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

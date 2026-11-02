/**
 * Bookstore dashboard: the standard dashboard plus book rentals, school
 * lists and textbook grades, and the catalog split.
 */

import {
  BarChart3, BookMarked, BookOpen, Building2, ClipboardList, GraduationCap, Palette, PenTool, Plus, Receipt, School,
  ShoppingCart, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useBookstoreOps } from './useBookstoreOps';
import { BookstoreCatalog, BookstoreRentals, BookstoreSchool, bookstoreKpis, useBookstoreAttention } from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/bookstore-products/${id}`;

function useBookstoreActions(): QuickAction[] {
  const { data } = useOverview();
  const { totals, rentals, school } = useBookstoreOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/bookstore-products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Kitaab ya stationery') },
    { to: '/bookstore/books', icon: BookOpen, label: t('Kitaben'), hint: t('{{books}} kitaben', { books: totals.books }) },
    { to: '/bookstore/stationery', icon: PenTool, label: t('Stationery'), hint: t('{{stationery}} cheezein', { stationery: totals.stationery }) },
    { to: '/bookstore/art-supplies', icon: Palette, label: t('Art supplies'), hint: t('{{artSupplies}} cheezein', { artSupplies: totals.artSupplies }) },
    { to: '/bookstore/school-lists', icon: ClipboardList, label: t('School lists'), hint: school.lists ? t('{{lists}} chaalu', { lists: school.lists }) : t('List banayein') },
    { to: '/bookstore/schools', icon: School, label: t('Schools'), hint: t('{{schools}} schools', { schools: school.schools }) },
    { to: '/bookstore/rentals', icon: BookMarked, label: t('Kiraya'), hint: rentals.overdue ? t('{{overdue}} late', { overdue: rentals.overdue }) : t('{{active}} bahar', { active: rentals.active }) },
    { to: '/bookstore/authors', icon: Users, label: t('Authors'), hint: t('{{authors}} authors', { authors: totals.authors }) },
    { to: '/bookstore/publishers', icon: Building2, label: t('Publishers'), hint: t('{{publishers}} publishers', { publishers: totals.publishers }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const bookstoreDashboard = createDashboard({
  label: t('Bookstore'),
  productPath,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: bookstoreKpis,
  defaultKpis: ['bookstore-rentals', 'bookstore-school-lists', 'profit', 'month', 'cash', 'low-stock'],
  useAttention: useBookstoreAttention,
  widgets: [
    { id: 'bookstore-rentals', title: t('Late kitaben'), description: t('Kiraye ki kitaben jo waqt par wapas nahi aayin'), size: 'third', sizes: ANY_SIZE, Component: BookstoreRentals },
    { id: 'bookstore-school', title: t('School aur textbooks'), description: t('Chaalu school lists aur class ke hisaab se textbooks'), size: 'third', sizes: ['third', 'half', 'wide'], Component: BookstoreSchool },
    { id: 'bookstore-catalog', title: t('Maal ki details'), description: t('Kitaben, stationery, art supplies aur top publishers'), size: 'third', sizes: ['third', 'half', 'wide'], Component: BookstoreCatalog },
  ],
  useQuickActions: useBookstoreActions,
  moneyMap: { productsPath: '/products' },
  guide: [
    { icon: GraduationCap, title: t('School season'), text: t('School list bana kar rakhein — parents poora set ek saath lete hain. Class ke hisaab se textbooks dekh kar season se pehle stock poora kar lein.') },
    { icon: BookMarked, title: t('Kiraye ki kitaben'), text: t('Jo kitaab waqt par wapas nahi aayi wo upar dikhti hai, kitne din late aur kitna jurmana — seedha customer ko call karein.') },
  ],
});

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

const productPath = (id: string) => `/bookstore-products/${id}`;

function useBookstoreActions(): QuickAction[] {
  const { data } = useOverview();
  const { totals, rentals, school } = useBookstoreOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Sale karein' },
    { to: '/bookstore-products/new', icon: Plus, label: 'Nayi cheez', hint: 'Kitaab ya stationery' },
    { to: '/bookstore/books', icon: BookOpen, label: 'Kitaben', hint: `${totals.books} kitaben` },
    { to: '/bookstore/stationery', icon: PenTool, label: 'Stationery', hint: `${totals.stationery} cheezein` },
    { to: '/bookstore/art-supplies', icon: Palette, label: 'Art supplies', hint: `${totals.artSupplies} cheezein` },
    { to: '/bookstore/school-lists', icon: ClipboardList, label: 'School lists', hint: school.lists ? `${school.lists} chaalu` : 'List banayein' },
    { to: '/bookstore/schools', icon: School, label: 'Schools', hint: `${school.schools} schools` },
    { to: '/bookstore/rentals', icon: BookMarked, label: 'Kiraya', hint: rentals.overdue ? `${rentals.overdue} late` : `${rentals.active} bahar` },
    { to: '/bookstore/authors', icon: Users, label: 'Authors', hint: `${totals.authors} authors` },
    { to: '/bookstore/publishers', icon: Building2, label: 'Publishers', hint: `${totals.publishers} publishers` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const bookstoreDashboard = createDashboard({
  label: 'Bookstore',
  productPath,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: bookstoreKpis,
  defaultKpis: ['bookstore-rentals', 'bookstore-school-lists', 'profit', 'month', 'cash', 'low-stock'],
  useAttention: useBookstoreAttention,
  widgets: [
    { id: 'bookstore-rentals', title: 'Late kitaben', description: 'Kiraye ki kitaben jo waqt par wapas nahi aayin', size: 'third', sizes: ANY_SIZE, Component: BookstoreRentals },
    { id: 'bookstore-school', title: 'School aur textbooks', description: 'Chaalu school lists aur class ke hisaab se textbooks', size: 'third', sizes: ['third', 'half', 'wide'], Component: BookstoreSchool },
    { id: 'bookstore-catalog', title: 'Maal ki details', description: 'Kitaben, stationery, art supplies aur top publishers', size: 'third', sizes: ['third', 'half', 'wide'], Component: BookstoreCatalog },
  ],
  useQuickActions: useBookstoreActions,
  moneyMap: { productsPath: '/products' },
  guide: [
    { icon: GraduationCap, title: 'School season', text: 'School list bana kar rakhein — parents poora set ek saath lete hain. Class ke hisaab se textbooks dekh kar season se pehle stock poora kar lein.' },
    { icon: BookMarked, title: 'Kiraye ki kitaben', text: 'Jo kitaab waqt par wapas nahi aayi wo upar dikhti hai, kitne din late aur kitna jurmana — seedha customer ko call karein.' },
  ],
});

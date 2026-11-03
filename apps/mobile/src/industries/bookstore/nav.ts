/** More-menu items for the bookstore pack (gathered by ../nav.ts). */

import { BookOpen, Building2, ClipboardList, LayoutDashboard, Palette, Pencil, School, Timer, Users } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

// Web BookstorePack navGroups; screens in src/industries/bookstore.
export const NAV: NavItem[] = [
  { to: '/bookstore/dashboard', href: '/bookstore', label: msg('Bookstore dashboard'), icon: LayoutDashboard, industries: ['bookstore'], permission: P.DASHBOARD_VIEW, module: 'industry', keywords: 'bookstore overview kitab' },
  { to: '/bookstore/books', href: '/bookstore/books', label: msg('Books'), icon: BookOpen, industries: ['bookstore'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'kitab isbn textbook novel' },
  { to: '/bookstore/stationery', href: '/bookstore/stationery', label: msg('Stationery'), icon: Pencil, industries: ['bookstore'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'copy pen register geometry' },
  { to: '/bookstore/art-supplies', href: '/bookstore/art-supplies', label: msg('Art supplies'), icon: Palette, industries: ['bookstore'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'rang brush canvas' },
  { to: '/bookstore/authors', href: '/bookstore/authors', label: msg('Authors'), icon: Users, industries: ['bookstore'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'author likhne wale' },
  { to: '/bookstore/publishers', href: '/bookstore/publishers', label: msg('Publishers'), icon: Building2, industries: ['bookstore'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'publisher oxford discount' },
  { to: '/bookstore/schools', href: '/bookstore/schools', label: msg('Schools'), icon: School, industries: ['bookstore'], permission: P.CUSTOMERS_VIEW, module: 'industry', keywords: 'school khata institute' },
  { to: '/bookstore/school-lists', href: '/bookstore/school-lists', label: msg('School book lists'), icon: ClipboardList, industries: ['bookstore'], permission: P.PRODUCTS_VIEW, module: 'industry', keywords: 'class set list' },
  { to: '/bookstore/rentals', href: '/bookstore/rentals', label: msg('Book rentals'), icon: Timer, industries: ['bookstore'], permission: P.POS_USE, module: 'industry', keywords: 'kiraya deposit rental' },
];

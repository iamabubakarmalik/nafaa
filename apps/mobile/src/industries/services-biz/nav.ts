/** More-menu items for the services pack (web ServicesBizPack navGroups; gathered by ../nav-services.ts). */

import { Award, Briefcase, FileText, LayoutDashboard, Package, Plus, ShieldCheck, Users, Truck } from 'lucide-react-native';
import { msg } from '@/core/i18n';
import { PERMISSIONS as P } from '@/core/permissions';
import type { NavItem } from '@/modules/shell/navigation/nav-config';

const item = (to: string, label: string, icon: NavItem['icon'], permission: NavItem['permission'], keywords: string): NavItem => ({ to, href: to, label, icon, industries: ['services-biz'], permission, module: 'industry', keywords });

export const NAV: NavItem[] = [
  item('/services-biz/jobs/new', msg('New job'), Plus, P.SERVICE_JOBS_MANAGE, 'new job work order ticket'),
  item('/services-biz/jobs', msg('Jobs'), Briefcase, P.SERVICE_JOBS_VIEW, 'job work order invoice technician'),
  item('/services-biz/dispatch', msg('Dispatch'), Truck, P.SERVICE_JOBS_VIEW, 'dispatch assign technician area field map'),
  item('/services-biz/quotes', msg('Quotes'), FileText, P.SERVICE_JOBS_VIEW, 'quotation estimate'),
  item('/services-biz/catalog', msg('Service catalog'), Package, P.PRODUCTS_VIEW, 'service rate list'),
  item('/services-biz/technicians', msg('Technicians'), Users, P.SERVICE_JOBS_VIEW, 'technician commission'),
  item('/services-biz/amc', msg('AMC contracts'), Award, P.SERVICE_JOBS_VIEW, 'amc contract yearly'),
  item('/services-biz/warranty', msg('Warranty'), ShieldCheck, P.SERVICE_JOBS_VIEW, 'warranty claim'),
  { ...item('/services-biz/dashboard', msg('Services dashboard'), LayoutDashboard, P.DASHBOARD_VIEW, 'services overview'), href: '/services-biz' },
];

/**
 * Auto parts dashboard: the standard dashboard plus the workshop job board,
 * promised dates, service reminders and mechanic output.
 */

import {
  BarChart3, Bell, BookOpen, Car, Package, Plus, Receipt, ShoppingCart, Truck, UserCog, Users, Wrench, Zap,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useAutoPartsOps } from './useAutoPartsOps';
import {
  AutoPartsJobs, AutoPartsMechanics, AutoPartsReminders, AutoPartsWorkshop, autoPartsKpis, useAutoPartsAttention,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/autoparts-parts/${id}`;

function useAutoPartsActions(): QuickAction[] {
  const { data } = useOverview();
  const { board, jobs, reminders } = useAutoPartsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Parts bechein') },
    { to: '/autoparts/jobs/new', icon: Zap, label: t('Naya job'), hint: t('Gaari receive karein') },
    { to: jobs.overdue.length ? '/autoparts/jobs?view=late' : '/autoparts/jobs', icon: Wrench, label: t('Workshop jobs'), hint: jobs.overdue.length ? t('{{count}} late', { count: jobs.overdue.length }) : t('{{activeJobs}} chal rahe', { activeJobs: board.activeJobs }) },
    { to: '/autoparts/vehicles', icon: Car, label: t('Gaariyan'), hint: t('{{totalVehicles}} darj', { totalVehicles: board.totalVehicles }) },
    { to: '/autoparts/reminders', icon: Bell, label: t('Reminders'), hint: reminders.overdue.length ? t('{{count}} guzar gaye', { count: reminders.overdue.length }) : t('{{count}} aane wale', { count: reminders.upcoming.length }) },
    { to: '/autoparts/mechanics', icon: UserCog, label: t('Mechanic'), hint: t('{{totalMechanics}} log', { totalMechanics: board.totalMechanics }) },
    { to: '/autoparts-parts/new', icon: Plus, label: t('Naya part'), hint: t('Maal me daalein') },
    { to: '/autoparts/parts', icon: Package, label: t('Parts'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/autoparts/makes', icon: Truck, label: t('Company / model'), hint: t('Toyota, Suzuki…') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const autoPartsDashboard = createDashboard({
  label: t('Auto Parts'),
  productPath,
  openFrom: 9,
  kpis: autoPartsKpis,
  defaultKpis: ['autoparts-jobs', 'autoparts-ready', 'autoparts-reminders', 'profit', 'cash', 'month'],
  useAttention: useAutoPartsAttention,
  widgets: [
    { id: 'autoparts-workshop', title: t('Workshop board'), description: t('Chal rahe, parts ke intezar me aur tayyar job'), size: 'third', sizes: ['third', 'half'], Component: AutoPartsWorkshop },
    { id: 'autoparts-jobs', title: t('Gaari kab deni hai'), description: t('Late aur aane wale job, waade ke waqt se'), size: 'third', sizes: ANY_SIZE, Component: AutoPartsJobs },
    { id: 'autoparts-reminders', title: t('Service reminder'), description: t('Oil change, service aur kaghzat ki yaad-dihani'), size: 'third', sizes: ANY_SIZE, Component: AutoPartsReminders },
  ],
  lateWidgets: [
    { id: 'autoparts-mechanics', title: t('Mechanic ka kaam'), description: t('30 din me kis mechanic ne kitna kaam kiya'), size: 'third', sizes: ANY_SIZE, Component: AutoPartsMechanics },
  ],
  useQuickActions: useAutoPartsActions,
  moneyMap: { productsPath: '/autoparts/parts' },
  guide: [
    { icon: Wrench, title: t('Workshop board'), text: t('Kaunsi gaari par kaam chal raha hai, kaunsi parts ke intezar me ruki hai aur kaunsi tayyar hai. Waade se late gaari laal me sab se upar.') },
    { icon: Bell, title: t('Reminder se dobara customer'), text: t('Oil change aur service ki date guzarne par customer ko call karein. Insurance, token aur fitness khatam hone wali gaariyan bhi yahan nazar aati hain.') },
  ],
});

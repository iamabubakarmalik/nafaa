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

const productPath = (id: string) => `/autoparts-parts/${id}`;

function useAutoPartsActions(): QuickAction[] {
  const { data } = useOverview();
  const { board, jobs, reminders } = useAutoPartsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Parts bechein' },
    { to: '/autoparts/jobs/new', icon: Zap, label: 'Naya job', hint: 'Gaari receive karein' },
    { to: jobs.overdue.length ? '/autoparts/jobs?view=late' : '/autoparts/jobs', icon: Wrench, label: 'Workshop jobs', hint: jobs.overdue.length ? `${jobs.overdue.length} late` : `${board.activeJobs} chal rahe` },
    { to: '/autoparts/vehicles', icon: Car, label: 'Gaariyan', hint: `${board.totalVehicles} darj` },
    { to: '/autoparts/reminders', icon: Bell, label: 'Reminders', hint: reminders.overdue.length ? `${reminders.overdue.length} guzar gaye` : `${reminders.upcoming.length} aane wale` },
    { to: '/autoparts/mechanics', icon: UserCog, label: 'Mechanic', hint: `${board.totalMechanics} log` },
    { to: '/autoparts-parts/new', icon: Plus, label: 'Naya part', hint: 'Maal me daalein' },
    { to: '/autoparts/parts', icon: Package, label: 'Parts', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/autoparts/makes', icon: Truck, label: 'Company / model', hint: 'Toyota, Suzuki…' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const autoPartsDashboard = createDashboard({
  label: 'Auto Parts',
  productPath,
  openFrom: 9,
  kpis: autoPartsKpis,
  defaultKpis: ['autoparts-jobs', 'autoparts-ready', 'autoparts-reminders', 'profit', 'cash', 'month'],
  useAttention: useAutoPartsAttention,
  widgets: [
    { id: 'autoparts-workshop', title: 'Workshop board', description: 'Chal rahe, parts ke intezar me aur tayyar job', size: 'third', sizes: ['third', 'half'], Component: AutoPartsWorkshop },
    { id: 'autoparts-jobs', title: 'Gaari kab deni hai', description: 'Late aur aane wale job, waade ke waqt se', size: 'third', sizes: ANY_SIZE, Component: AutoPartsJobs },
    { id: 'autoparts-reminders', title: 'Service reminder', description: 'Oil change, service aur kaghzat ki yaad-dihani', size: 'third', sizes: ANY_SIZE, Component: AutoPartsReminders },
  ],
  lateWidgets: [
    { id: 'autoparts-mechanics', title: 'Mechanic ka kaam', description: '30 din me kis mechanic ne kitna kaam kiya', size: 'third', sizes: ANY_SIZE, Component: AutoPartsMechanics },
  ],
  useQuickActions: useAutoPartsActions,
  moneyMap: { productsPath: '/autoparts/parts' },
  guide: [
    { icon: Wrench, title: 'Workshop board', text: 'Kaunsi gaari par kaam chal raha hai, kaunsi parts ke intezar me ruki hai aur kaunsi tayyar hai. Waade se late gaari laal me sab se upar.' },
    { icon: Bell, title: 'Reminder se dobara customer', text: 'Oil change aur service ki date guzarne par customer ko call karein. Insurance, token aur fitness khatam hone wali gaariyan bhi yahan nazar aati hain.' },
  ],
});

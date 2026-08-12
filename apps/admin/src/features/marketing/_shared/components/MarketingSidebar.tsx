import { NavLink, Link } from 'react-router-dom';
import {
  BarChart3, Mail, MessageSquare, Calendar, Users, Bot, Megaphone,
  TrendingUp, Search, Beaker, MousePointer2, FileText, Target, Download,
  ChevronLeft, LayoutDashboard,
} from 'lucide-react';
import { cn } from '../../../../lib/cn';

const NAV = [
  { to: '/marketing', label: 'Dashboard', icon: BarChart3, end: true },
  { to: '/marketing/newsletter', label: 'Newsletter', icon: Mail },
  { to: '/marketing/contact-forms', label: 'Contact Forms', icon: MessageSquare },
  { to: '/marketing/demos', label: 'Demo Bookings', icon: Calendar },
  { to: '/marketing/leads', label: 'Leads', icon: Users },
  { to: '/marketing/chatbot', label: 'Chatbot', icon: Bot },
  { to: '/marketing/campaigns', label: 'Campaigns', icon: Megaphone },
  { type: 'section', label: 'Analytics' },
  { to: '/marketing/analytics', label: 'Traffic', icon: TrendingUp },
  { to: '/marketing/seo', label: 'SEO', icon: Search },
  { to: '/marketing/ab-tests', label: 'A/B Tests', icon: Beaker },
  { to: '/marketing/heatmaps', label: 'Heatmaps', icon: MousePointer2 },
  { to: '/marketing/blog', label: 'Blog Analytics', icon: FileText },
  { to: '/marketing/conversions', label: 'Conversions', icon: Target },
  { type: 'section', label: 'Data' },
  { to: '/marketing/exports', label: 'Exports', icon: Download },
] as const;

export function MarketingSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-neutral-200 bg-white lg:block">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="border-b border-neutral-200 px-5 py-4">
          <Link
            to="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Admin
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900">Marketing</p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">Growth Hub</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map((item, i) =>
            'type' in item ? (
              <p
                key={i}
                className="mt-4 mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400"
              >
                {item.label}
              </p>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={(item as any).end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="border-t border-neutral-200 p-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Main Admin Panel
          </Link>
        </div>
      </div>
    </aside>
  );
}

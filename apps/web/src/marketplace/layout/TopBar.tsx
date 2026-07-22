import { Bell, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <NavLink to="/market" className="text-lg font-extrabold text-emerald-700">
          Nafaa Bazaar
        </NavLink>
        <NavLink to="/market/search" className="flex-1 flex items-center gap-2 h-10 px-3 rounded-xl bg-slate-100 text-slate-500 text-sm">
          <Search className="h-4 w-4" />
          Kya dhoond rahe hain?
        </NavLink>
        <NavLink to="/market/notifications" className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Bell className="h-5 w-5 text-slate-600" />
        </NavLink>
      </div>
    </header>
  );
}

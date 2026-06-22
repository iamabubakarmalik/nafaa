import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Store, User, Settings as SettingsIcon,
  CreditCard, Building2, HelpCircle, ScrollText, LogOut,
} from 'lucide-react';

interface Props {
  user: any;
  tenant: any;
  onLogout: () => void;
}

export function ProfileDropdown({ user, tenant, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initial = user?.fullName?.charAt(0)?.toUpperCase() || 'N';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 p-1 pr-2.5 rounded-2xl transition ${
          open ? 'bg-slate-100 ring-2 ring-brand-500/30' : 'hover:bg-slate-100'
        }`}
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.fullName}
            className="h-9 w-9 rounded-xl object-cover ring-2 ring-white shadow"
          />
        ) : (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white flex items-center justify-center font-bold shadow ring-2 ring-white">
            {initial}
          </div>
        )}
        <div className="hidden md:block text-left">
          <div className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
            {user?.fullName || 'User'}
          </div>
          <div className="text-[10px] text-slate-500 truncate max-w-[140px] font-semibold uppercase tracking-wider">
            {user?.role}
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform hidden md:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow"
                />
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white flex items-center justify-center text-lg font-extrabold shadow">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-slate-900 truncate">{user?.fullName}</div>
                <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                  {user?.role}
                </div>
              </div>
            </div>
          </div>

          {tenant && (
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Current Shop</div>
                <div className="text-sm font-bold text-slate-900 truncate">{tenant.name}</div>
              </div>
            </div>
          )}

          <div className="py-1">
            <MenuItem to="/profile" icon={User} label="My Profile" onClick={() => setOpen(false)} />
            <MenuItem to="/settings" icon={SettingsIcon} label="Settings" onClick={() => setOpen(false)} />
            <MenuItem to="/billing" icon={CreditCard} label="Billing & Plans" onClick={() => setOpen(false)} />
            <MenuItem to="/shops" icon={Building2} label="Shops / Branches" onClick={() => setOpen(false)} />
          </div>

          <div className="border-t border-slate-100 py-1">
            <MenuItem to="/help" icon={HelpCircle} label="Help Center" onClick={() => setOpen(false)} />
            <MenuItem to="/legal" icon={ScrollText} label="Terms & Privacy" onClick={() => setOpen(false)} />
          </div>

          <div className="border-t border-slate-100 py-1">
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  to, icon: Icon, label, onClick,
}: { to: string; icon: any; label: string; onClick: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="w-full px-4 py-2.5 flex items-center gap-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
    >
      <Icon className="h-4 w-4 text-slate-400" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
    </Link>
  );
}

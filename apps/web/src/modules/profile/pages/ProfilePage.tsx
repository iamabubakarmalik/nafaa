/**
 * My profile: personal details, password / email / Google / owner PIN,
 * signed-in devices with login history, and personal preferences.
 *
 * Keys: 1-4 tabs · E edit name · G guide.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Building2, GraduationCap, KeyRound, LogOut, Mail, MonitorSmartphone, Pencil, Settings2, Shield, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, Button, Kbd, Modal, PageShell, Skeleton, ViewTabs } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useAuthStore } from '@core/stores/auth.store';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { authApi } from '@modules/auth/api/auth.api';
import { ProfileInfo } from '../components/ProfileInfo';
import { AccountSecurity } from '../components/AccountSecurity';
import { ActiveSessions } from '../components/ActiveSessions';
import { Preferences } from '../components/Preferences';
import { ROLE, day } from '../components/meta';

type Tab = 'profile' | 'security' | 'devices' | 'preferences';
const TABS: Tab[] = ['profile', 'security', 'devices', 'preferences'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const storeUser = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  const me = useQuery({ queryKey: ['auth-me'], queryFn: authApi.me });
  const user = me.data?.user ?? storeUser;

  const asked = params.get('tab') as Tab | null;
  const tab: Tab = asked && TABS.includes(asked) ? asked : 'profile';
  const setTab = (t: Tab) => setParams((x) => { const n = new URLSearchParams(x); if (t === 'profile') n.delete('tab'); else n.set('tab', t); return n; }, { replace: true });
  const edit = () => { setTab('profile'); setFocusKey((k) => k + 1); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const n = Number(e.key);
      if (n >= 1 && n <= TABS.length) setTab(TABS[n - 1]);
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); edit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const logout = async () => {
    const { refreshToken, logout: clear } = useAuthStore.getState();
    try { if (refreshToken) await authApi.logout(refreshToken); } catch { /* the local sign-out still happens */ }
    clear();
    toast.success('Logout ho gaya');
    navigate('/login');
  };

  if (!user) return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-10 w-96 rounded-xl" /><Skeleton className="h-72 rounded-3xl" /></PageShell>;

  const role = ROLE[user.role] ?? ROLE.STAFF;
  return (
    <PageShell>
      {guide.isOpen && <ProfileGuide onClose={guide.close} />}
      {confirmLogout && (
        <Modal open onClose={() => setConfirmLogout(false)} size="sm" title="Logout karein?" description="Is device se login khatam ho jayega. Data mehfooz rahega."
          footer={<><Button variant="secondary" onClick={() => setConfirmLogout(false)}>Wapas</Button><Button variant="danger" onClick={() => void logout()}><LogOut className="h-4 w-4" /> Logout</Button></>}>
          <p className="text-[0.8125rem] text-slate-600">Dobara aane ke liye email aur password (ya Google) chahiye hoga.</p>
        </Modal>
      )}

      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.fullName} url={user.avatarUrl} size={64} className="ring-2 ring-white/40" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
              {user.fullName}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[0.75rem] font-semibold"><role.icon className="h-3.5 w-3.5" />{role.label}</span>
            </h1>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.8125rem] text-white/80">
              <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{user.email}{user.emailVerified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-200" aria-label="Verified" />}</span>
              {tenant?.name && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{tenant.name}{user.assignedShop?.name ? ` · ${user.assignedShop.name}` : ''}</span>}
              <span>Kab se: {day(user.createdAt)}</span>
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button type="button" onClick={edit} title="Badlein (E)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-bold text-brand-800 shadow-sm hover:bg-brand-50"><Pencil className="h-4 w-4" /> Badlein</button>
          <button type="button" onClick={() => setTab('security')} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><KeyRound className="h-4 w-4" /> Password</button>
          <button type="button" onClick={() => setConfirmLogout(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><LogOut className="h-4 w-4" /> Logout</button>
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
        </div>
      </div>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>–<Kbd>4</Kbd> se badlein</>}
        tabs={[
          { id: 'profile', label: 'Profile', icon: UserRound },
          { id: 'security', label: 'Hifazat', icon: Shield },
          { id: 'devices', label: 'Devices', icon: MonitorSmartphone },
          { id: 'preferences', label: 'Pasand', icon: Settings2 },
        ]} />

      {tab === 'profile' && <ProfileInfo user={user} tenantName={tenant?.name} focusKey={focusKey} />}
      {tab === 'security' && <AccountSecurity user={user} />}
      {tab === 'devices' && <ActiveSessions />}
      {tab === 'preferences' && <Preferences />}
    </PageShell>
  );
}

function ProfileGuide({ onClose }: { onClose: () => void }) {
  return (
    <PageGuide title="Meri profile — aasaan tareeqa" onClose={onClose}
      steps={[
        { icon: UserRound, color: '#2563eb', title: 'Naam aur phone', text: 'Profile tab me naam, phone aur tasveer badlein, phir "Save karein".' },
        { icon: KeyRound, color: '#7c3aed', title: 'Password', text: 'Hifazat tab se password badlein. Saath hi baqi devices se logout bhi ho sakta hai.' },
        { icon: Shield, color: '#16a34a', title: 'Email aur PIN', text: 'Email verify karein. Malik apna PIN yahin se laga ya badal sakta hai.' },
        { icon: MonitorSmartphone, color: '#d97706', title: 'Devices', text: 'Kahan kahan login hai, aur kis ne kab login ki koshish ki. Anjaan device ko logout karein.' },
        { icon: Settings2, color: '#0891b2', title: 'Pasand', text: 'Din ya raat ka theme, aur rang, print aur notifications ki settings.' },
      ]}
      tips={['Phone gum ho jaye to Devices tab se "Baqi sab se logout" karein aur password badal lein.']}
      shortcuts={[['1-4', 'tabs'], ['E', 'badlein'], ['G', 'guide']]}
    />
  );
}

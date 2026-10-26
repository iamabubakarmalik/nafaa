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
import { Avatar, Button, Kbd, Modal, PageHero, PageShell, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
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

      <PageHero
        title={(
          <span className="flex min-w-0 items-center gap-3">
            <Avatar name={user.fullName} url={user.avatarUrl} size={48} className="shrink-0 ring-2 ring-white/40" />
            <span className="truncate">{user.fullName}</span>
          </span>
        )}
        chip={<><role.icon />{role.label}</>}
        subtitle={(
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="inline-flex min-w-0 items-center gap-1"><Mail className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{user.email}</span>{user.emailVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-white" aria-label="Verified" />}</span>
            {tenant?.name && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" aria-hidden />{tenant.name}{user.assignedShop?.name ? ` · ${user.assignedShop.name}` : ''}</span>}
            <span>Kab se: {day(user.createdAt)}</span>
          </span>
        )}
        actions={(
          <>
            <button type="button" onClick={edit} title="Badlein (E)" className={heroPrimaryButton}><Pencil className="h-4 w-4" /> Badlein</button>
            <button type="button" onClick={() => setTab('security')} className={heroButton}><KeyRound className="h-4 w-4" /> Password</button>
            <button type="button" onClick={() => setConfirmLogout(true)} className={heroButton}><LogOut className="h-4 w-4" /> Logout</button>
            <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          </>
        )}
      />

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

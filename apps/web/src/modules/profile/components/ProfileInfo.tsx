/** Personal details form (name, phone, photo) and the account facts beside it. */

import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarDays, LogIn, Mail, Save, ShieldCheck, Store } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input } from '@/design-system/components';
import { AvatarUpload } from '@core/components/uploads';
import { useAuthStore, type AuthUser } from '@core/stores/auth.store';
import { normalizePakistanPhone, pakistanPhoneError } from '@core/lib/phone';
import { authApi } from '@modules/auth/api/auth.api';
import { ROLE, day } from './meta';

export function ProfileInfo({ user, tenantName, focusKey }: { user: AuthUser; tenantName?: string; focusKey: number }) {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);

  useEffect(() => {
    setFullName(user.fullName ?? '');
    setPhone(user.phone ?? '');
    setAvatarUrl(user.avatarUrl ?? null);
  }, [user.fullName, user.phone, user.avatarUrl]);

  useEffect(() => { if (focusKey) document.getElementById('profile-name')?.focus(); }, [focusKey]);

  const phoneError = phone.trim() ? pakistanPhoneError(phone) : null;
  const dirty = fullName.trim() !== (user.fullName ?? '') || phone.trim() !== (user.phone ?? '') || (avatarUrl ?? null) !== (user.avatarUrl ?? null);

  const save = useMutation({
    mutationFn: () => authApi.updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim() ? normalizePakistanPhone(phone.trim()) : '',
      avatarUrl: avatarUrl ?? '',
    }),
    onSuccess: (data) => {
      toast.success('Profile save ho gaya');
      const tenant = useAuthStore.getState().tenant;
      if (data && tenant) setUser({ ...user, ...data }, tenant);
      qc.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const submit = () => {
    if (!fullName.trim()) return toast.error('Naam zaroori hai');
    if (phoneError) return toast.error(phoneError);
    save.mutate();
  };

  const role = ROLE[user.role] ?? ROLE.STAFF;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card className="rounded-3xl" title="Aap ki tafseel" description="Ye naam bill, report aur team list me nazar aata hai"
        footer={<>
          {dirty && <Button variant="ghost" onClick={() => { setFullName(user.fullName ?? ''); setPhone(user.phone ?? ''); setAvatarUrl(user.avatarUrl ?? null); }}>Wapas</Button>}
          <Button onClick={submit} loading={save.isPending} disabled={!dirty}><Save className="h-4 w-4" /> Save karein</Button>
        </>}>
        <form className="flex flex-col gap-5 sm:flex-row" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="flex flex-col items-center gap-1.5">
            <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} purpose="avatar" size="md" fallbackText={fullName || user.email} />
            <span className="text-[0.6875rem] text-slate-500">Tasveer badlein</span>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Input id="profile-name" label="Poora naam" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmad Ali" maxLength={80} />
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567" inputMode="tel"
              error={phoneError ?? undefined} hint="Login aur khabar ke liye — kisi aur account par na ho" />
            <Input label="Email" value={user.email} disabled hint="Email badalne ke liye support se rabta karein" leftIcon={<Mail className="h-4 w-4" />} />
            <button type="submit" hidden />
          </div>
        </form>
      </Card>

      <Card className="rounded-3xl" title="Account">
        <dl className="space-y-3 text-[0.8125rem]">
          <Fact icon={ShieldCheck} label="Role"><Badge variant="brand"><role.icon className="h-3 w-3" />{role.label}</Badge></Fact>
          <Fact icon={Building2} label="Karobar">{tenantName ?? '—'}</Fact>
          <Fact icon={Store} label="Branch">{user.assignedShop?.name ?? 'Sab branches'}</Fact>
          <Fact icon={CalendarDays} label="Kab se">{day(user.createdAt)}</Fact>
          <Fact icon={LogIn} label="Aakhri login">{day(user.lastLoginAt)}</Fact>
        </dl>
      </Card>
    </div>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" />{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

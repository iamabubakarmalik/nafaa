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
import { t } from '@core/i18n';

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
      toast.success(t('Profile save ho gaya'));
      const tenant = useAuthStore.getState().tenant;
      if (data && tenant) setUser({ ...user, ...data }, tenant);
      qc.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || t('Save nahi hua')),
  });

  const submit = () => {
    if (!fullName.trim()) return toast.error(t('Naam zaroori hai'));
    if (phoneError) return toast.error(phoneError);
    save.mutate();
  };

  const role = ROLE[user.role] ?? ROLE.STAFF;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card className="rounded-3xl" title={t('Aap ki details')} description={t('Ye naam bill, report aur team list me nazar aata hai')}
        footer={<>
          {dirty && <Button variant="ghost" onClick={() => { setFullName(user.fullName ?? ''); setPhone(user.phone ?? ''); setAvatarUrl(user.avatarUrl ?? null); }}>{t('Wapas')}</Button>}
          <Button onClick={submit} loading={save.isPending} disabled={!dirty}><Save className="h-4 w-4" /> {' '}{t('Save karein')}</Button>
        </>}>
        <form className="flex flex-col gap-5 sm:flex-row" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="flex flex-col items-center gap-1.5">
            <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} purpose="avatar" size="md" fallbackText={fullName || user.email} />
            <span className="text-[0.6875rem] text-slate-500">{t('Tasveer badlein')}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Input id="profile-name" label={t('Poora naam')} required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('Ahmad Ali')} maxLength={80} />
            <Input label={t('Phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567" inputMode="tel"
              error={phoneError ?? undefined} hint={t('Login aur khabar ke liye — kisi aur account par na ho')} />
            <Input label={t('Email')} value={user.email} disabled hint={t('Email badalne ke liye support se rabta karein')} leftIcon={<Mail className="h-4 w-4" />} />
            <button type="submit" hidden />
          </div>
        </form>
      </Card>

      <Card className="rounded-3xl" title={t('Account')}>
        <dl className="space-y-3 text-[0.8125rem]">
          <Fact icon={ShieldCheck} label={t('Role')}><Badge variant="brand"><role.icon className="h-3 w-3" />{role.label}</Badge></Fact>
          <Fact icon={Building2} label={t('Karobar')}>{tenantName ?? '—'}</Fact>
          <Fact icon={Store} label={t('Branch')}>{user.assignedShop?.name ?? t('Sab branches')}</Fact>
          <Fact icon={CalendarDays} label={t('Kab se')}>{day(user.createdAt)}</Fact>
          <Fact icon={LogIn} label={t('Aakhri login')}>{day(user.lastLoginAt)}</Fact>
        </dl>
      </Card>
    </div>
  );
}

function Fact({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" />{label}</dt>
      <dd className="text-end font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

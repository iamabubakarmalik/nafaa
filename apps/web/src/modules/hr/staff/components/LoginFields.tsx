/**
 * Fields for a new login: email, a temporary password, role, branch and the
 * permission boxes. Picking a role fills the boxes with that role's preset,
 * visibly; the owner can then tick or untick any box.
 */

import { useState } from 'react';
import { ChevronDown, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Input, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { Shop } from '@modules/organization/shops/api/shops.api';
import { PermissionPicker, useRoleDefaults } from './PermissionPicker';
import { ASSIGNABLE, ROLES, makePassword, type AssignableRole } from './meta';

export interface LoginDraft {
  email: string;
  password: string;
  role: AssignableRole;
  shopId: string;
  permissions: string[];
  sendEmail: boolean;
}

export const newLoginDraft = (defaults: Record<string, string[]>, shopId = ''): LoginDraft => ({
  email: '', password: makePassword(), role: 'CASHIER', shopId, permissions: [...(defaults.CASHIER ?? [])], sendEmail: false,
});

/** First problem with the login part, or null. */
export function loginProblem(d: LoginDraft) {
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return 'Login ke liye sahi email likhein';
  if (d.password.length < 8) return 'Password kam az kam 8 harf ka ho';
  if ((d.role === 'MANAGER' || d.role === 'CASHIER') && !d.shopId) return `${ROLES[d.role].label} ke liye branch chunein`;
  return null;
}

export function LoginFields({ value, onChange, shops }: { value: LoginDraft; onChange: (d: LoginDraft) => void; shops: Shop[] }) {
  const defaults = useRoleDefaults();
  const [show, setShow] = useState(true);
  const [perms, setPerms] = useState(false);
  const set = <K extends keyof LoginDraft>(k: K, v: LoginDraft[K]) => onChange({ ...value, [k]: v });
  const needsShop = value.role === 'MANAGER' || value.role === 'CASHIER';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Login email" required type="email" autoComplete="off" value={value.email} onChange={(e) => set('email', e.target.value)} placeholder="bilal@meridukaan.pk"
          hint="Isi se login karega. Har bande ka apna email — doosre ka nahi chalega." />
        <Input label="Pehla password" required value={value.password} type={show ? 'text' : 'password'} autoComplete="new-password" onChange={(e) => set('password', e.target.value)}
          hint="Kam az kam 8 harf. Save ke baad parchi milegi; banda baad me khud badal le."
          rightIcon={
            <span className="pointer-events-auto flex items-center gap-1">
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Chhupayein' : 'Dikhayein'} className="rounded p-0.5 hover:text-slate-700">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              <button type="button" onClick={() => set('password', makePassword())} aria-label="Naya password" title="Naya password" className="rounded p-0.5 hover:text-slate-700"><RefreshCw className="h-4 w-4" /></button>
            </span>
          } className="pr-16 font-mono" />
      </div>

      <div>
        <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Role <span className="text-rose-500">*</span></p>
        <div role="radiogroup" aria-label="Role" className="grid gap-2 sm:grid-cols-3">
          {ASSIGNABLE.map((r) => {
            const m = ROLES[r];
            const on = value.role === r;
            return (
              <button key={r} type="button" role="radio" aria-checked={on}
                onClick={() => onChange({ ...value, role: r, permissions: [...(defaults[r] ?? [])] })}
                className={cn('flex items-start gap-2.5 rounded-xl p-3 text-left ring-1 transition', on ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}17`, color: m.color }}><m.icon className="h-4 w-4" /></span>
                <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900">{m.label}</span><span className="block text-[0.6875rem] text-slate-500">{m.hint}</span></span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-slate-500">Role chunne se neeche ki permission us role ki ho jati hain. Phir jo chahein badal lein.</p>
      </div>

      {shops.length > 0 && (
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Branch {needsShop && <span className="text-rose-500">*</span>}</p>
          <div className="flex flex-wrap gap-1.5">
            {!needsShop && (
              <button type="button" onClick={() => set('shopId', '')} aria-pressed={!value.shopId}
                className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition', !value.shopId ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>Sab branches</button>
            )}
            {shops.map((s) => (
              <button key={s.id} type="button" onClick={() => set('shopId', s.id)} aria-pressed={value.shopId === s.id}
                className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition', value.shopId === s.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {s.name}{s.isMain && <span className="ml-1 text-[0.6875rem] font-medium opacity-70">Main</span>}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{value.shopId ? 'Sirf isi branch ka data dekhega aur isi me sale karega.' : needsShop ? `${ROLES[value.role].label} ko ek branch deni zaroori hai.` : 'Branch na di to har branch ka data dekh sakega (jitni permission hai).'}</p>
        </div>
      )}

      <div className="rounded-xl ring-1 ring-slate-200">
        <button type="button" onClick={() => setPerms((p) => !p)} aria-expanded={perms} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
          <span><span className="block text-sm font-semibold text-slate-900">Permissions ({value.permissions.length})</span><span className="block text-[0.6875rem] text-slate-500">Kya kya kar sakega — kholein aur dekhein</span></span>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition', perms && 'rotate-180')} />
        </button>
        {perms && <div className="border-t border-slate-100 p-3"><PermissionPicker value={value.permissions} onChange={(p) => set('permissions', p)} role={value.role} /></div>}
      </div>

      <Switch checked={value.sendEmail} onChange={(e) => set('sendEmail', e.target.checked)} label="Email par bhi bhejein"
        description="Login aur password bande ke email par chala jayega. Na bhejein to parchi chhap kar ya WhatsApp se dein." />
    </div>
  );
}
